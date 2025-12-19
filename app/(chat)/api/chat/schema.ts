import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

/**
 * Agent 模式枚举
 * - default: 默认单 Agent 模式
 * - legal: 法律多 Agent 模式
 */
export const AgentMode = {
  DEFAULT: "default",
  LEGAL: "legal",
} as const;

export type AgentMode = (typeof AgentMode)[keyof typeof AgentMode];

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedVisibilityType: z.enum(["public", "private"]),
  /** Agent 模式：default-默认单 Agent，legal-法律多 Agent */
  agentMode: z.enum(["default", "legal"]).default("default").optional(),
  /** 是否启用 Web 搜索 */
  webSearchEnabled: z.boolean().default(true).optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
