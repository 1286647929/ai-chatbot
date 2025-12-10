# Change: Add Legal Document Chat with Custom API Integration

## Why

The current ai-chatbot uses Vercel AI SDK to directly call AI models. However, we need to integrate with an existing backend API (`/api/session/interact`) that provides a state-machine-driven legal document generation workflow. This backend API supports:
- Session-based conversation management
- Streaming (SSE) and non-streaming response modes
- Attachment handling with OCR text extraction
- Voice input transcription
- Multi-step workflow: greeting → consulting → document path selection → Q&A → document generation

## What Changes

### New Capabilities
- **Legal Chat API Proxy**: New API route to proxy requests to backend `/api/session/interact` endpoint
- **OCR/Textract API**: API route to extract text from uploaded files (images, documents, audio)
- **Voice Input**: Web-based voice recording with push-to-talk interaction
- **Enhanced File Upload**: Support for additional file types (PDF, DOC, audio) beyond current JPEG/PNG

### UI Components
- New `useLegalChat` hook for state-machine driven conversation management
- Document path selector component for legal document type selection
- Question card component for structured Q&A flow
- Voice input component with recording controls
- Attachment analysis display component

### **BREAKING** Changes
- None - this is an additive change that creates a parallel chat mode

## Impact

- Affected specs: `legal-chat-api`, `file-upload`, `voice-input`, `ocr-textract` (all new)
- Affected code:
  - `app/(chat)/api/legal/interact/route.ts` (new)
  - `app/(chat)/api/textract/route.ts` (new)
  - `app/(chat)/api/files/upload/route.ts` (modify)
  - `hooks/use-legal-chat.ts` (new)
  - `components/legal-chat.tsx` (new)
  - `components/voice-input.tsx` (new)
  - `components/multimodal-input.tsx` (modify)
  - `lib/legal/types.ts` (new)
  - `.env.example` (modify)

## Dependencies

- Backend API must be available at `LEGAL_API_BASE_URL`
- OCR/ASR service must be accessible through backend textract endpoint
