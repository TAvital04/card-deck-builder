```mermaid
flowchart TD
    A[User opens Probability Calculator] --> B[Enter deck size N]
    B --> C[Enter copies of target card K]
    C --> D[Enter cards drawn n]
    D --> E[Enter desired successes k]
    E --> F{Valid numbers?}
    F -->|No| G[Show error]
    G --> B
    F -->|Yes| H[Call hypergeometric function]
    H --> I[Compute P(X ≥ k)]
    I --> J[Display probability + bar graph]
    J --> K[User can try another calculation]
