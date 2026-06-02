# Chop First — UML Diagrams

## 1. Structural Diagrams

### 1.1 Class Diagram — Core Domain Model

```mermaid
classDiagram
    class User {
        +UUID userId
        +String phoneNumber
        +String displayName
        +UserTier tier
        +AccountStatus status
        +Int cleanSettlementCycles
        +Float outstandingBalanceNGN
        +String kindredWalletAddress
        +DateTime createdAt
        +makeDownPayment(amount) Transaction
        +clearBalance() void
        +proceedTier() void
        +freezeAccount() void
    }

    class UserTier {
        <<enumeration>>
        UNVERIFIED
        VERIFIED
        COMMUNITY
    }

    class AccountStatus {
        <<enumeration>>
        ACTIVE
        FROZEN
        SUSPENDED
    }

    class Merchant {
        +UUID merchantId
        +String businessName
        +String location
        +Boolean isActive
        +List~MenuItem~ menu
        +Float totalPrepaidTickets
        +acceptOrder(orderId) void
        +markTaskComplete(taskId) void
        +updateMenu() void
    }

    class MenuItem {
        +UUID itemId
        +String name
        +String description
        +Float priceNGN
        +Boolean available
    }

    class Order {
        +UUID orderId
        +UUID userId
        +UUID merchantId
        +List~OrderItem~ items
        +Float totalCostNGN
        +Float userDownPaymentNGN
        +Float outstandingBalanceNGN
        +Float processingFeeNGN
        +OrderStatus status
        +DateTime createdAt
        +calculateBalance() void
        +confirmOrder() void
    }

    class OrderStatus {
        <<enumeration>>
        PENDING_PAYMENT
        PREPAID
        COMPLETED
        DISPUTED
    }

    class OrderItem {
        +UUID itemId
        +UUID menuItemId
        +Int quantity
        +Float unitPrice
        +Float subtotal
    }

    class Transaction {
        +UUID transactionId
        +UUID orderId
        +UUID userId
        +UUID merchantId
        +Float amountNGN
        +TransactionType type
        +TransactionStatus status
        +DateTime timestamp
    }

    class TransactionType {
        <<enumeration>>
        DOWN_PAYMENT
        SUBSIDY_SETTLEMENT
        TASK_CREDIT
        SYSTEM_FEE
    }

    class TransactionStatus {
        <<enumeration>>
        PENDING
        COMPLETED
        FAILED
        REFUNDED
    }

    class Ledger {
        +UUID ledgerId
        +UUID userId
        +Float fiatBalanceNGN
        +String cryptoWalletAddress
        +Float kindTokenBalance
        +DateTime lastUpdated
        +debit(amount) void
        +credit(amount) void
        +syncKindredWallet() void
    }

    class Task {
        +UUID taskId
        +String title
        +String description
        +TaskCategory category
        +Float creditValueNGN
        +UUID assignedUserId
        +UUID assignedMerchantId
        +TaskStatus status
        +DateTime createdAt
        +DateTime completedAt
    }

    class TaskCategory {
        <<enumeration>>
        PLATFORM
        MERCHANT
        COMMUNITY
    }

    class TaskStatus {
        <<enumeration>>
        OPEN
        ASSIGNED
        COMPLETED_PENDING_VERIFICATION
        VERIFIED
        CANCELLED
    }

    class AdminDashboard {
        +Int activeUsers
        +Int frozenUsers
        +Float totalSubsidyDispersed
        +Float defaultRate
        +List~Transaction~ recentTransactions
        +generateReport() Report
        +manageSystemFreeze() void
    }

    class MerchantDashboard {
        +Int prepaidTickets
        +Float totalRevenue
        +List~Order~ todaysOrders
        +List~Task~ pendingTasks
        +validateTaskCompletion(taskId) void
    }

    class FreezeGuardrail {
        +Int gracePeriodDays
        +Float maxOutstandingNGN
        +executeFreezeCheck(userId) Boolean
        +triggerFreeze(userId) void
        +liftFreeze(userId) void
    }

    class DynamicTierLimits {
        +UserTier tier
        +Float maxSubsidyNGN
        +Int settlementWindowDays
        +getLimitsForTier(tier) Limits
    }

    User --> UserTier
    User --> AccountStatus
    User "1" --> "*" Order
    User "1" --> "1" Ledger
    User "1" --> "*" Task
    Order "*" --> "1" Merchant
    Order "*" --> "*" OrderItem
    Order "1" --> "*" Transaction
    Order --> OrderStatus
    OrderItem --> MenuItem
    Merchant "1" --> "*" MenuItem
    Merchant "1" --> "1" MerchantDashboard
    Merchant "*" --> "*" Task
    Task --> TaskCategory
    Task --> TaskStatus
    FreezeGuardrail "1" --> "*" User
    DynamicTierLimits --> UserTier
    AdminDashboard --> User
    AdminDashboard --> Transaction
    AdminDashboard --> FreezeGuardrail
    Transaction --> TransactionType
    Transaction --> TransactionStatus
```

