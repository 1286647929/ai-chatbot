# Tasks: Add Legal Document Chat

## 1. API Layer (Priority: P0)

- [ ] 1.1 Create `/api/legal/interact/route.ts` - Proxy to backend interact API
  - Handle both streaming (SSE) and non-streaming modes
  - Forward authentication headers
  - Proxy SSE events directly

- [ ] 1.2 Create `/api/textract/route.ts` - OCR/ASR text extraction
  - Accept `fileId` and `scene` parameters
  - Call backend textract service
  - Return extracted text

- [ ] 1.3 Modify `/api/files/upload/route.ts` - Extend file type support
  - Add PDF, audio file types to allowed list
  - Increase size limit to 10MB
  - Return `fileId` for subsequent OCR

- [ ] 1.4 Update `.env.example` - Add new environment variables
  - `LEGAL_API_BASE_URL`
  - `LEGAL_API_KEY` (optional)

## 2. Type Definitions (Priority: P0)

- [ ] 2.1 Create `lib/legal/types.ts` - Legal chat type definitions
  - `LegalStep` union type
  - `LegalMessage` interface
  - `LegalApiResponse` interface
  - `StreamEvent` interface
  - `DocumentPath`, `QuestionMeta`, `AttachmentAnalysis` interfaces

## 3. State Management (Priority: P1)

- [ ] 3.1 Create `hooks/use-legal-chat.ts` - Core chat hook
  - Session state management (`sessionId`, `currentStep`)
  - Message list management
  - Streaming content handling
  - `sendMessage()`, `selectPath()`, `stopStream()`, `reset()` methods

- [ ] 3.2 Create `lib/legal/stream-parser.ts` - SSE stream parser utility
  - Parse `data: {...}` lines
  - Handle `start`, `content`, `done`, `error` events

## 4. UI Components (Priority: P1)

- [ ] 4.1 Create `components/legal-chat.tsx` - Main chat container
  - Render messages based on `currentStep`
  - Handle different step types (greeting, consulting, ask_question, etc.)
  - Display streaming content

- [ ] 4.2 Create `components/document-path-selector.tsx` - Path selection UI
  - Display `document_paths` as cards
  - Highlight `recommended_path`
  - Handle selection and confirmation

- [ ] 4.3 Create `components/question-card.tsx` - Question display
  - Show question text and progress
  - Display `fact_analysis` if present
  - Show `attachment_hint`

- [ ] 4.4 Create `components/attachment-analysis.tsx` - Analysis result display
  - Show recognized document type
  - Display confidence and summary
  - Handle duplicate warnings

## 5. Voice Input (Priority: P2)

- [ ] 5.1 Install `recordrtc` dependency for cross-browser recording

- [ ] 5.2 Create `components/voice-input.tsx` - Voice recording component
  - MediaRecorder integration with RecordRTC
  - Push-to-talk for mobile, click-to-record for desktop
  - Recording duration display
  - Cancel gesture support

- [ ] 5.3 Create `components/voice-player.tsx` - Voice message playback
  - Play/pause controls
  - Progress indicator
  - Duration display

- [ ] 5.4 Create `hooks/use-voice-recorder.ts` - Recording logic hook
  - Permission handling
  - Recording state management
  - File blob generation

## 6. Enhanced File Upload (Priority: P2)

- [ ] 6.1 Modify `components/multimodal-input.tsx` - Add voice toggle
  - Voice mode button
  - Integrate voice input component

- [ ] 6.2 Modify `components/preview-attachment.tsx` - Extended previews
  - Document file icon display
  - Audio file preview with duration
  - OCR status indicator

## 7. Page Integration (Priority: P2)

- [ ] 7.1 Create `app/(chat)/legal/page.tsx` - Legal chat page
  - Initialize session on mount
  - Render `LegalChat` component

- [ ] 7.2 Create `app/(chat)/legal/layout.tsx` - Layout wrapper (if needed)

## 8. Testing & Validation (Priority: P2)

- [ ] 8.1 Add unit tests for `useLegalChat` hook
  - Test state transitions
  - Test message handling

- [ ] 8.2 Add unit tests for stream parser
  - Test SSE event parsing
  - Test error handling

- [ ] 8.3 Add E2E test for legal chat flow
  - Test greeting → consulting → completed flow

## Dependencies

- Task 2.1 must complete before 3.1
- Task 1.1-1.3 can run in parallel
- Task 3.1 must complete before 4.1-4.4
- Task 5.1 must complete before 5.2-5.4
- Task 4.1-4.4 must complete before 7.1

## Parallelizable Work

- API routes (1.1, 1.2, 1.3) can be developed in parallel
- UI components (4.1, 4.2, 4.3, 4.4) can be developed in parallel after hook is ready
- Voice components (5.2, 5.3, 5.4) can be developed in parallel after dependency installed
