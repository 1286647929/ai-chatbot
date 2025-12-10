## ADDED Requirements

### Requirement: Legal Chat API Proxy
The system SHALL provide an API endpoint at `/api/legal/interact` that proxies requests to the backend legal document service.

#### Scenario: Initialize session without session_id
- **WHEN** client sends POST request without `session_id`
- **THEN** system forwards request to backend `/api/session/interact`
- **AND** returns response with new `session_id` and `next_step: "greeting"`

#### Scenario: Send message with existing session
- **WHEN** client sends POST request with `session_id` and `message`
- **THEN** system forwards request to backend with all parameters
- **AND** returns backend response unchanged

#### Scenario: Stream mode enabled
- **WHEN** client sends POST request with `stream: true`
- **THEN** system returns SSE stream with `Content-Type: text/event-stream`
- **AND** proxies all SSE events from backend (`start`, `content`, `done`, `error`)

#### Scenario: Send attachments with message
- **WHEN** client sends POST request with `attachments` array containing `attachment_id` and `text_content`
- **THEN** system forwards attachments to backend for processing
- **AND** returns response with optional `attachment_analysis` data

#### Scenario: Unauthorized access
- **WHEN** client sends request without valid authentication
- **THEN** system returns HTTP 401 Unauthorized error

### Requirement: Legal Chat Session State
The system SHALL manage conversation state based on backend `next_step` values.

#### Scenario: Greeting step
- **WHEN** backend returns `next_step: "greeting"`
- **THEN** system displays welcome message from `data.message`
- **AND** enables user input for initial case description

#### Scenario: Consulting step with streaming
- **WHEN** backend returns `next_step: "consulting"` in stream mode
- **THEN** system displays AI response character by character
- **AND** shows consultation progress (`consultation_count/max_consultations`)

#### Scenario: Document path selection step
- **WHEN** backend returns `next_step: "select_document_path"`
- **THEN** system displays `legal_analysis` text
- **AND** shows `document_paths` as selectable options
- **AND** highlights `recommended_path` if provided

#### Scenario: Question asking step
- **WHEN** backend returns `next_step: "ask_question"`
- **THEN** system displays question from `data.question`
- **AND** shows progress indicator (`data.progress.current/total`)
- **AND** displays `attachment_hint` if present

#### Scenario: Completed step
- **WHEN** backend returns `next_step: "completed"`
- **THEN** system displays generated document content
- **AND** provides download option via `download_url`

### Requirement: Legal Chat Error Handling
The system SHALL handle API errors gracefully.

#### Scenario: Backend error response
- **WHEN** backend returns non-200 status code
- **THEN** system displays user-friendly error message
- **AND** allows user to retry the operation

#### Scenario: Network failure
- **WHEN** network request fails
- **THEN** system displays connection error message
- **AND** preserves user input for retry

#### Scenario: Stream interruption
- **WHEN** SSE stream is interrupted
- **THEN** system marks current message as failed
- **AND** allows user to retry from last successful state