### 1.2 Component Diagram — System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Mobile-First Web UI<br/>React SPA]
    end

    subgraph "API Gateway Layer"
        GW[API Gateway<br/>Rate Limiter & Auth]
    end

    subgraph "Core Application Layer"
        CE["'How Much You Get'<br/>Checkout Engine"]
        PM[Payment Module<br/>NGN Fiat Gateway]
        TM[Task Marketplace<br/>Analog PoW Engine]
        FM[Freeze Guardrail<br/>Microservice]
        UM[User Management<br/>Tier & Status]
        LDG[Ledger Service<br/>Fiat + Crypto Mapping]
    end

    subgraph "External Integrations"
        PS[Payment Service<br/>NGN Processor]
        KW[KINDRED Wallet<br/>Blockchain Bridge]
        SMS[SMS Gateway<br/>Verification]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Users, Orders, Ledgers)]
        REDIS[(Redis<br/>Session & Cache)]
    end

    subgraph "Admin & Merchant"
        AD[Admin Dashboard]
        MD[Merchant Dashboard]
    end

    UI --> GW
    GW --> CE
    GW --> UM
    CE --> PM
    CE --> LDG
    CE --> FM
    TM --> LDG
    TM --> MD
    FM --> UM
    UM --> LDG
    PM --> PS
    LDG --> KW
    LDG --> DB
    UM --> REDIS
    AD --> UM
    AD --> FM
    AD --> LDG
    MD --> TM
    MD --> PS
    UI --> SMS
```

### 1.3 Deployment Diagram — Infrastructure Topology

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "CDN"
            CF[CloudFront / CDN]
        end

        subgraph "VPC"
            subgraph "Public Subnet"
                LB[Load Balancer<br/>NGINX / ALB]
            end

            subgraph "Private Subnet — App Tier"
                API1[Node.js API Server<br/>Instance 1]
                API2[Node.js API Server<br/>Instance 2]
                WS[WebSocket Server<br/>Real-time Orders]
            end

            subgraph "Private Subnet — Data Tier"
                DB_Master[(PostgreSQL<br/>Primary)]
                DB_Replica[(PostgreSQL<br/>Read Replica)]
                REDIS_Cache[(Redis<br/>Cache Cluster)]
            end

            subgraph "Private Subnet — Admin"
                ADMIN[Admin Dashboard<br/>Container]
                MERC[Merchant Dashboard<br/>Container]
            end
        end
    end

    subgraph "External Services"
        PAY[NGN Payment<br/>Processor]
        SMS_GW[SMS Gateway<br/>Provider]
        POLYGON[Polygon Network<br/>$KIND Smart Contracts]
        MONITOR[Monitoring<br/>Datadog / Sentry]
    end

    User[End User<br/>Mobile Browser] --> CF
    CF --> LB
    LB --> API1
    LB --> API2
    API1 --> WS
    API2 --> WS
    API1 --> DB_Master
    API2 --> DB_Master
    API1 --> DB_Replica
    API2 --> DB_Replica
    API1 --> REDIS_Cache
    API2 --> REDIS_Cache
    ADMIN --> DB_Master
    MERC --> DB_Master
    API1 --> PAY
    API2 --> PAY
    ADMIN --> PAY
    API1 --> SMS_GW
    API2 --> SMS_GW
    ADMIN --> POLYGON
    API1 --> POLYGON
    API2 --> POLYGON
    ADMIN --> MONITOR
    API1 --> MONITOR
```

