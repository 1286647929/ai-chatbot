## ADDED Requirements

### Requirement: Agent Status Indicator
系统 SHALL 提供 UI 组件显示当前工作的 Agent 状态。

#### Scenario: Display classifying status
- **WHEN** 系统正在进行意图分类
- **THEN** UI SHALL 显示"正在分析问题..."状态
- **AND** 显示加载动画

#### Scenario: Display selected agent
- **WHEN** Agent 路由完成
- **THEN** UI SHALL 显示:
  - 选中的 Agent 名称（如"法律研究助手"）
  - 分类置信度百分比
  - Agent 图标或徽章

#### Scenario: Agent status animation
- **WHEN** Agent 状态切换
- **THEN** UI SHALL 使用平滑过渡动画
- **AND** 不阻塞消息显示

#### Scenario: Hide status for general chat
- **WHEN** 路由到通用对话模式
- **THEN** UI MAY 隐藏 Agent 状态指示器
- **OR** 显示简化的状态

### Requirement: Legal Citation Card
系统 SHALL 提供专门的法律引用卡片组件。

#### Scenario: Render regulation citation
- **WHEN** 消息中包含法规引用
- **THEN** UI SHALL 渲染法规引用卡片
- **AND** 显示:
  - 法律名称
  - 条款号
  - 条款内容摘要
  - 生效日期
- **AND** 提供展开查看全文的交互

#### Scenario: Render case citation
- **WHEN** 消息中包含案例引用
- **THEN** UI SHALL 渲染案例引用卡片
- **AND** 显示:
  - 案号
  - 案件名称
  - 审理法院
  - 判决日期
  - 案情摘要
- **AND** 提供查看详情的链接（如有）

#### Scenario: Citation card interaction
- **WHEN** 用户点击引用卡片
- **THEN** UI SHALL 展开显示完整内容
- **AND** 再次点击可折叠

#### Scenario: Citation card styling
- **WHEN** 渲染引用卡片
- **THEN** UI SHALL 使用:
  - 区分于普通文本的背景色
  - 左侧带有类型指示条（法规/案例不同颜色）
  - 响应式布局适配移动端

### Requirement: Citation Parsing
系统 SHALL 从 Agent 响应中解析引用信息。

#### Scenario: Parse regulation reference
- **WHEN** Agent 响应包含法规引用标记
- **THEN** 系统 SHALL 识别并提取:
  - 法律名称
  - 条款号
  - 相关内容

#### Scenario: Parse case reference
- **WHEN** Agent 响应包含案例引用标记
- **THEN** 系统 SHALL 识别并提取:
  - 案号
  - 案件关键信息

#### Scenario: Citation data format
- **WHEN** Agent 输出引用信息
- **THEN** SHALL 使用结构化格式:
```json
{
  "type": "citation",
  "citationType": "regulation" | "case",
  "data": { ... }
}
```

### Requirement: Search Source Attribution
系统 SHALL 在搜索结果中显示来源信息。

#### Scenario: Display search source
- **WHEN** 显示搜索结果
- **THEN** UI SHALL 标注:
  - 数据来源（如"来自裁判文书网"）
  - 检索时间
  - 结果数量

#### Scenario: Source link
- **WHEN** 搜索结果有原始链接
- **THEN** UI SHALL 提供可点击的来源链接
- **AND** 在新标签页打开

### Requirement: Legal Disclaimer Display
系统 SHALL 在法律回答中显示免责声明。

#### Scenario: Show disclaimer
- **WHEN** Agent 提供法律建议
- **THEN** UI SHALL 在回答末尾显示免责声明
- **AND** 声明内容为：
  > 本回答仅供参考，不构成正式法律意见。如需专业法律服务，请咨询执业律师。

#### Scenario: Disclaimer styling
- **WHEN** 渲染免责声明
- **THEN** UI SHALL 使用:
  - 较小的字体
  - 灰色或次要颜色
  - 与正文内容有明确分隔
  - 不可被用户关闭

### Requirement: Agent Mode Switcher
系统 SHALL 提供切换 Agent 模式的 UI 控件。

#### Scenario: Display mode options
- **WHEN** 用户打开模式切换器
- **THEN** UI SHALL 显示可用模式:
  - 通用对话
  - 法律智能问答（多 Agent）

#### Scenario: Switch agent mode
- **WHEN** 用户选择不同模式
- **THEN** 系统 SHALL 更新后续对话的处理方式
- **AND** UI 显示当前选中的模式

#### Scenario: Mode persistence
- **WHEN** 用户选择模式
- **THEN** 系统 MAY 记住用户偏好
- **AND** 在新会话中应用

### Requirement: Responsive Citation Display
系统 SHALL 确保引用组件在各设备上正常显示。

#### Scenario: Mobile citation card
- **WHEN** 在移动设备上显示引用卡片
- **THEN** UI SHALL:
  - 使用全宽布局
  - 调整字体大小
  - 简化展开/折叠交互

#### Scenario: Desktop citation card
- **WHEN** 在桌面设备上显示引用卡片
- **THEN** UI MAY:
  - 使用侧边悬浮展示详情
  - 支持键盘导航
