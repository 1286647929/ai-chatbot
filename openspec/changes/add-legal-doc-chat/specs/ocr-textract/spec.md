## ADDED Requirements

### Requirement: OCR Text Extraction API
The system SHALL provide an API endpoint at `/api/textract` to extract text from uploaded files.

#### Scenario: Extract text from image
- **WHEN** client sends POST request with `fileId` for an image file
- **THEN** system calls backend OCR service
- **AND** returns extracted text content

#### Scenario: Extract text from PDF
- **WHEN** client sends POST request with `fileId` for a PDF document
- **THEN** system calls backend document extraction service
- **AND** returns extracted text content from all pages

#### Scenario: Transcribe audio file
- **WHEN** client sends POST request with `fileId` for an audio file
- **THEN** system calls backend ASR (speech-to-text) service
- **AND** returns transcribed text content

#### Scenario: Specify extraction scene
- **WHEN** client includes `scene` parameter in request
- **THEN** system passes scene identifier to backend
- **AND** backend may optimize extraction based on scene

#### Scenario: Handle extraction failure
- **WHEN** backend OCR/ASR service fails
- **THEN** system returns HTTP 400 error
- **AND** provides descriptive error message

#### Scenario: Handle empty result
- **WHEN** extraction succeeds but no text found
- **THEN** system returns empty string in `text` field
- **AND** HTTP status remains 200

### Requirement: Automatic OCR on Upload
The system SHALL automatically extract text from uploaded attachments in legal chat.

#### Scenario: Auto-extract on image upload
- **WHEN** user uploads image in legal chat
- **THEN** system uploads file first
- **THEN** system calls textract API with file ID
- **AND** stores extracted text for sending with message

#### Scenario: Auto-transcribe voice message
- **WHEN** user sends voice message in legal chat
- **THEN** system uploads audio file first
- **THEN** system calls textract API for transcription
- **AND** displays transcribed text with voice message

#### Scenario: Display extraction status
- **WHEN** OCR/transcription is in progress
- **THEN** system displays "Analyzing attachment..." indicator
- **AND** disables send button until complete

#### Scenario: Handle extraction error gracefully
- **WHEN** OCR/transcription fails
- **THEN** system allows sending message without extracted text
- **AND** displays warning that attachment could not be analyzed

### Requirement: Attachment Analysis Display
The system SHALL display attachment analysis results from backend.

#### Scenario: Show attachment type recognition
- **WHEN** backend returns `attachment_analysis` with `type` and `type_name`
- **THEN** system displays recognized document type (e.g., "劳动合同")
- **AND** shows confidence score if provided

#### Scenario: Show attachment summary
- **WHEN** backend returns `attachment_analysis` with `summary`
- **THEN** system displays brief summary of attachment content

#### Scenario: Show duplicate attachment warning
- **WHEN** backend returns `attachment_analysis` with `is_duplicate: true`
- **THEN** system displays warning message from `duplicate_message`
- **AND** allows user to proceed or remove attachment
