## ADDED Requirements

### Requirement: Extended File Type Support
The system SHALL support uploading additional file types beyond the current JPEG/PNG images.

#### Scenario: Upload PDF document
- **WHEN** user uploads a PDF file under 10MB
- **THEN** system accepts and stores the file
- **AND** returns `url`, `pathname`, `contentType`, and `fileId`

#### Scenario: Upload image files
- **WHEN** user uploads JPEG, PNG, GIF, or WebP image under 10MB
- **THEN** system accepts and stores the file
- **AND** returns file metadata including `fileId`

#### Scenario: Upload audio file
- **WHEN** user uploads WebM, WAV, MP3, or M4A audio file under 10MB
- **THEN** system accepts and stores the file
- **AND** returns file metadata for subsequent transcription

#### Scenario: Reject oversized file
- **WHEN** user uploads file larger than 10MB
- **THEN** system returns HTTP 400 error
- **AND** provides message "File size should be less than 10MB"

#### Scenario: Reject unsupported file type
- **WHEN** user uploads file with unsupported MIME type
- **THEN** system returns HTTP 400 error
- **AND** lists supported file types in error message

### Requirement: Attachment Preview
The system SHALL display appropriate previews for uploaded attachments.

#### Scenario: Preview image attachment
- **WHEN** user uploads an image file
- **THEN** system displays thumbnail preview
- **AND** allows click to view full size
- **AND** shows remove button

#### Scenario: Preview document attachment
- **WHEN** user uploads a PDF or document file
- **THEN** system displays file icon based on type
- **AND** shows file name and size
- **AND** shows remove button

#### Scenario: Preview audio attachment
- **WHEN** user uploads an audio file
- **THEN** system displays audio waveform or icon
- **AND** shows duration if available
- **AND** shows remove button

### Requirement: Attachment Upload Status
The system SHALL indicate upload progress and status for attachments.

#### Scenario: Show uploading state
- **WHEN** file upload is in progress
- **THEN** system displays loading spinner on attachment preview
- **AND** disables send button

#### Scenario: Show upload success
- **WHEN** file upload completes successfully
- **THEN** system removes loading spinner
- **AND** enables send button

#### Scenario: Show upload error
- **WHEN** file upload fails
- **THEN** system displays error indicator on attachment
- **AND** allows user to remove or retry
