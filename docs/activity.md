```mermaid
flowchart TD
    A[Open Calculator] --> B[Enter deck size N]
    B --> C[Enter copies K]
    C --> D[Enter cards drawn n]
    D --> E[Enter successes k]
    E --> F{Valid numbers?}
    F -->|No| G[Show error]
    G --> B
    F -->|Yes| H[Call hypergeometric]
    H --> I[Compute P at least k]
    I --> J[Show probability + graph]
    J --> K[Try again?]