### 1.4 Package / Module Diagram

```mermaid
graph TB
    subgraph "com.chopfirst"
        subgraph "domain"
            U[User]
            O[Order]
            M[Merchant]
            T[Transaction]
            L[Ledger]
            TK[Task]
            ML[MenuItem]
        end

        subgraph "service"
            CS[CheckoutService]
            PS[PaymentService]
            TS[TaskService]
            FS[FreezeService]
            US[UserService]
            LS[LedgerService]
        end

        subgraph "repository"
            UR[UserRepository]
            OR[OrderRepository]
            MR[MerchantRepository]
            TR[TransactionRepository]
            LR[LedgerRepository]
            TKR[TaskRepository]
        end

        subgraph "controller"
            CC[CheckoutController]
            UC[UserController]
            MC[MerchantController]
            TC[TaskController]
            AC[AdminController]
        end

        subgraph "dto"
            OrderDTO
            UserDTO
            PaymentDTO
            TaskDTO
            LedgerDTO
        end

        subgraph "config"
            AppConfig
            SecurityConfig
            PaymentGatewayConfig
            BlockchainConfig
        end

        subgraph "external"
            NGN_PAY[NGN Payment Gateway]
            KINDRED_WALLET[KINDRED Wallet<br/>Bridge]
            SMS_PROV[SMS Provider]
        end

        controller --> service
        service --> domain
        service --> repository
        service --> external
        controller --> dto
        repository --> domain
        config --> service
    end
```

---

## 2. Behavioural Diagrams

### 2.1 Use Case Diagram — Actors & Features

```mermaid
graph TB
    subgraph "Chop First System"
        UC1("Place Food Order<br/>(Partial Payment)")
        UC2("Make Down Payment")
        UC3("View Outstanding Balance")
        UC4("Clear Balance via Naira")
        UC5("Browse & Complete Tasks<br/>(Analog PoW)")
        UC6("Clear Balance via Task Credit")
        UC7("View Tier & Limits")
        UC8("Progress to Next Tier")

        UC9("Accept Prepaid Ticket")
        UC10("Manage Menu & Availability")
        UC11("Validate Community Tasks")

        UC12("View System Metrics")
        UC13("Manage Freeze Guardrails")
        UC14("Process Manual Credits")
        UC15("Generate Reports")

        UC16("Authenticate & Onboard")
        UC17("Link KINDRED Wallet")
    end

    User[End User / Seeker] --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC16
    User --> UC17

    Merchant[Restaurant / Vendor] --> UC9
    Merchant --> UC10
    Merchant --> UC11
    Merchant --> UC16

    Admin[Platform Administrator] --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16
```

### 2.2 Sequence Diagram — Place Order with Partial Payment

