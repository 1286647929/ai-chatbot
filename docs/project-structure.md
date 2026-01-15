# 项目目录结构

```
ai-chatbot/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── globals.css               # 全局样式 (Tailwind)
│   ├── (auth)/                   # 认证路由组（对外 URL 不含该段）
│   │   ├── auth.ts               # Auth.js 配置
│   │   ├── auth.config.ts        # 认证配置
│   │   ├── actions.ts            # 认证 Server Actions
│   │   ├── login/page.tsx        # 登录页
│   │   ├── register/page.tsx     # 注册页
│   │   └── api/
│   │       └── auth/
│   │           ├── guest/route.ts         # 游客登录 API
│   │           └── [...nextauth]/route.ts # NextAuth 路由
│   └── (legal)/                  # 法律助手路由组（对外 URL 不含该段）
│       ├── (site)/               # Legal 主体验（含侧边栏布局）
│       │   ├── layout.tsx        # Legal 布局 (含侧边栏)
│       │   ├── page.tsx          # `/` 法律文书助手首页
│       │   └── legal/route.ts    # `/legal` -> `/` 重定向
│       ├── ping/route.ts         # `/ping` (测试用)
│       └── api/
│           ├── legal/interact/route.ts   # 法律对话代理 API
│           └── textract/
│               ├── route.ts              # 文本提取 API
│               └── oss-info/route.ts     # OSS URL 查询
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
    ├── e2e/legal-default.test.ts # `/` 与 `/legal` 行为验证
    └── routes/ping.test.ts       # `/ping` 健康检查
```
