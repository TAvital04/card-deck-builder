# Use Case Diagram

```mermaid
graph TD
    User((User))
    Admin((Admin))

    UC1[Register / Login]
    UC2[Verify Email]
    UC3[Reset Password]
    UC4[Create / Edit Deck]
    UC5[View Deck List]
    UC6[Search Cards]
    UC7[Calculate Draw Probability]
    UC8[Simulate Opening Hand]
    UC9[Seed Demo Data]

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    Admin --> UC9