```mermaid
sequenceDiagram
    actor User
    participant UI as Mobile Web UI
    participant CE as Checkout Engine
    participant PS as Payment Service
    participant LDG as Ledger Service
    participant FG as Freeze Guardrail
    participant DB as Database
    participant M as Merchant

    User->>UI: Browse menu & select meal (₦2,500)
    UI->>UI: Display total
    User->>UI: Enter down payment (e.g. ₦1,500)
    UI->>CE: POST /checkout { userId, items, downPayment }

    CE->>FG: GET /freeze-status/{userId}
    FG-->>CE: status=ACTIVE

    CE->>CE: Calculate outstanding<br/>= total - downPayment + fee<br/>= 2500 - 1500 + 50 = ₦1,050

    CE->>LDG: GET /tier-limits/{userId}
    LDG-->>CE: tier=VERIFIED, maxSubsidy=₦3,000

    CE->>CE: Validate: ₦1,050 <= ₦3,000 ✅

    CE->>PS: POST /process-payment { amount: 1500, merchant }
    PS->>PS: Charge user's external payment method
    PS-->>CE: paymentId=TX123, status=COMPLETED

    CE->>PS: POST /process-payment { amount: 1050, to: merchant }
    PS->>PS: Charge Chop First subsidy pool
    PS-->>CE: paymentId=TX124, status=COMPLETED

    CE->>DB: INSERT order { userId, merchant, total, downPayment, outstanding, status=PREPAID }
    CE->>DB: INSERT transaction { TX123, TX124 }

    CE->>LDG: UPDATE ledger { userId, outstandingBalance += 1050 }

    CE-->>UI: Order confirmed! Tickets=2
    UI-->>User: ✅ Order placed. Pay ₦1,050 within 14 days.

    CE->>M: WebSocket: new prepaid ticket
    M-->>M: Print invoice: FULLY PAID
```

### 2.3 Sequence Diagram — Clear Balance via Analog PoW Task

```mermaid
sequenceDiagram
    actor User
    participant UI as Mobile Web UI
    participant TM as Task Marketplace
    participant MD as Merchant Dashboard
    participant AD as Admin Dashboard
    participant LDG as Ledger Service

    User->>UI: View outstanding balance (₦1,050)
    UI->>UI: Display "Clear via Tasks" option
    User->>UI: Tap "Clear via Tasks"
    UI->>TM: GET /tasks/available/{userId}
    TM-->>UI: [Task: Flyer distribution, Store cleanup, ...]

    User->>UI: Select "Flyer Distribution" (₦1,050 credit)
    UI->>TM: POST /tasks/assign { taskId, userId }
    TM-->>UI: Task assigned! Instructions follow.

    User->>User: Completes flyer distribution offline

    Note over MD: Merchant verifies completion
    MD->>TM: PUT /tasks/verify { taskId, status=VERIFIED }
    TM->>LDG: creditUserBalance { userId, amount: 1050 }
    LDG->>LDG: outstandingBalance -= 1050 → ₦0

    TM-->>UI: ✅ Balance cleared!
    UI-->>User: Outstanding: ₦0. Account in good standing.
```

### 2.4 Activity Diagram — Order & Settlement Flow

