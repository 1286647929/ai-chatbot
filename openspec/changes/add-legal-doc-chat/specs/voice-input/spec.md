## ADDED Requirements

### Requirement: Voice Recording
The system SHALL allow users to record voice messages using device microphone.

#### Scenario: Request microphone permission
- **WHEN** user first attempts to use voice input
- **THEN** system requests microphone permission from browser
- **AND** displays permission prompt to user

#### Scenario: Permission granted
- **WHEN** user grants microphone permission
- **THEN** system enables voice recording functionality
- **AND** shows voice input button as active

#### Scenario: Permission denied
- **WHEN** user denies microphone permission
- **THEN** system displays message explaining voice feature requires permission
- **AND** hides or disables voice input button

#### Scenario: Start recording on desktop
- **WHEN** user clicks voice input button on desktop
- **THEN** system starts recording audio
- **AND** displays recording indicator with duration timer
- **AND** shows stop button

#### Scenario: Start recording on mobile (push-to-talk)
- **WHEN** user touches and holds voice input button on mobile
- **THEN** system starts recording audio
- **AND** displays recording indicator with duration timer
- **AND** shows "Release to send, swipe up to cancel" hint

#### Scenario: Stop recording and send
- **WHEN** user stops recording (click stop on desktop, release on mobile)
- **AND** recording duration is at least 1 second
- **THEN** system stops recording
- **AND** uploads audio file
- **AND** initiates transcription

#### Scenario: Cancel recording by swipe
- **WHEN** user swipes up while holding record button on mobile
- **THEN** system cancels recording
- **AND** discards recorded audio
- **AND** displays "Recording cancelled" message

#### Scenario: Recording too short
- **WHEN** user stops recording before 1 second
- **THEN** system discards the recording
- **AND** displays "Recording too short" message

#### Scenario: Maximum recording duration
- **WHEN** recording reaches 60 seconds
- **THEN** system automatically stops recording
- **AND** proceeds with upload and transcription

### Requirement: Voice Message Display
The system SHALL display voice messages with playback controls.

#### Scenario: Display voice message
- **WHEN** voice message is displayed in chat
- **THEN** system shows play button
- **AND** shows duration indicator
- **AND** shows transcription text if available

#### Scenario: Play voice message
- **WHEN** user clicks play on voice message
- **THEN** system plays the audio
- **AND** shows progress indicator
- **AND** changes play button to pause button

#### Scenario: Pause voice message
- **WHEN** user clicks pause while audio is playing
- **THEN** system pauses playback
- **AND** preserves playback position
- **AND** changes pause button to play button

#### Scenario: Toggle transcription
- **WHEN** user clicks to show/hide transcription
- **THEN** system toggles visibility of transcribed text
