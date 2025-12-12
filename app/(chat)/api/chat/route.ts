import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  type CoreMessage,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { Session } from "next-auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { type AgentContext } from "@/lib/ai/agents/types";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { orchestrateStream } from "@/lib/ai/orchestrator";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { shouldUseMultiAgentMode } from "@/lib/ai/router";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import {
  AgentMode,
  type PostRequestBody,
  postRequestBodySchema,
} from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      agentMode = AgentMode.DEFAULT,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      agentMode?: (typeof AgentMode)[keyof typeof AgentMode];
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      // New chat - no need to fetch messages, it's empty
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    // 判断是否使用法律多 Agent 模式
    const useLegalMultiAgent =
      agentMode === AgentMode.LEGAL && shouldUseMultiAgentMode();

    // 提取用户消息文本
    const userMessageText = message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        if (useLegalMultiAgent) {
          // 法律多 Agent 模式
          await executeLegalMultiAgentStream({
            chatId: id,
            userId: session.user.id,
            userMessage: userMessageText,
            messages: convertToModelMessages(uiMessages),
            dataStream,
            onUsage: (usage) => {
              finalMergedUsage = usage;
            },
          });
        } else {
          // 默认单 Agent 模式
          executeDefaultStream({
            selectedChatModel,
            requestHints,
            uiMessages,
            session,
            dataStream,
            onUsage: async (usage) => {
              try {
                const providers = await getTokenlensCatalog();
                const modelId =
                  myProvider.languageModel(selectedChatModel).modelId;
                if (!modelId || !providers) {
                  finalMergedUsage = usage;
                  dataStream.write({
                    type: "data-usage",
                    data: finalMergedUsage,
                  });
                  return;
                }

                const summary = getUsage({ modelId, usage, providers });
                finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
                dataStream.write({ type: "data-usage", data: finalMergedUsage });
              } catch (err) {
                console.warn("TokenLens enrichment failed", err);
                finalMergedUsage = usage;
                dataStream.write({ type: "data-usage", data: finalMergedUsage });
              }
            },
          });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}

// ============================================================================
// 辅助函数
// ============================================================================

interface DefaultStreamParams {
  selectedChatModel: ChatModel["id"];
  requestHints: RequestHints;
  uiMessages: ChatMessage[];
  session: Session;
  dataStream: UIMessageStreamWriter;
  onUsage: (usage: AppUsage) => void;
}

/**
 * 执行默认单 Agent 流式处理
 */
function executeDefaultStream({
  selectedChatModel,
  requestHints,
  uiMessages,
  session,
  dataStream,
  onUsage,
}: DefaultStreamParams) {
  const startTime = Date.now();
  let firstChunkLogged = false;

  console.log("[DefaultStream] 开始执行", {
    timestamp: new Date().toISOString(),
    model: selectedChatModel,
    messageCount: uiMessages.length,
  });

  const result = streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: systemPrompt({ selectedChatModel, requestHints }),
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(5),
    experimental_activeTools:
      selectedChatModel === "chat-model-reasoning"
        ? []
        : [
            "getWeather",
            "createDocument",
            "updateDocument",
            "requestSuggestions",
          ],
    experimental_transform: smoothStream({ chunking: "word" }),
    tools: {
      getWeather,
      createDocument: createDocument({ session, dataStream }),
      updateDocument: updateDocument({ session, dataStream }),
      requestSuggestions: requestSuggestions({
        session,
        dataStream,
      }),
    },
    experimental_telemetry: {
      isEnabled: isProductionEnvironment,
      functionId: "stream-text",
    },
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta" && !firstChunkLogged) {
        firstChunkLogged = true;
        console.log("[DefaultStream] 收到第一个 text-delta", {
          耗时: `${Date.now() - startTime}ms`,
        });
      }
    },
    onFinish: async ({ usage }) => {
      console.log("[DefaultStream] 流式响应完成", {
        总耗时: `${Date.now() - startTime}ms`,
      });
      onUsage(usage as AppUsage);
    },
  });

  console.log("[DefaultStream] streamText 已调用，开始消费流...");

  result.consumeStream();

  dataStream.merge(
    result.toUIMessageStream({
      sendReasoning: true,
    })
  );

  console.log("[DefaultStream] 流已合并到 dataStream");
}

interface LegalMultiAgentStreamParams {
  chatId: string;
  userId: string;
  userMessage: string;
  messages: CoreMessage[];
  dataStream: UIMessageStreamWriter;
  onUsage: (usage: AppUsage) => void;
}

/**
 * 执行法律多 Agent 流式处理
 */
async function executeLegalMultiAgentStream({
  chatId,
  userId,
  userMessage,
  messages,
  dataStream,
  onUsage,
}: LegalMultiAgentStreamParams) {
  // 构建 Agent 上下文
  const agentContext: AgentContext = {
    chatId,
    userId,
    userMessage,
    messages,
  };

  // 使用编排器执行多 Agent 流式处理
  // 注：当意图为通用对话时，orchestrateStream 会自动使用默认聊天模型
  const result = await orchestrateStream(agentContext, dataStream);

  // 计算总 token 使用量
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const agentResult of result.agentResults) {
    if (agentResult.tokens) {
      totalInputTokens += agentResult.tokens.input;
      totalOutputTokens += agentResult.tokens.output;
    }
  }

  // 回调使用量统计
  onUsage({
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
  } as AppUsage);
}