```mermaid
flowchart TB
    Start([User opens Chop First]) --> Browse[Browse menu from<br/>partnered vendors]
    Browse --> Select[Select meal items]
    Select --> Total[View total cost<br/>e.g. ₦2,500]
    Total --> Prompt["How much you get?"<br/>Enter down payment]
    Prompt --> Validate{Down payment<br/>≥ total?}

    Validate -->|Yes, full payment| Full[Process full payment<br/>No subsidy needed]
    Full --> Complete[Order prepaid & complete]

    Validate -->|No, partial| Calc[Calculate outstanding<br/>= total - downPayment + fee]
    Calc --> Limits{Check user tier<br/>& subsidy limits}

    Limits -->|Subsidy exceeds max tier limit| Deny[❌ Order denied<br/>Reduce items or pay more]
    Deny --> Prompt

    Limits -->|Within limits| CheckFreeze{Account status?}

    CheckFreeze -->|FROZEN| Block[❌ Order blocked<br/>Clear balance first]
    Block --> End1([End])

    CheckFreeze -->|ACTIVE| Process[Process dual payment:<br/>1. Charge user down payment<br/>2. Subsidize remainder]
    Process --> Confirm[✅ Order prepaid<br/>Print merchant ticket]
    Confirm --> Remind[Reminder: Pay ₦X within 14 days]

    Remind --> Wait{User action<br/>within 14 days?}

    Wait -->|Pay Naira| PayFull[User pays full outstanding]
    PayFull --> Settle[Settlement complete<br/>Clean cycle +1]

    Wait -->|Complete tasks| BrowseTask[Browse task marketplace]
    BrowseTask --> Assign[Assign & complete<br/>analog PoW task]
    Assign --> MerchantVer[Merchant verifies<br/>task completion]
    MerchantVer --> Credit[Manual ledger credit]
    Credit --> Settle

    Wait -->|No action| Freeze[⛔ Freeze Guardrail triggered]
    Freeze --> Inactive[Account set to INACTIVE<br/>New orders blocked]
    Inactive --> Eventually[User eventually pays<br/>or completes tasks]
    Eventually --> Reactivate[Account reactivated<br/>Cycle preserved]
    Reactivate --> Settle

    Settle --> TierCheck{Clean cycles<br/>≥ threshold?}
    TierCheck -->|0-2| Tier1[Tier: UNVERIFIED<br/>Max subsidy: ₦1,000<br/>Window: 7 days]
    TierCheck -->|3-5| Tier2[Tier: VERIFIED<br/>Max subsidy: ₦3,000<br/>Window: 14 days]
    TierCheck -->|6+| Tier3[Tier: COMMUNITY<br/>Max subsidy: ₦7,500<br/>Window: 14 days]
    Tier1 --> End2([End])
    Tier2 --> End2
    Tier3 --> End2
```

### 2.5 State Machine Diagram — User Account Lifecycle

```mermaid
stateDiagram-v2
    [*] --> REGISTERED: User signs up

    REGISTERED --> ACTIVE: First down payment made
    REGISTERED --> FROZEN: Suspicious activity detected

    ACTIVE --> ACTIVE: Make partial payment / place order
    ACTIVE --> DELINQUENT: Outstanding balance overdue
    ACTIVE --> TIER_UP: Clean settlement threshold met
    ACTIVE --> ACTIVE: Clear balance on time

    DELINQUENT --> FROZEN: 14-day grace period expires
    DELINQUENT --> ACTIVE: Balance cleared before freeze
    DELINQUENT --> SUSPENDED: Repeated delinquency

    FROZEN --> ACTIVE: Outstanding balance cleared
    FROZEN --> SUSPENDED: Extended non-compliance

    TIER_UP --> ACTIVE: New limits applied<br/>(UNVERIFIED→VERIFIED<br/>or VERIFIED→COMMUNITY)

    SUSPENDED --> [*]: Permanent account closure

    note right of ACTIVE
        Tiers:
        UNVERIFIED: ₦1,000 max, 7 days
        VERIFIED: ₦3,000 max, 14 days
        COMMUNITY: ₦7,500 max, 14 days
    end note

    note right of FROZEN
        Hard technical freeze.
        No new orders.
        No punitive interest.
        Exit: clear full balance.
    end note
```

### 2.6 Sequence Diagram — Freeze Guardrail Trigger & Recovery

