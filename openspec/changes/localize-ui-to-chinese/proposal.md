# Proposal: localize-ui-to-chinese

## Summary

将 AI Chatbot 应用的用户界面从英文本地化为简体中文。此变更涉及替换所有面向用户的硬编码英文文本字符串为对应的中文翻译。

## Motivation

当前项目的所有用户界面文本都是英文的，需要将其修改为中文以满足中文用户的使用需求。

## Scope

### 涉及的文件

本次变更将直接修改以下组件文件中的硬编码文本字符串：

**认证模块:**
- `app/(auth)/login/page.tsx` - 登录页面
- `app/(auth)/register/page.tsx` - 注册页面
- `components/auth-form.tsx` - 认证表单

**聊天界面:**
- `components/greeting.tsx` - 欢迎消息
- `components/app-sidebar.tsx` - 侧边栏
- `components/chat-header.tsx` - 聊天头部
- `components/sidebar-history.tsx` - 历史记录侧边栏
- `components/sidebar-user-nav.tsx` - 用户导航
- `components/multimodal-input.tsx` - 输入框
- `components/suggested-actions.tsx` - 建议操作
- `components/message-actions.tsx` - 消息操作
- `components/message-editor.tsx` - 消息编辑器

**其他组件:**
- `components/visibility-selector.tsx` - 可见性选择器
- `components/artifact.tsx` - 文档查看器

### 不涉及的范围

- 不引入 i18n 国际化框架（保持简单直接的硬编码方式）
- 不修改系统提示词（AI prompts）
- 不修改 API 返回的消息
- 不修改代码注释和变量名

## Approach

采用直接替换方式，将每个组件中的英文字符串替换为对应的中文翻译。此方法简单直接，不增加额外的技术复杂度。

## Risk Assessment

- **低风险**: 变更仅涉及 UI 文本替换，不影响业务逻辑
- **回归风险**: 需确保所有替换的字符串在 UI 中正确显示，无截断或布局问题

## Dependencies

无外部依赖。

## Acceptance Criteria

1. 所有面向用户的界面文本显示为中文
2. 页面布局不受影响
3. 应用功能正常运行
4. 通过现有测试
