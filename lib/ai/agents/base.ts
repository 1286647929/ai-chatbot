import {
  type CoreMessage,
  generateText,
  type LanguageModel,
  streamText,
  type Tool,
} from "ai";
import {
  type AgentConfig,
  type AgentInput,
  type AgentResult,
  AgentStatus,
  type LegalAgent,
  type ToolCallRecord,
} from "./types";

/**
 * 基础 Agent 实现
 * 封装通用的 Agent 逻辑，各专业 Agent 继承此类
 */
export class BaseAgent implements LegalAgent {
  config: AgentConfig;
  protected model: LanguageModel;

  constructor(config: AgentConfig, model: LanguageModel) {
    this.config = config;
    this.model = model;
  }

  /**
   * 构建消息数组
   */
  protected buildMessages(input: AgentInput): CoreMessage[] {
    const messages: CoreMessage[] = [];

    // 添加历史消息
    if (input.context.messages && input.context.messages.length > 0) {
      messages.push(...input.context.messages);
    }

    // 添加当前用户消息
    messages.push({
      role: "user",
      content: this.buildUserPrompt(input),
    });

    return messages;
  }

  /**
   * 构建用户 prompt
   */
  protected buildUserPrompt(input: AgentInput): string {
    let prompt = input.context.userMessage;

    // 添加前置 Agent 结果
    if (
      input.context.previousResults &&
      input.context.previousResults.length > 0
    ) {
      const previousContext = input.context.previousResults
        .map((result) => `【${result.agentName} 分析结果】\n${result.content}`)
        .join("\n\n");

      prompt = `${previousContext}\n\n【用户问题】\n${prompt}`;
    }

    // 添加额外 prompt
    if (input.additionalPrompt) {
      prompt = `${prompt}\n\n${input.additionalPrompt}`;
    }

    return prompt;
  }

  /**
   * 非流式执行
   */
  async generate(input: AgentInput): Promise<AgentResult> {
    const startTime = Date.now();
    const toolCalls: ToolCallRecord[] = [];

    try {
      const result = await generateText({
        model: this.model,
        system: this.config.systemPrompt,
        messages: this.buildMessages(input),
        tools: this.config.tools,
        maxOutputTokens: this.config.maxTokens,
        onStepFinish: (step) => {
          // 记录工具调用
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const tc of step.toolCalls) {
              toolCalls.push({
                tool: tc.toolName,
                input: tc.input,
                output: step.toolResults?.find(
                  (tr) => tr.toolCallId === tc.toolCallId
                )?.output,
                duration: 0, // 无法获取单个工具执行时间
              });
            }
          }
        },
        abortSignal: AbortSignal.timeout(this.config.maxDuration || 30_000),
      });

      return {
        agentName: this.config.type,
        content: result.text,
        status: AgentStatus.COMPLETED,
        toolCalls,
        tokens: {
          input: result.usage.inputTokens ?? 0,
          output: result.usage.outputTokens ?? 0,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isTimeout =
        errorMessage.includes("timeout") || errorMessage.includes("abort");

      return {
        agentName: this.config.type,
        content: "",
        status: isTimeout ? AgentStatus.TIMEOUT : AgentStatus.ERROR,
        toolCalls,
        duration: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 流式执行
   * 返回 streamText 的完整结果，供调用方使用 toUIMessageStream() 合并到 dataStream
   */
  async stream(input: AgentInput): Promise<{
    streamResult: {
      consumeStream(): void;
      toUIMessageStream(options?: { sendReasoning?: boolean }): ReadableStream;
    };
    result: Promise<AgentResult>;
  }> {
    const startTime = Date.now();
    const toolCalls: ToolCallRecord[] = [];

    const streamResult = streamText({
      model: this.model,
      system: this.config.systemPrompt,
      messages: this.buildMessages(input),
      tools: this.config.tools,
      maxOutputTokens: this.config.maxTokens,
      onStepFinish: (step) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            toolCalls.push({
              tool: tc.toolName,
              input: tc.input,
              output: step.toolResults?.find(
                (tr) => tr.toolCallId === tc.toolCallId
              )?.output,
              duration: 0,
            });
          }
        }
      },
      abortSignal: AbortSignal.timeout(this.config.maxDuration || 30_000),
    });

    // 创建结果 Promise
    const resultPromise = (async (): Promise<AgentResult> => {
      try {
        const finalResult = await streamResult;
        const usage = await finalResult.usage;

        return {
          agentName: this.config.type,
          content: await finalResult.text,
          status: AgentStatus.COMPLETED,
          toolCalls,
          tokens: {
            input: usage.inputTokens ?? 0,
            output: usage.outputTokens ?? 0,
          },
          duration: Date.now() - startTime,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isTimeout =
          errorMessage.includes("timeout") || errorMessage.includes("abort");

        return {
          agentName: this.config.type,
          content: "",
          status: isTimeout ? AgentStatus.TIMEOUT : AgentStatus.ERROR,
          toolCalls,
          duration: Date.now() - startTime,
          error: errorMessage,
        };
      }
    })();

    return {
      streamResult,
      result: resultPromise,
    };
  }
}

/**
 * 创建带有工具的 Agent
 */
export function createAgentWithTools(
  config: AgentConfig,
  model: LanguageModel,
  tools?: Record<string, Tool>
): BaseAgent {
  const configWithTools = {
    ...config,
    tools: tools || config.tools,
  };
  return new BaseAgent(configWithTools, model);
}