```mermaid
sequenceDiagram
    actor User
    participant FG as Freeze Guardrail<br/>Cron Job
    participant DB as Database
    participant LDG as Ledger Service
    participant UI as Mobile Web UI
    participant TM as Task Marketplace

    FG->>FG: Daily scan: users with<br/>overdue > 14 days
    FG->>DB: SELECT users WHERE<br/>outstanding > 0 AND lastPayment + 14d < NOW()
    DB-->>FG: [user_A, user_C, ...]

    loop For each delinquent user
        FG->>LDG: POST /freeze-user/{userId}
        LDG->>LDG: Set status = FROZEN
        LDG-->>FG: Done
    end

    Note over User,TM: User attempts to place new order
    User->>UI: Browse menu & try to checkout
    UI->>LDG: GET /user-status/{userId}
    LDG-->>UI: status=FROZEN, outstanding=₦2,100
    UI-->>User: ⛔ Account frozen.<br/>Clear ₦2,100 to reactivate.

    User->>UI: View my balance
    UI-->>User: Outstanding: ₦2,100<br/>Due: OVERDUE<br/>[Clear with Naira] [Clear with Tasks]

    User->>UI: Tap "Clear with Tasks"
    UI->>TM: GET /tasks/available
    TM-->>UI: [Task A: ₦1,050], [Task B: ₦1,050]

    User->>User: Complete Task A & B

    TM->>LDG: creditUserBalance { userId, amount: 2100 }
    LDG->>LDG: outstandingBalance = 0
    LDG->>LDG: status = ACTIVE

    User->>UI: Try ordering again
    UI->>LDG: GET /user-status/{userId}
    LDG-->>UI: status=ACTIVE
    UI-->>User: ✅ Account reactivated!<br/>Place your order.
```

### 2.7 Communication Diagram — Order Processing (Object Interaction)

```mermaid
flowchart LR
    subgraph Actors
        U([User])
        M([Merchant])
    end

    subgraph System Objects
        UI[":WebUI"]
        CE[":CheckoutEngine"]
        PS[":PaymentService"]
        LDG[":LedgerService"]
        FG[":FreezeGuardrail"]
        DB[":Database"]
        TM[":TaskMarketplace"]
    end

    U -- "1: browse & select" --> UI
    UI -- "2: submit down payment" --> CE
    CE -- "3: check status" --> FG
    CE -- "4: validate limits" --> LDG
    CE -- "5: process payments" --> PS
    CE -- "6: persist order" --> DB
    CE -- "7: notify merchant" --> M
    CE -- "8: update ledger" --> LDG
    PS -- "9: charge subsidy pool" --> DB
    M -- "10: verify task" --> TM
    TM -- "11: credit ledger" --> LDG
```

### 2.8 Use Case Diagram — Merchant & Admin Operations

```mermaid
graph TB
    subgraph "Chop First — Merchant"
        M_Incoming[View Incoming<br/>Prepaid Tickets]
        M_Menu[Toggle Menu<br/>Item Availability]
        M_History[View Order<br/>History & Revenue]
        M_Tasks[View & Verify<br/>Community Tasks]
        M_Profile[Manage<br/>Business Profile]
    end

    subgraph "Chop First — Admin"
        A_Metrics[View Platform<br/>Metrics Dashboard]
        A_Users[Manage Users<br/>& Account Status]
        A_Freeze[Manual Freeze /<br/>Unfreeze Override]
        A_Tiers[Adjust Tier<br/>Limit Configurations]
        A_Tasks[Create / Remove<br/>Platform Tasks]
        A_Credit[Process Manual<br/>Ledger Credits]
        A_Reports[Generate<br/>Settlement Reports]
        A_Integrate[Manage KINDRED<br/>Wallet Integration]
    end

    Merchant[<b>Merchant</b><br/>Vendor/Restaurant] --> M_Incoming
    Merchant --> M_Menu
    Merchant --> M_History
    Merchant --> M_Tasks
    Merchant --> M_Profile

    Admin[<b>Admin</b><br/>Platform Operator] --> A_Metrics
    Admin --> A_Users
    Admin --> A_Freeze
    Admin --> A_Tiers
    Admin --> A_Tasks
    Admin --> A_Credit
    Admin --> A_Reports
    Admin --> A_Integrate
```

---

## 3. Legend

| Icon/Notation | Meaning |
|---|---|
| `-->` | Dependency / Association |
| `-->>` | Async return / Callback |
| `--*` | Composition |
| `--o` | Aggregation |
| `<<enumeration>>` | Enum type |
| `[*]` | Initial / Final state |
| `@` | Actor (external entity) |
