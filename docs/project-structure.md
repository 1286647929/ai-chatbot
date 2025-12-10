# 项目目录结构

```
ai-chatbot/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── globals.css               # 全局样式 (Tailwind)
│   ├── (auth)/                   # 认证路由组
│   │   ├── auth.ts               # Auth.js 配置
│   │   ├── auth.config.ts        # 认证配置
│   │   ├── actions.ts            # 认证 Server Actions
│   │   ├── login/page.tsx        # 登录页
│   │   ├── register/page.tsx     # 注册页
│   │   └── api/auth/
│   │       ├── guest/route.ts    # 游客登录 API
│   │       └── [...nextauth]/route.ts  # NextAuth 路由
│   └── (chat)/                   # 聊天路由组
│       ├── layout.tsx            # 聊天布局 (含侧边栏)
│       ├── page.tsx              # 首页 (新对话)
│       ├── actions.ts            # 聊天 Server Actions
│       ├── chat/[id]/page.tsx    # 对话详情页
│       └── api/
│           ├── chat/
│           │   ├── route.ts      # 聊天主 API (POST/DELETE)
│           │   ├── schema.ts     # 请求体 Zod 校验
│           │   └── [id]/stream/route.ts  # 流恢复 API
│           ├── document/route.ts # 文档 CRUD API
│           ├── files/upload/route.ts  # 文件上传 API
│           ├── history/route.ts  # 历史记录 API
│           ├── suggestions/route.ts   # 建议 API
│           └── vote/route.ts     # 投票 API
│
├── components/                   # React 组件
│   ├── chat.tsx                  # 聊天主组件
│   ├── messages.tsx              # 消息列表
│   ├── message.tsx               # 单条消息
│   ├── multimodal-input.tsx      # 多模态输入框
│   ├── artifact.tsx              # Artifact 主面板
│   ├── app-sidebar.tsx           # 应用侧边栏
│   ├── sidebar-history.tsx       # 历史记录侧边栏
│   ├── model-selector.tsx        # 模型选择器
│   ├── visibility-selector.tsx   # 可见性选择器
│   ├── elements/                 # 消息元素组件
│   │   ├── code-block.tsx        # 代码块
│   │   ├── reasoning.tsx         # 推理展示
│   │   ├── tool.tsx              # 工具调用展示
│   │   └── ...
│   └── ui/                       # shadcn/ui 基础组件
│       ├── button.tsx
│       ├── input.tsx
│       ├── sidebar.tsx
│       └── ...
│
├── artifacts/                    # Artifact 类型定义
│   ├── text/                     # 文本 Artifact
│   │   ├── client.tsx            # 客户端渲染
│   │   └── server.ts             # 服务端处理
│   ├── code/                     # 代码 Artifact
│   │   ├── client.tsx            # CodeMirror 编辑器
│   │   └── server.ts
│   ├── image/                    # 图片 Artifact
│   │   └── client.tsx
│   ├── sheet/                    # 表格 Artifact
│   │   ├── client.tsx            # react-data-grid
│   │   └── server.ts
│   └── actions.ts                # Artifact Server Actions
│
├── hooks/                        # 自定义 Hooks
│   ├── use-artifact.ts           # Artifact 状态管理
│   ├── use-chat-visibility.ts    # 聊天可见性
│   ├── use-auto-resume.ts        # 流自动恢复
│   ├── use-messages.tsx          # 消息管理
│   └── use-scroll-to-bottom.tsx  # 自动滚动
│
├── lib/                          # 核心库
│   ├── ai/
│   │   ├── providers.ts          # AI 提供商配置 (NewAPI)
│   │   ├── models.ts             # 模型定义
│   │   ├── prompts.ts            # 系统提示词
│   │   ├── entitlements.ts       # 用户权限配置
│   │   └── tools/                # AI 工具
│   │       ├── create-document.ts
│   │       ├── update-document.ts
│   │       ├── get-weather.ts
│   │       └── request-suggestions.ts
│   ├── db/
│   │   ├── schema.ts             # Drizzle 数据库 Schema
│   │   ├── queries.ts            # 数据库查询函数
│   │   ├── migrate.ts            # 迁移脚本
│   │   └── migrations/           # SQL 迁移文件
│   ├── editor/                   # ProseMirror 编辑器配置
│   ├── types.ts                  # 类型定义
│   ├── utils.ts                  # 工具函数
│   ├── errors.ts                 # 自定义错误类
│   └── usage.ts                  # Token 使用量类型
│
└── tests/                        # Playwright 测试
    ├── e2e/                      # 端到端测试
    ├── routes/                   # API 路由测试
    └── fixtures.ts               # 测试 fixtures
```
