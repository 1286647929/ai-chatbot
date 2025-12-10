# Project Context

## Purpose

Chat SDK - 一个基于 Next.js 16 + Vercel AI SDK 构建的开源 AI 聊天模板。

### 核心特性
- **多模态对话**: 支持文本、图片附件
- **Artifact 系统**: 右侧面板实时生成/编辑文档、代码、表格、图片
- **流式响应**: 使用 AI SDK 实现实时流式输出
- **推理模式**: 支持带思维链 (Chain-of-Thought) 的推理模型
- **版本控制**: Artifact 支持历史版本切换和 diff 对比

## Tech Stack

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| AI | Vercel AI SDK 5.x + NewAPI (OpenAI 兼容) |
| 数据库 | PostgreSQL + Drizzle ORM |
| 认证 | Auth.js (NextAuth v5 beta) |
| UI | shadcn/ui + Tailwind CSS 4.x + Radix UI |
| 编辑器 | ProseMirror (文本) + CodeMirror (代码) |
| 测试 | Playwright |
| 代码规范 | Ultracite (Biome) |
| 包管理 | pnpm 9.x |

## Project Conventions

### Code Style

使用 Ultracite/Biome 进行代码格式化和 lint 检查：

```bash
pnpm lint    # 检查格式和 lint 问题
pnpm format  # 自动修复
```

**规则**:
- 不使用 TypeScript enum - 使用 `object as const`
- 使用 `import type` 进行类型导入
- 禁止使用 `any` 类型
- 使用 `for...of` 替代 `Array.forEach`
- 禁止嵌套三元表达式
- 生产代码禁止 `console.log`
- React: 不使用数组索引作为 key，优先使用 `<>` 而非 `<Fragment>`

### Architecture Patterns

**Route Groups (Next.js App Router)**:
- `app/(chat)/` - 主聊天界面和 API 路由
- `app/(auth)/` - 认证页面和 API (Auth.js/NextAuth)

**Key Directories**:
- `lib/ai/` - AI 配置、模型定义、prompts、tools
- `lib/db/` - Drizzle schema、queries、migrations
- `components/` - React 组件 (聊天 UI、artifacts、编辑器)
- `hooks/` - 自定义 React hooks

**AI Provider Setup** (`lib/ai/providers.ts`):
使用 NewAPI (OpenAI 兼容) 配置，模型别名:
- `chat-model` - 默认聊天模型
- `chat-model-reasoning` - 带推理链的模型
- `title-model` - 生成标题的模型
- `artifact-model` - 文档/artifact 生成模型

**Database Schema** (`lib/db/schema.ts`):
主表: `User`, `Chat`, `Message_v2`, `Vote_v2`, `Document`, `Suggestion`, `Stream`
> 注意: `Message` 和 `Vote` (不带 `_v2`) 是已废弃的旧表

### Testing Strategy

使用 Playwright 进行 E2E 测试：

```bash
pnpm test                                    # 运行所有测试
pnpm exec playwright test tests/e2e/chat.test.ts  # 运行特定文件
pnpm exec playwright test --project=e2e      # 运行特定项目
```

测试文件位于 `tests/` 目录。

### Git Workflow

- 主分支: `main`
- 使用语义化提交信息
- PR 需要通过 lint 检查
- 变更提案使用 OpenSpec 流程

## Domain Context

### AI 工具 (`lib/ai/tools/`)

| 工具 | 功能 |
|------|------|
| `createDocument` | 创建 Artifact (文本/代码/图片/表格) |
| `updateDocument` | 更新现有 Artifact |
| `getWeather` | 获取天气信息 |
| `requestSuggestions` | 请求文档修改建议 |

### Artifact 类型

| 类型 | 编辑器 | 用途 |
|------|--------|------|
| `text` | ProseMirror | 富文本文档 |
| `code` | CodeMirror | Python 代码 |
| `image` | 自定义 | 图片展示/编辑 |
| `sheet` | react-data-grid | CSV 表格 |

### API 路由

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

## Important Constraints

### 环境变量 (必需)
- `AUTH_SECRET` - NextAuth secret
- `NEWAPI_BASE_URL` - NewAPI 端点 (必须以 `/v1` 结尾)
- `NEWAPI_API_KEY` - NewAPI 密钥
- `POSTGRES_URL` - PostgreSQL 连接字符串
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob 存储 token

### 环境变量 (可选)
- `REDIS_URL` - 启用可恢复流

### 文件上传限制
- 当前仅支持 JPEG/PNG 图片
- 最大 5MB

### 浏览器兼容性
- 需要现代浏览器支持 (Chrome, Firefox, Safari, Edge)
- 需要 JavaScript 启用

## External Dependencies

### 核心服务
- **NewAPI**: OpenAI 兼容的 AI 后端服务
- **Vercel Blob**: 文件存储服务
- **PostgreSQL**: 主数据库
- **Redis** (可选): 流恢复支持

### 主要 npm 包
- `ai` (5.x): Vercel AI SDK
- `next` (16.x): React 框架
- `drizzle-orm`: 数据库 ORM
- `next-auth` (5.x beta): 认证
- `zod`: Schema 验证

## Commands Quick Reference

```bash
# Development
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 (localhost:3000)
pnpm build            # 运行迁移并构建

# Database
pnpm db:migrate       # 应用迁移
pnpm db:generate      # 生成迁移文件
pnpm db:studio        # 打开 Drizzle Studio GUI
pnpm db:push          # 直接推送 schema (仅开发环境)

# Code Quality
pnpm lint             # 检查格式和 lint
pnpm format           # 自动修复

# Testing
pnpm test             # 运行所有 Playwright 测试
```
