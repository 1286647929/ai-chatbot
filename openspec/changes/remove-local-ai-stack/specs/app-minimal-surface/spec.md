## ADDED Requirements

### Requirement: Minimal App Surface For Legal
The application MUST provide a minimal surface area focused on the Legal assistant UI and its backend integration.

#### Scenario: Legal remains available
- **WHEN** a user visits `/`
- **THEN** the Legal assistant UI is rendered
- **AND** Legal BFF routes required for SSE/chat/upload/download/cancel are available under the existing `app/(legal)/api/*` handlers.

#### Scenario: Auth remains available
- **WHEN** a user visits `/login` or `/register`
- **THEN** the existing Auth UI is rendered
- **AND** `/api/auth/*` routes continue to work without URL changes.

### Requirement: No Local AI Orchestration Stack
The application MUST NOT depend on a local AI orchestration stack for Legal chat behavior.

#### Scenario: No local AI modules
- **WHEN** the repository is built and typechecked
- **THEN** `lib/ai/**` is not required to exist
- **AND** Legal chat behavior is driven by the upstream Legal backend via BFF routes.

