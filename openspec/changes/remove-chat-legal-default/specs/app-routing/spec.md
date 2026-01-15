## ADDED Requirements

### Requirement: Legal default route
The system MUST present the Legal experience as the default entrypoint.

#### Scenario: Visit root route
- **WHEN** a user visits `/`
- **THEN** the system SHALL navigate the user into the Legal experience
- **AND** the user can access the Legal UI without visiting chat pages

#### Scenario: Visit legal route
- **WHEN** a user visits `/legal`
- **THEN** the system SHALL redirect the user to `/`

### Requirement: Authentication capability is preserved
The system MUST continue to provide authentication UI and auth API routes.

#### Scenario: Login and register pages exist
- **WHEN** a user visits `/login` or `/register`
- **THEN** the system SHALL render the authentication UI

#### Scenario: Auth API exists
- **WHEN** a client calls `/api/auth/session`
- **THEN** the system SHALL respond according to Auth.js/NextAuth behavior

### Requirement: Legal is publicly accessible
The system MUST allow the Legal UI and Legal APIs to be used without requiring a user session.

#### Scenario: Legal page does not require login
- **WHEN** a user visits `/`
- **THEN** the system SHALL render the Legal UI
- **AND** MUST NOT redirect the user to `/login`

#### Scenario: Legal APIs do not require authentication
- **WHEN** a client calls `/api/legal/interact`, `/api/textract`, or `/api/textract/oss-info`
- **THEN** the system SHALL process or proxy the request
- **AND** MUST NOT return HTTP 401 due to missing session

### Requirement: No general chat surface
The system MUST NOT expose the general chat UI or chat-related APIs.

#### Scenario: Chat pages removed
- **WHEN** a user visits `/chat/<id>`
- **THEN** the system SHALL respond with HTTP 404

#### Scenario: Chat APIs removed
- **WHEN** a client calls `/api/chat`, `/api/history`, `/api/vote`, `/api/document`, or `/api/suggestions`
- **THEN** the system SHALL respond with HTTP 404
