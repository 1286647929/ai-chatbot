import { experimental_createMCPClient as createMCPClient } from "ai";

/**
 * MCP 服务器配置
 */
export interface MCPServerConfig {
  /** 服务器名称 */
  name: string;
  /** 服务器 URL（HTTP/SSE 传输） */
  url?: string;
  /** 传输类型 */
  transport: "http" | "sse" | "stdio";
  /** 认证 token（可选） */
  authToken?: string;
  /** stdio 命令（仅 stdio 传输） */
  command?: string;
  /** stdio 参数（仅 stdio 传输） */
  args?: string[];
}

/**
 * MCP 客户端实例缓存
 */
const clientCache = new Map<string, Awaited<ReturnType<typeof createMCPClient>>>();

/**
 * 创建 MCP 客户端
 * 根据配置的传输方式创建对应的 MCP 客户端
 */
export async function createMcpClient(config: MCPServerConfig) {
  // 检查缓存
  const cacheKey = `${config.name}-${config.transport}-${config.url || config.command}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  let client: Awaited<ReturnType<typeof createMCPClient>>;

  switch (config.transport) {
    case "http": {
      if (!config.url) {
        throw new Error("HTTP transport requires a URL");
      }
      // 动态导入 HTTP 传输
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );

      const httpTransport = new StreamableHTTPClientTransport(
        new URL(config.url),
        config.authToken
          ? {
              requestInit: {
                headers: {
                  Authorization: `Bearer ${config.authToken}`,
                },
              },
            }
          : undefined
      );

      client = await createMCPClient({
        transport: httpTransport,
        name: config.name,
      });
      break;
    }

    case "sse": {
      if (!config.url) {
        throw new Error("SSE transport requires a URL");
      }
      client = await createMCPClient({
        name: config.name,
        transport: {
          type: "sse",
          url: config.url,
          ...(config.authToken && {
            headers: {
              Authorization: `Bearer ${config.authToken}`,
            },
          }),
        },
      });
      break;
    }

    case "stdio": {
      if (!config.command) {
        throw new Error("Stdio transport requires a command");
      }
      // 动态导入 stdio 传输（仅在 Node.js 环境可用）
      const { Experimental_StdioMCPTransport } = await import("ai/mcp-stdio");
      const stdioTransport = new Experimental_StdioMCPTransport({
        command: config.command,
        args: config.args || [],
      });

      client = await createMCPClient({
        transport: stdioTransport,
        name: config.name,
      });
      break;
    }

    default:
      throw new Error(`Unsupported transport type: ${config.transport}`);
  }

  // 缓存客户端
  clientCache.set(cacheKey, client);
  return client;
}

/**
 * 从 MCP 服务器获取工具
 */
export async function getMcpTools(config: MCPServerConfig) {
  try {
    const client = await createMcpClient(config);
    const tools = await client.tools();
    console.log(`[MCP] Loaded ${Object.keys(tools).length} tools from ${config.name}`);
    return tools;
  } catch (error) {
    console.error(`[MCP] Failed to get tools from ${config.name}:`, error);
    return {};
  }
}

/**
 * 关闭 MCP 客户端
 */
export async function closeMcpClient(config: MCPServerConfig) {
  const cacheKey = `${config.name}-${config.transport}-${config.url || config.command}`;
  const client = clientCache.get(cacheKey);
  if (client) {
    try {
      await client.close();
    } catch (error) {
      console.warn(`[MCP] Error closing client ${config.name}:`, error);
    }
    clientCache.delete(cacheKey);
  }
}

/**
 * 关闭所有 MCP 客户端
 */
export async function closeAllMcpClients() {
  const closePromises: Promise<void>[] = [];
  for (const [key, client] of clientCache.entries()) {
    closePromises.push(
      client.close().catch((error) => {
        console.warn(`[MCP] Error closing client ${key}:`, error);
      })
    );
  }
  await Promise.all(closePromises);
  clientCache.clear();
}

/**
 * 从环境变量获取 MCP 服务器配置
 * 支持多个 MCP 服务器配置
 *
 * 环境变量格式：
 * - MCP_SERVER_<NAME>_URL: 服务器 URL
 * - MCP_SERVER_<NAME>_TRANSPORT: 传输类型（http/sse/stdio）
 * - MCP_SERVER_<NAME>_TOKEN: 认证 token（可选）
 * - MCP_SERVER_<NAME>_COMMAND: stdio 命令（stdio 传输）
 * - MCP_SERVER_<NAME>_ARGS: stdio 参数，逗号分隔（stdio 传输）
 */
export function getMcpServersFromEnv(): MCPServerConfig[] {
  const servers: MCPServerConfig[] = [];

  // 查找所有以 MCP_SERVER_ 开头的环境变量
  const envKeys = Object.keys(process.env).filter((key) =>
    key.startsWith("MCP_SERVER_")
  );

  // 提取服务器名称
  const serverNames = new Set<string>();
  for (const key of envKeys) {
    const match = key.match(/^MCP_SERVER_([^_]+)_/);
    if (match) {
      serverNames.add(match[1]);
    }
  }

  // 为每个服务器构建配置
  for (const name of serverNames) {
    const prefix = `MCP_SERVER_${name}_`;
    const transport = (process.env[`${prefix}TRANSPORT`] || "http") as
      | "http"
      | "sse"
      | "stdio";
    const url = process.env[`${prefix}URL`];
    const authToken = process.env[`${prefix}TOKEN`];
    const command = process.env[`${prefix}COMMAND`];
    const argsStr = process.env[`${prefix}ARGS`];
    const args = argsStr ? argsStr.split(",").map((s) => s.trim()) : undefined;

    if (transport === "stdio" && !command) {
      console.warn(`[MCP] Skipping ${name}: stdio transport requires COMMAND`);
      continue;
    }

    if ((transport === "http" || transport === "sse") && !url) {
      console.warn(`[MCP] Skipping ${name}: ${transport} transport requires URL`);
      continue;
    }

    servers.push({
      name: name.toLowerCase(),
      transport,
      url,
      authToken,
      command,
      args,
    });
  }

  return servers;
}

/**
 * 获取所有配置的 MCP 工具
 * 合并多个 MCP 服务器的工具
 */
export async function getAllMcpTools() {
  const servers = getMcpServersFromEnv();
  if (servers.length === 0) {
    return {};
  }

  const allTools: Record<string, unknown> = {};

  for (const server of servers) {
    try {
      const tools = await getMcpTools(server);
      // 为工具添加服务器前缀以避免冲突
      for (const [toolName, tool] of Object.entries(tools)) {
        const prefixedName = servers.length > 1 ? `${server.name}_${toolName}` : toolName;
        allTools[prefixedName] = tool;
      }
    } catch (error) {
      console.error(`[MCP] Failed to load tools from ${server.name}:`, error);
    }
  }

  return allTools;
}
