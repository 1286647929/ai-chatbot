## ADDED Requirements

### Requirement: Word Document Generation
系统 SHALL 支持生成结构化的法律文书（Word 格式）。

#### Scenario: Generate document from template
- **WHEN** Agent 调用 generateDocument 工具
- **AND** 提供模板 ID 和填充数据
- **THEN** 系统 SHALL 加载对应的 Word 模板
- **AND** 使用提供的数据填充模板占位符
- **AND** 生成完整的 .docx 文件

#### Scenario: Upload and return download link
- **WHEN** 文档生成完成
- **THEN** 系统 SHALL 将文档上传到 Blob 存储
- **AND** 返回包含下载链接的结果对象
- **AND** 链接有效期至少 24 小时

#### Scenario: Supported template types
- **WHEN** 调用文书生成
- **THEN** 系统 SHALL 支持以下模板类型:
  - `contract` - 合同类（租赁、劳动、服务等）
  - `complaint` - 起诉状类（民事、行政等）
  - `letter` - 律师函类（催告函、通知函等）

#### Scenario: Template data validation
- **WHEN** 提供填充数据
- **THEN** 系统 SHALL 验证必填字段是否完整
- **AND** 如有缺失，返回明确的错误信息

### Requirement: Legal Document Templates
系统 SHALL 维护标准化的法律文书模板库。

#### Scenario: Template structure
- **WHEN** 管理模板库
- **THEN** 每个模板 SHALL 包含:
  - 标准化的文书格式
  - 占位符标记（如 `{{party_a}}`、`{{contract_date}}`）
  - 必填字段列表

#### Scenario: Template versioning
- **WHEN** 模板更新
- **THEN** 系统 SHALL 保留旧版本
- **AND** 支持指定版本生成文档

#### Scenario: Contract templates
- **WHEN** 生成合同类文书
- **THEN** 系统 SHALL 提供:
  - 房屋租赁合同模板
  - 劳动合同模板
  - 服务合同模板
  - 借款合同模板

#### Scenario: Complaint templates
- **WHEN** 生成起诉状类文书
- **THEN** 系统 SHALL 提供:
  - 民事起诉状模板
  - 行政起诉状模板
  - 仲裁申请书模板

### Requirement: Document Generation Tool
系统 SHALL 将文书生成封装为 AI SDK 工具。

#### Scenario: Tool definition
- **WHEN** Agent 需要生成文书
- **THEN** 系统 SHALL 提供 `generateDocument` 工具
- **AND** 工具输入 schema 包含:
  - `templateId`: 模板标识
  - `templateVersion`: 模板版本（可选）
  - `data`: 填充数据对象

#### Scenario: Tool execution
- **WHEN** Agent 调用 generateDocument
- **THEN** 系统 SHALL:
  1. 验证输入数据
  2. 加载指定模板
  3. 填充数据
  4. 生成 Word 文档
  5. 上传到存储
  6. 返回下载链接

#### Scenario: Tool error handling
- **WHEN** 文书生成过程出错
- **THEN** 系统 SHALL 返回描述性错误信息
- **AND** 不中断对话流程
- **AND** Agent 可向用户解释问题

### Requirement: Document Metadata
系统 SHALL 记录生成文书的元数据。

#### Scenario: Store generation record
- **WHEN** 文书生成成功
- **THEN** 系统 SHALL 记录:
  - 生成时间
  - 使用的模板 ID 和版本
  - 关联的 chatId
  - 文档存储路径
  - 过期时间

#### Scenario: Query generation history
- **WHEN** 查询文书生成历史
- **THEN** 系统 SHALL 支持按 chatId 查询用户生成的所有文书
