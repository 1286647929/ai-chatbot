# 项目详细介绍

## 1. 项目概述

**Chat SDK** 是一个基于 Next.js 16 + Vercel AI SDK 构建的开源 AI 聊天模板。

### 核心特性

- **多模态对话**: 支持文本、图片附件
- **Artifact 系统**: 右侧面板实时生成/编辑文档、代码、表格、图片
- **流式响应**: 使用 AI SDK 实现实时流式输出
- **推理模式**: 支持带思维链 (Chain-of-Thought) 的推理模型
- **版本控制**: Artifact 支持历史版本切换和 diff 对比

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| AI | Vercel AI SDK + NewAPI (OpenAI 兼容) |
| 数据库 | PostgreSQL + Drizzle ORM |
| 认证 | Auth.js (NextAuth v5) |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| 编辑器 | ProseMirror (文本) + CodeMirror (代码) |
| 测试 | Playwright |
| 代码规范 | Ultracite (Biome) |

---

## 2. 页面详解

| 路径 | 文件 | 功能 |
|------|------|------|
| `/` | `app/(chat)/page.tsx` | 首页，创建新对话 |
| `/chat/[id]` | `app/(chat)/chat/[id]/page.tsx` | 对话详情页，加载历史消息 |
| `/login` | `app/(auth)/login/page.tsx` | 登录页 |
| `/register` | `app/(auth)/register/page.tsx` | 注册页 |

---

## 3. 核心组件详解

### 聊天相关

| 组件 | 文件 | 功能 |
|------|------|------|
| `Chat` | `components/chat.tsx` | 聊天主组件，整合消息列表、输入框、Artifact |
| `Messages` | `components/messages.tsx` | 消息列表，处理滚动和虚拟化 |
| `Message` | `components/message.tsx` | 单条消息渲染，区分用户/助手 |
| `MultimodalInput` | `components/multimodal-input.tsx` | 多模态输入框，支持文本、附件、模型切换 |
| `ChatHeader` | `components/chat-header.tsx` | 聊天头部，显示标题和操作按钮 |
| `MessageActions` | `components/message-actions.tsx` | 消息操作 (复制、投票、编辑) |
| `MessageReasoning` | `components/message-reasoning.tsx` | 展示模型推理过程 |

### Artifact 系统

| 组件 | 文件 | 功能 |
|------|------|------|
| `Artifact` | `components/artifact.tsx` | Artifact 主面板，动画展开/收起 |
| `ArtifactActions` | `components/artifact-actions.tsx` | 版本切换、下载、复制等操作 |
| `ArtifactMessages` | `components/artifact-messages.tsx` | Artifact 内嵌消息列表 |
| `Toolbar` | `components/toolbar.tsx` | Artifact 工具栏 |
| `VersionFooter` | `components/version-footer.tsx` | 版本导航底栏 |

### 编辑器

| 组件 | 文件 | 功能 |
|------|------|------|
| `TextEditor` | `components/text-editor.tsx` | ProseMirror 富文本编辑器 |
| `CodeEditor` | `components/code-editor.tsx` | CodeMirror 代码编辑器 |
| `SheetEditor` | `components/sheet-editor.tsx` | react-data-grid 表格编辑器 |
| `ImageEditor` | `components/image-editor.tsx` | 图片编辑器 |
| `DiffView` | `components/diffview.tsx` | 版本差异对比视图 |

### 侧边栏

| 组件 | 文件 | 功能 |
|------|------|------|
| `AppSidebar` | `components/app-sidebar.tsx` | 应用侧边栏容器 |
| `SidebarHistory` | `components/sidebar-history.tsx` | 历史对话列表 (无限滚动) |
| `SidebarHistoryItem` | `components/sidebar-history-item.tsx` | 单个历史记录项 |
| `SidebarUserNav` | `components/sidebar-user-nav.tsx` | 用户导航 (设置、登出) |
| `SidebarToggle` | `components/sidebar-toggle.tsx` | 侧边栏展开/收起按钮 |

### 消息元素 (`components/elements/`)

| 组件 | 功能 |
|------|------|
| `CodeBlock` | 代码块渲染 (语法高亮) |
| `Reasoning` | 推理过程折叠展示 |
| `Tool` | 工具调用结果展示 |
| `Suggestion` | 建议修改展示 |
| `Loader` | 加载动画 |
| `WebPreview` | 网页预览 |

### 其他

| 组件 | 文件 | 功能 |
|------|------|------|
| `ModelSelector` | `components/model-selector.tsx` | 模型选择下拉框 |
| `VisibilitySelector` | `components/visibility-selector.tsx` | 对话可见性 (公开/私有) |
| `AuthForm` | `components/auth-form.tsx` | 登录/注册表单 |
| `Greeting` | `components/greeting.tsx` | 首页欢迎语 |
| `SuggestedActions` | `components/suggested-actions.tsx` | 建议的快捷操作 |
| `Weather` | `components/weather.tsx` | 天气工具结果展示 |
| `DataStreamHandler` | `components/data-stream-handler.tsx` | 处理自定义数据流事件 |
| `DataStreamProvider` | `components/data-stream-provider.tsx` | 数据流 Context Provider |
| `ThemeProvider` | `components/theme-provider.tsx` | 主题切换 (next-themes) |

---

## 4. Artifact 类型

| 类型 | 目录 | 编辑器 | 用途 |
|------|------|--------|------|
| `text` | `artifacts/text/` | ProseMirror | 富文本文档 |
| `code` | `artifacts/code/` | CodeMirror | Python 代码 (可执行) |
| `image` | `artifacts/image/` | 自定义 | 图片展示/编辑 |
| `sheet` | `artifacts/sheet/` | react-data-grid | CSV 表格 |

---

## 5. AI 工具

定义在 `lib/ai/tools/`：

| 工具 | 功能 |
|------|------|
| `createDocument` | 创建 Artifact (文本/代码/图片/表格) |
| `updateDocument` | 更新现有 Artifact |
| `getWeather` | 获取天气信息 |
| `requestSuggestions` | 请求文档修改建议 |

---

## 6. 数据库 Schema

| 表名 | 用途 |
|------|------|
| `User` | 用户信息 |
| `Chat` | 对话元数据 |
| `Message_v2` | 消息 (parts 结构) |
| `Vote_v2` | 消息投票 |
| `Document` | Artifact 文档 (支持版本) |
| `Suggestion` | 文档修改建议 |
| `Stream` | 流恢复标识 |

> 注意: `Message` 和 `Vote` (不带 `_v2`) 是已废弃的旧表。

---

## 7. 自定义 Hooks

| Hook | 功能 |
|------|------|
| `useArtifact` | Artifact 全局状态 (Zustand) |
| `useChatVisibility` | 对话可见性状态 |
| `useAutoResume` | 断线后自动恢复流 |
| `useMessages` | 消息处理逻辑 |
| `useScrollToBottom` | 消息列表自动滚动 |
| `useMobile` | 移动端检测 |

---

## 8. API 路由

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/chat` | POST | 发送消息，返回流式响应 |
| `/api/chat` | DELETE | 删除对话 |
| `/api/chat/[id]/stream` | GET | 恢复中断的流 |
| `/api/document` | GET/POST | 文档 CRUD |
| `/api/files/upload` | POST | 文件上传 (Vercel Blob) |
| `/api/history` | GET | 获取历史对话列表 |
| `/api/suggestions` | GET/POST | 获取/创建文档建议 |
| `/api/vote` | GET/PATCH | 消息投票 |
| `/api/auth/guest` | POST | 游客登录 |
