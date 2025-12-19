/**
 * Agent 追踪查询 API
 * 用于管理后台查看 Agent 执行追踪
 */

import { auth } from "@/app/(auth)/auth";
import { traceStore } from "@/lib/ai/tracing";
import { ChatSDKError } from "@/lib/errors";
import type { AgentType } from "@/lib/ai/agents/types";

/**
 * GET /api/admin/traces
 * 查询追踪列表
 *
 * Query params:
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20）
 * - chatId: 按会话 ID 过滤
 * - agentType: 按 Agent 类型过滤
 * - startDate: 开始时间（ISO 格式）
 * - endDate: 结束时间（ISO 格式）
 */
export async function GET(request: Request) {
  // 验证登录状态
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // TODO: 添加管理员权限检查

  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10);
    const chatId = searchParams.get("chatId");
    const agentType = searchParams.get("agentType") as AgentType | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 根据不同条件查询
    if (chatId) {
      const traces = traceStore.getByChatId(chatId);
      return Response.json({
        success: true,
        data: traces,
        total: traces.length,
      });
    }

    if (agentType) {
      const traces = traceStore.getByAgentType(agentType);
      return Response.json({
        success: true,
        data: traces,
        total: traces.length,
      });
    }

    if (startDate && endDate) {
      const traces = traceStore.getByTimeRange(
        new Date(startDate),
        new Date(endDate)
      );
      return Response.json({
        success: true,
        data: traces,
        total: traces.length,
      });
    }

    // 默认分页查询
    const result = traceStore.getAll(page, pageSize);
    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Traces API] Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/traces/stats
 * 获取追踪统计信息
 */
export async function getStats() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const stats = traceStore.getStats();
    return Response.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[Traces API] Stats error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
