# Design: Legal Document Chat Integration

## Context

The ai-chatbot project currently uses Vercel AI SDK to directly call AI models through NewAPI. However, for legal document generation, we need to integrate with an existing backend service that provides:
- A state-machine driven conversation workflow
- Session management with `session_id`
- SSE streaming responses
- Attachment processing with OCR/ASR

This integration must coexist with the existing chat functionality without breaking changes.

**Stakeholders**: Frontend developers, Backend API team, End users

## Goals / Non-Goals

### Goals
- Integrate with existing `/api/session/interact` backend API
- Support both streaming (SSE) and non-streaming response modes
- Enable file upload with OCR text extraction
- Enable voice input with speech-to-text transcription
- Provide a state-machine driven UI for legal document workflow
- Maintain existing ai-chatbot functionality unchanged

### Non-Goals
- Replacing the existing Vercel AI SDK based chat
- Building our own AI model integration
- Creating a mobile app version
- Real-time collaboration features

## Decisions

### Decision 1: API Proxy Architecture
**What**: Create a Next.js API route (`/api/legal/interact`) that proxies requests to the backend API.

**Why**:
- Keeps backend URL/credentials secure (not exposed to client)
- Allows adding authentication, rate limiting, logging
- Enables response transformation if needed
- Consistent with existing `/api/chat` pattern

**Alternatives considered**:
- Direct client-to-backend calls: Rejected due to CORS, security concerns
- Edge functions: Unnecessary complexity for this use case

### Decision 2: State Management with Custom Hook
**What**: Create `useLegalChat` hook to manage conversation state separate from existing `useChat` hook.

**Why**:
- Legal chat has different state model (session_id, next_step, document_paths)
- Avoids coupling with Vercel AI SDK's state management
- Clear separation of concerns
- Easier to test and maintain

**Alternatives considered**:
- Extend existing `useChat`: Rejected - too different semantically
- Context API: Overkill for single-page state

### Decision 3: SSE Stream Handling
**What**: Proxy SSE stream directly from backend, parse on client using ReadableStream API.

**Why**:
- Backend already provides SSE format: `data: {"type": "content", "content": "..."}`
- No need for transformation layer
- Efficient memory usage with streaming

**Stream Event Types**:
| Type | Purpose | Fields |
|------|---------|--------|
| `start` | Session initialized | `session_id`, `next_step` |
| `content` | Text chunk | `content` |
| `done` | Generation complete | `session_id`, `next_step`, `data` |
| `error` | Error occurred | `message` |

### Decision 4: File Upload Enhancement
**What**: Extend existing upload route to support additional file types, return `fileId` for OCR.

**Why**:
- Reuse existing Vercel Blob infrastructure
- Consistent upload UX
- `fileId` enables subsequent OCR API call

**Supported Types**:
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF
- Audio: WebM, WAV, MP3, M4A

### Decision 5: Voice Input Implementation
**What**: Use MediaRecorder API with RecordRTC library for cross-browser compatibility.

**Why**:
- MediaRecorder is standard but has Safari issues
- RecordRTC provides consistent API across browsers
- Push-to-talk pattern matches mobile WeChat experience

**Interaction Pattern**:
- Desktop: Click to start, click to stop
- Mobile: Hold to record, release to send, swipe up to cancel

## Risks / Trade-offs

### Risk 1: Backend API Availability
- **Risk**: Backend service downtime affects legal chat
- **Mitigation**: Graceful error handling, retry logic, user-friendly error messages

### Risk 2: Browser Compatibility for Voice
- **Risk**: MediaRecorder not supported in older browsers
- **Mitigation**: Feature detection, fallback UI without voice option

### Risk 3: Large File OCR Latency
- **Risk**: OCR for large files may be slow
- **Mitigation**: Loading indicators, async processing, file size limits

### Risk 4: State Complexity
- **Risk**: Complex state machine may lead to edge case bugs
- **Mitigation**: Comprehensive unit tests, clear state transitions

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ VoiceInput   │    │ FileUpload   │    │ TextInput    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                   │
│                   ┌─────────────────┐                           │
│                   │  useLegalChat   │                           │
│                   │     Hook        │                           │
│                   └────────┬────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ /api/legal/      │  │ /api/files/  │  │ /api/textract    │   │
│  │ interact         │  │ upload       │  │                  │   │
│  └────────┬─────────┘  └──────┬───────┘  └────────┬─────────┘   │
└───────────┼───────────────────┼───────────────────┼─────────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ /api/session/    │  │ Vercel Blob  │  │ /app/legal/      │   │
│  │ interact         │  │ Storage      │  │ textract         │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │ init()
                           ▼
                    ┌─────────────┐
                    │  greeting   │
                    └──────┬──────┘
                           │ user message
                           ▼
                    ┌─────────────┐
              ┌────▶│ consulting  │◀────┐
              │     └──────┬──────┘     │
              │            │            │
              │  need more │ ready      │
              │     info   ▼            │
              │     ┌─────────────────┐ │
              └─────│select_doc_path │ │
                    └──────┬──────────┘ │
                           │ select     │
                           ▼            │
                    ┌─────────────┐     │
                    │path_selected│     │
                    └──────┬──────┘     │
                           │            │
                           ▼            │
                    ┌─────────────┐     │
              ┌────▶│ask_question │─────┘
              │     └──────┬──────┘ (if path switch)
              │            │
              │ more       │ all answered
              │ questions  ▼
              │     ┌─────────────────┐
              └─────│supplement_info │
                    └──────┬──────────┘
                           │ complete
                           ▼
                    ┌─────────────┐
                    │  completed  │
                    └─────────────┘
```

## Migration Plan

This is an additive change with no migration required:
1. Deploy API routes first
2. Deploy hooks and types
3. Deploy UI components
4. Create new `/legal` page
5. Add navigation link when ready

**Rollback**: Remove `/legal` page and navigation link. API routes can remain as they don't affect existing functionality.

## Open Questions

1. **Authentication**: Should legal chat require login? (Currently: Yes, same as existing chat)
2. **Session Persistence**: Should sessions be stored in database for history? (Deferred: Start with sessionStorage)
3. **File Size Limits**: What's the maximum file size for OCR? (Proposed: 10MB)
4. **Voice Recording Limit**: Maximum recording duration? (Proposed: 60 seconds, matching source project)
