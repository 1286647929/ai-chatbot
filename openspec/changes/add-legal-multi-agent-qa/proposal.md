# Change: 多 Agent 法律智能问答系统

## Why

当前系统是单一 Agent 模式，无法满足法律领域专业化问答需求。法律咨询涉及多个子领域（法规检索、案例分析、文书起草等），需要专业化的 Agent 分工协作，同时需要支持实时网络搜索获取最新法律信息。

## What Changes

### 核心能力
- **意图识别系统**: 使用轻量模型识别用户问题类型，路由到专业 Agent
- **多 Agent 架构**: Router Agent + 4 个专业 Agent（法律研究、案例分析、法律顾问、文书起草）
- **Web Search 集成**: 支持实时搜索法律新闻、法规、案例
- **MCP 协议支持**: 集成外部法律知识服务

### 新增工具
- `webSearch` - 通用网络搜索
- `regulationSearch` - 法规条文检索
- `caseSearch` - 案例检索

### UI 扩展
- Agent 状态指示器（显示当前工作的 Agent）
- 法律引用卡片组件（展示法规、案例引用）

## Impact

- **Affected specs**:
  - `legal-multi-agent-qa` (新增)
  - `websearch-tool` (新增)
  - `mcp-tools` (新增)
  - `citations-ui` (新增)

- **Affected code**:
  - `lib/ai/providers.ts` - 添加意图识别模型配置
  - `lib/ai/` - 新增 agents/, intent/, router/ 目录
  - `lib/ai/tools/` - 新增 legal/ 子目录
  - `app/(chat)/api/chat/route.ts` - 集成多 Agent 路由逻辑
  - `components/` - 新增 Agent 状态和引用 UI 组件

## Dependencies

- 需要配置搜索 API (SerpAPI/Bing Search API)
- 可选：法律数据源 API（北大法宝、裁判文书网等）

## Risks

1. **延迟增加**: 多 Agent 调用会增加响应时间，需流式展示中间状态
2. **成本增加**: 多次 LLM 调用增加 token 消耗
3. **数据合规**: 法律数据源使用需注意合规性和授权
4. **准确性**: 法律建议需要明确免责声明
