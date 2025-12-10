# Tasks: localize-ui-to-chinese

## 实施任务清单

### 1. 认证模块本地化

- [x] **1.1** 更新 `components/auth-form.tsx`
  - "Email Address" → "邮箱地址"
  - "Password" → "密码"

- [x] **1.2** 更新 `app/(auth)/login/page.tsx`
  - "Sign In" → "登录"
  - "Use your email and password to sign in" → "使用邮箱和密码登录"
  - "Sign in" (按钮) → "登录"
  - "Don't have an account?" → "还没有账号？"
  - "Sign up" → "注册"
  - "for free." → "免费注册。"
  - Toast: "Invalid credentials!" → "凭证无效！"
  - Toast: "Failed validating your submission!" → "验证提交信息失败！"

- [x] **1.3** 更新 `app/(auth)/register/page.tsx`
  - "Sign Up" → "注册"
  - "Create an account with your email and password" → "使用邮箱和密码创建账号"
  - "Sign Up" (按钮) → "注册"
  - "Already have an account?" → "已有账号？"
  - "Sign in" → "登录"
  - "instead." → "。"
  - Toast: "Account already exists!" → "账号已存在！"
  - Toast: "Failed to create account!" → "创建账号失败！"
  - Toast: "Account created successfully!" → "账号创建成功！"

### 2. 聊天界面本地化

- [x] **2.1** 更新 `components/greeting.tsx`
  - "Hello there!" → "你好！"
  - "How can I help you today?" → "今天有什么可以帮你的？"

- [x] **2.2** 更新 `components/app-sidebar.tsx`
  - "Chatbot" → "智能助手"
  - "Delete All Chats" → "删除所有对话"
  - "New Chat" → "新对话"
  - "Delete all chats?" → "删除所有对话？"
  - "This action cannot be undone..." → "此操作无法撤销。这将永久删除您的所有对话并从服务器中移除。"
  - "Cancel" → "取消"
  - "Delete All" → "全部删除"
  - Toast: "Deleting all chats..." → "正在删除所有对话..."
  - Toast: "All chats deleted successfully" → "所有对话已删除"
  - Toast: "Failed to delete all chats" → "删除所有对话失败"

- [x] **2.3** 更新 `components/chat-header.tsx`
  - "New Chat" → "新对话"
  - "Deploy with Vercel" → "部署到 Vercel"

- [x] **2.4** 更新 `components/sidebar-history.tsx`
  - "Login to save and revisit previous chats!" → "登录以保存和查看历史对话！"
  - "Today" → "今天"
  - "Yesterday" → "昨天"
  - "Last 7 days" → "最近7天"
  - "Last 30 days" → "最近30天"
  - "Older than last month" → "更早"
  - "Your conversations will appear here once you start chatting!" → "开始对话后，您的对话记录将显示在这里！"
  - "You have reached the end of your chat history." → "已加载全部对话历史。"
  - "Loading Chats..." → "加载中..."
  - "Are you absolutely sure?" → "确定要删除吗？"
  - "This action cannot be undone..." → "此操作无法撤销。这将永久删除此对话并从服务器中移除。"
  - "Cancel" → "取消"
  - "Continue" → "确定"
  - Toast: "Deleting chat..." → "正在删除对话..."
  - Toast: "Chat deleted successfully" → "对话已删除"
  - Toast: "Failed to delete chat" → "删除对话失败"

- [x] **2.5** 更新 `components/sidebar-user-nav.tsx`
  - "Loading auth status" → "正在检查登录状态"
  - "Guest" → "访客"
  - "Toggle dark/light mode" → "切换深色/浅色模式"
  - "Login to your account" → "登录您的账号"
  - "Sign out" → "退出登录"
  - Toast: "Checking authentication status, please try again!" → "正在检查登录状态，请稍后重试！"

- [x] **2.6** 更新 `components/multimodal-input.tsx`
  - "Send a message..." → "输入消息..."
  - Toast: "Please wait for the model to finish its response!" → "请等待模型完成响应！"
  - Toast: "Failed to upload file, please try again!" → "文件上传失败，请重试！"
  - Toast: "Failed to upload pasted image(s)" → "粘贴的图片上传失败"

- [x] **2.7** 更新 `components/suggested-actions.tsx`
  - "What are the advantages of using Next.js?" → "使用 Next.js 有什么优势？"
  - "Write code to demonstrate Dijkstra's algorithm" → "编写代码演示 Dijkstra 算法"
  - "Help me write an essay about Silicon Valley" → "帮我写一篇关于硅谷的文章"
  - "What is the weather in San Francisco?" → "旧金山的天气怎么样？"

### 3. 消息操作本地化

- [x] **3.1** 更新 `components/message-actions.tsx`
  - "Edit" → "编辑"
  - "Copy" → "复制"
  - "Upvote Response" → "点赞"
  - "Downvote Response" → "踩"
  - Toast: "There's no text to copy!" → "没有可复制的文本！"
  - Toast: "Copied to clipboard!" → "已复制到剪贴板！"
  - Toast: "Upvoting Response..." → "正在点赞..."
  - Toast: "Upvoted Response!" → "已点赞！"
  - Toast: "Failed to upvote response." → "点赞失败。"
  - Toast: "Downvoting Response..." → "正在踩..."
  - Toast: "Downvoted Response!" → "已踩！"
  - Toast: "Failed to downvote response." → "踩失败。"

- [x] **3.2** 更新 `components/message-editor.tsx`
  - "Cancel" → "取消"
  - "Sending..." → "发送中..."
  - "Send" → "发送"

### 4. 其他组件本地化

- [x] **4.1** 更新 `components/visibility-selector.tsx`
  - "Private" → "私密"
  - "Only you can access this chat" → "仅您可以访问此对话"
  - "Public" → "公开"
  - "Anyone with the link can access this chat" → "任何有链接的人都可以访问此对话"

- [x] **4.2** 更新 `components/artifact.tsx`
  - "Saving changes..." → "正在保存..."

- [x] **4.3** 更新 `components/artifact-actions.tsx`
  - Toast: "Failed to execute action" → "操作执行失败"

### 5. 验证

- [x] **5.1** 运行 lint 检查: `pnpm lint` (注：biome.jsonc 配置有预存问题，与本次变更无关)
- [x] **5.2** 运行构建: `pnpm build` ✓ 构建成功
- [ ] **5.3** 运行测试: `pnpm test` (可选，需要手动执行)
- [ ] **5.4** 手动验证所有页面的中文显示正常 (需要启动开发服务器验证)

## 依赖关系

- 任务 1.1 需在任务 1.2 和 1.3 之前完成（共享表单组件）
- 任务 5.x 需在所有其他任务完成后执行

## 可并行执行

- 任务 2.x 和 3.x 可并行执行
- 任务 4.x 可与其他任务并行执行
