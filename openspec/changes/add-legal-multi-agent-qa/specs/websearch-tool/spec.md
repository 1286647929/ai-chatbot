## ADDED Requirements

### Requirement: Web Search Tool
系统 SHALL 提供通用网络搜索工具，支持获取实时互联网信息。

#### Scenario: Execute general search
- **WHEN** Agent 调用 webSearch 工具
- **AND** 提供搜索查询和类型参数
- **THEN** 系统 SHALL 调用配置的搜索 API (SerpAPI/Bing)
- **AND** 返回结构化搜索结果

#### Scenario: Search result structure
- **WHEN** 搜索完成
- **THEN** 结果 SHALL 包含:
  - `results`: 搜索结果数组
  - 每个结果包含 `title`、`url`、`snippet`
  - `totalResults`: 总结果数
  - `searchTime`: 搜索耗时

#### Scenario: Search type filtering
- **WHEN** 指定搜索类型为 `news`
- **THEN** 优先返回新闻类结果
- **WHEN** 指定搜索类型为 `regulation`
- **THEN** 添加法律法规相关站点过滤
- **WHEN** 指定搜索类型为 `case`
- **THEN** 添加裁判文书相关站点过滤

#### Scenario: Search error handling
- **WHEN** 搜索 API 返回错误或超时
- **THEN** 系统 SHALL 返回友好的错误信息
- **AND** 不中断整体对话流程

### Requirement: Regulation Search Tool
系统 SHALL 提供专门的法规条文检索工具。

#### Scenario: Search by law name
- **WHEN** Agent 调用 regulationSearch
- **AND** 提供法律名称关键词
- **THEN** 系统 SHALL 返回匹配的法律法规列表

#### Scenario: Search by article number
- **WHEN** 搜索包含条款号（如"第X条"）
- **THEN** 系统 SHALL 定位到具体条款
- **AND** 返回条款全文

#### Scenario: Regulation result format
- **WHEN** 返回法规搜索结果
- **THEN** 每条结果 SHALL 包含:
  - `lawName`: 法律名称
  - `articleNumber`: 条款号（如有）
  - `content`: 条款内容
  - `effectiveDate`: 生效日期
  - `source`: 数据来源

#### Scenario: Cross-reference support
- **WHEN** 法条内容引用其他法条
- **THEN** MAY 提供引用法条的简要信息

### Requirement: Case Search Tool
系统 SHALL 提供案例检索工具，支持查找相关司法案例。

#### Scenario: Search by keyword
- **WHEN** Agent 调用 caseSearch
- **AND** 提供案例关键词
- **THEN** 系统 SHALL 返回相关案例列表

#### Scenario: Search by case type
- **WHEN** 指定案例类型（民事、刑事、行政等）
- **THEN** 系统 SHALL 过滤返回对应类型的案例

#### Scenario: Case result format
- **WHEN** 返回案例搜索结果
- **THEN** 每条结果 SHALL 包含:
  - `caseNumber`: 案号
  - `caseName`: 案件名称
  - `court`: 审理法院
  - `date`: 判决日期
  - `caseType`: 案件类型
  - `summary`: 案情摘要
  - `verdict`: 判决要点
  - `url`: 文书链接（如有）

#### Scenario: Case details retrieval
- **WHEN** 需要获取案例详情
- **THEN** 系统 MAY 提供获取完整裁判文书的能力

### Requirement: Search Rate Limiting
系统 SHALL 实现搜索请求的速率限制。

#### Scenario: Rate limit per user
- **WHEN** 单用户搜索请求超过限制（如 10次/分钟）
- **THEN** 系统 SHALL 返回速率限制错误
- **AND** 提示用户稍后重试

#### Scenario: Global rate limit
- **WHEN** 全局搜索请求接近 API 配额
- **THEN** 系统 SHALL 启用请求队列
- **AND** MAY 降级到缓存结果

### Requirement: Search Result Caching
系统 SHALL 实现搜索结果缓存以提高性能和降低成本。

#### Scenario: Cache hit
- **WHEN** 相同查询在缓存有效期内再次请求
- **THEN** 系统 SHALL 返回缓存结果
- **AND** 标记结果来自缓存

#### Scenario: Cache expiration
- **WHEN** 缓存条目超过有效期
- **THEN** 系统 SHALL 重新执行搜索
- **AND** 更新缓存

#### Scenario: Cache configuration
- **WHEN** 配置缓存策略
- **THEN** 系统 SHALL 支持:
  - 新闻类搜索：短期缓存（如 1 小时）
  - 法规类搜索：长期缓存（如 24 小时）
  - 案例类搜索：中期缓存（如 6 小时）

### Requirement: Search Provider Selection
系统 SHALL 支持多个搜索提供商并实现自动故障切换。

#### Scenario: Native model search priority
- **WHEN** 当前模型支持原生网页搜索（如 OpenAI web_search）
- **THEN** 系统 SHALL 优先使用原生搜索能力
- **AND** 无需额外 API 调用

#### Scenario: Perplexity search integration
- **WHEN** 配置了 `PERPLEXITY_API_KEY`
- **THEN** 系统 SHALL 支持 Perplexity 搜索
- **AND** 返回带引用来源的搜索结果

#### Scenario: Exa search integration
- **WHEN** 配置了 `EXA_API_KEY`
- **THEN** 系统 SHALL 支持 Exa 搜索
- **AND** 支持网页内容抓取和摘要

#### Scenario: Tavily search integration
- **WHEN** 配置了 `TAVILY_API_KEY`
- **THEN** 系统 SHALL 支持 Tavily 搜索作为备选

#### Scenario: Provider priority configuration
- **WHEN** 配置搜索提供商
- **THEN** 系统 SHALL 支持通过环境变量配置优先级:
  - `SEARCH_PROVIDER_PRIORITY`: 逗号分隔的提供商列表
  - 默认顺序: native, perplexity, exa, tavily

#### Scenario: Automatic failover
- **WHEN** 当前搜索提供商失败
- **THEN** 系统 SHALL 自动尝试下一个提供商
- **AND** 记录失败日志
- **AND** 对用户透明

### Requirement: Search Query Normalization
系统 SHALL 对搜索查询进行归一化处理。

#### Scenario: Normalize query for caching
- **WHEN** 执行搜索前
- **THEN** 系统 SHALL 对查询进行归一化:
  - 转换为小写
  - 移除多余空格
  - 对词语排序（可选）

#### Scenario: Query enhancement
- **WHEN** 执行法律相关搜索
- **THEN** 系统 MAY 自动添加领域关键词
- **AND** 提高搜索结果相关性

### Requirement: Search Environment Configuration
系统 SHALL 通过环境变量配置搜索功能。

#### Scenario: Required environment variables
- **WHEN** 使用搜索功能
- **THEN** 系统 SHALL 检查以下环境变量:
  - `PERPLEXITY_API_KEY`: Perplexity API 密钥（可选）
  - `EXA_API_KEY`: Exa API 密钥（可选）
  - `TAVILY_API_KEY`: Tavily API 密钥（可选）
  - `SEARCH_CACHE_TTL`: 默认缓存时间（秒）
  - `SEARCH_RATE_LIMIT`: 每分钟最大请求数

#### Scenario: Graceful degradation without API keys
- **WHEN** 未配置任何搜索 API 密钥
- **AND** 模型不支持原生搜索
- **THEN** 系统 SHALL 禁用搜索工具
- **AND** Agent 向用户说明搜索不可用
