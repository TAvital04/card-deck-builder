### 3. Sequence Diagram — `docs/sequence.md`  
(Example: user logs in and views decks)

```markdown
# Sequence Diagram – Login & View Decks

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant DB

    User->>Frontend: Enter email + password
    Frontend->>API: POST /api/auth/login
    API->>DB: Find user by email
    DB-->>API: User document
    API->>API: Compare password hash
    API-->>Frontend: JWT + user info
    Frontend->>Frontend: Store JWT
    User->>Frontend: Go to Decks page
    Frontend->>API: GET /api/decks (Bearer JWT)
    API->>API: Verify JWT
    API->>DB: Find decks by userId
    DB-->>API: Deck list
    API-->>Frontend: JSON decks
    Frontend-->>User: Display deck cards
