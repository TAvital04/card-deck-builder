# Entity Relationship Diagram

```mermaid
erDiagram
    direction LR

    USER ||--o{ DECK : owns
    DECK ||--|{ CARD : contains

    USER {
        ObjectId _id PK
        string name
        string email UK
        string password
        boolean isVerified
        string verificationToken
        date verificationTokenExpire
        string resetPasswordToken
        date resetPasswordExpire
        date createdAt
        date updatedAt
    }

    DECK {
        ObjectId _id PK
        string name
        string game
        ObjectId user FK
        date createdAt
        date updatedAt
    }

    CARD {
        string name
        int count
        string category
        string role
        string notes
    }
