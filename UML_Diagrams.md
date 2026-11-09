# Chop First — UML Diagrams (Production)

## 1. Structural Diagrams

### 1.1 Class Diagram — Core Domain Model

```mermaid
classDiagram
    class User {
        +String id (UUID)
        +String phone
        +String email
        +String name
        +UserTier tier
        +AccountStatus status
        +Int clean_cycles
        +Float outstanding_balance
        +Float total_subsidized
        +String wallet_address
        +Float kind_balance
        +String password_hash
        +DateTime created_at
        +DateTime frozen_at
        +checkAndApplyFreeze() boolean
    }

    class UserTier {
        <<enumeration>>
        UNVERIFIED (0–9 cycles)
        VERIFIED (10–19 cycles)
        TRUSTED (20–29 cycles)
        ADVANCED (30–39 cycles)
        COMMUNITY (40+ cycles)
        ADMIN
    }

    class AccountStatus {
        <<enumeration>>
        ACTIVE
        FROZEN
        SUSPENDED
    }

    class Tier {
        +String name (PK)
        +Int min_cycles
        +Int max_cycles
        +Float per_order
        +Float total_cap
        +Int window_days
    }

    class Merchant {
        +String id (UUID)
        +String name
        +String location
        +Boolean is_active
        +Int total_prepaid
        +Float total_revenue
        +DateTime created_at
    }

    class MenuItem {
        +String id (UUID)
        +String merchant_id
        +String name
        +String description
        +Float price
        +Boolean available
        +String category
        +String image
    }

    class Order {
        +String id (UUID)
        +String user_id
        +String merchant_id
        +Float total_cost
        +Float down_payment
        +Float outstanding
        +Float outstanding_naira
        +String wallet_address
        +Float fee
        +OrderStatus status
        +DateTime created_at
        +DateTime due_at
    }

    class OrderStatus {
        <<enumeration>>
        PREPAID
        COMPLETED
        DISPUTED
    }

    class OrderItem {
        +String id (UUID)
        +String order_id
        +String menu_item_id
        +Int quantity
        +Float unit_price
    }

    class Transaction {
        +String id (UUID)
        +String order_id
        +String user_id
        +String merchant_id
        +Float amount
        +TransactionType type
        +TransactionStatus status
        +DateTime created_at
    }

    class TransactionType {
        <<enumeration>>
        DOWN_PAYMENT
        SUBSIDY
        SETTLEMENT
        TASK_CREDIT
        FEE
    }

    class TransactionStatus {
        <<enumeration>>
        PENDING
        COMPLETED
        FAILED
    }

    class Task {
        +String id (UUID)
        +String title
        +String description
        +TaskCategory category
        +Float credit_value
        +String assigned_to (user ID)
        +String merchant_id
        +TaskStatus status
        +DateTime created_at
        +DateTime completed_at
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
        COMPLETED_PENDING
        VERIFIED
        CANCELLED
    }

    User --> UserTier
    User --> AccountStatus
    User "1" --> "*" Order
    User "1" --> "*" Task
    User "1" --> "*" Transaction
    Order "*" --> "1" Merchant
    Order "*" --> "*" OrderItem
    Order "1" --> "*" Transaction
    Order --> OrderStatus
    OrderItem --> MenuItem
    Merchant "1" --> "*" MenuItem
    Merchant "*" --> "*" Task
    Task --> TaskCategory
    Task --> TaskStatus
    Tier --> UserTier
    Transaction --> TransactionType
    Transaction --> TransactionStatus
```

### 1.2 Component Diagram — System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React SPA<br/>Tailwind CSS<br/>PWA-enabled]
    end

    subgraph "Vercel Platform"
        VercelEdge[Vercel Edge Network<br/>CDN + Routing]
        API[Express Serverless Function<br/>api/index.ts]
    end

    subgraph "Application Modules (Express)"
        Auth[JWT Auth Middleware<br/>signToken/authenticate]
        Validate[Zod Validation<br/>Middleware]
        Logger[Pino Structured<br/>Logger]
        CE["Checkout Engine<br/>'How Much You Get'"]
        TM[Task Marketplace<br/>Analog PoW Engine]
        FM[Freeze Guardrail<br/>checkAndApplyFreeze]
        UM[User Management<br/>Tier Progression]
    end

    subgraph "Data Layer"
        DB[(Supabase PostgreSQL<br/>pgBouncer pooler)]
    end

    subgraph "Admin & Merchant"
        AD[Admin Dashboard<br/>Metrics, Freeze, Credit]
        MD[Merchant Dashboard<br/>Menu, Tasks, Orders]
    end

    UI --> VercelEdge
    VercelEdge --> API
    API --> Auth
    API --> Validate
    API --> Logger
    API --> CE
    API --> TM
    API --> FM
    API --> UM
    CE --> DB
    TM --> DB
    FM --> DB
    UM --> DB
    AD --> API
    MD --> API
```

### 1.3 Deployment Diagram — Infrastructure Topology

```mermaid
graph TB
    subgraph "Production Environment (Vercel)"
        CF[Vercel CDN<br/>Global Edge Network]
        Vercel[Vercel Serverless<br/>Node.js 22.x]
        SPA[Static SPA<br/>frontend/dist]
    end

    subgraph "Supabase (Managed PostgreSQL)"
        PGB[pgBouncer Pooler<br/>port 6543]
        PG[(PostgreSQL 15<br/>IPv4-compatible)]
    end

    subgraph "External Services"
        DNS[DNS: Vercel<br/>Custom Domain]
        ENV[Vercel Env Vars<br/>DATABASE_URL, JWT_SECRET]
    end

    User[End User<br/>Browser / PWA] --> CF
    CF --> SPA
    CF --> Vercel
    Vercel --> PGB
    PGB --> PG
    Vercel --> ENV
```

### 1.4 Module Diagram — Backend Source Structure

```mermaid
graph TB
    subgraph "backend/src"
        subgraph "middleware"
            AUTH[auth.ts<br/>JWT sign/verify]
            VAL[validate.ts<br/>Zod schemas]
        end

        subgraph "routes"
            USR[users.ts<br/>login / signup / me / pay]
            ORD[orders.ts<br/>create / list / pay]
            MER[merchants.ts<br/>list / detail / toggle]
            TSK[tasks.ts<br/>assign / complete / verify]
            ADM[admin.ts<br/>metrics / freeze / credit]
            PLAT[platform.ts<br/>tier limits / stats]
        end

        subgraph "core"
            DB[database.ts<br/>PG Pool / schema / init]
            HELP[helpers.ts<br/>stripPassword / freeze]
            LOG[logger.ts<br/>Pino instance]
            SEED[seed.ts<br/>demo data]
        end

        INDEX[index.ts<br/>Express app assembly]
    end

    subgraph "api"
        VERCEL[api/index.ts<br/>Vercel entrypoint]
    end

    subgraph "frontend/src"
        subgraph "pages"
            LAND[Landing / Login / Signup]
            DASH[Dashboard / Profile / Approval]
            MENU[MenuPage / Checkout]
            TASKS[Tasks]
            ADASH[AdminDashboard]
            MDASH[MerchantDashboard]
            DLOGIN[DemoLogin]
        end
        CLIENT[api/client.ts<br/>HTTP + JWT wrapper]
        COMP[components/<br/>Layout / PaymentPortal]
        APP[App.tsx<br/>Router / Auth orchestration]
    end

    VERCEL --> INDEX
    INDEX --> DB
    INDEX --> LOG
    INDEX --> AUTH
    INDEX --> USR
    INDEX --> ORD
    INDEX --> MER
    INDEX --> TSK
    INDEX --> ADM
    INDEX --> PLAT
    USR --> AUTH
    USR --> VAL
    USR --> HELP
    ORD --> AUTH
    ORD --> VAL
    ORD --> HELP
    ADM --> VAL
    ADM --> HELP
    APP --> CLIENT
    CLIENT --> VERCEL
```

---

## 2. Behavioural Diagrams

### 2.1 Use Case Diagram — Actors & Features

```mermaid
graph TB
    subgraph "Chop First System"
        UC1("Sign Up<br/>(Phone/Email + Password)")
        UC2("Sign In<br/>(Credential + Password)")
        UC3("Browse Menu & Add to Cart")
        UC4("Place Subsidized Order<br/>'How Much You Get'")
        UC5("Make Full Payment<br/>(Skip Subsidy)")
        UC6("View Outstanding Balance<br/>& Cap Usage")
        UC7("Clear Balance via Naira")
        UC8("Browse & Complete Tasks<br/>(Analog PoW)")
        UC9("Progress to Next Tier")
        UC10("View Profile & Limits")
        UC11("Pay Specific Order")

        UC12("View Prepaid Tickets")
        UC13("Toggle Menu Item Availability")
        UC14("Verify Community Tasks")
        UC15("View Merchant Stats & Orders")

        UC16("View Platform Metrics")
        UC17("Freeze / Unfreeze Users")
        UC18("Process Manual Credits")
        UC19("View All Users")
    end

    User[End User / Seeker] --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11

    Merchant[Restaurant / Vendor] --> UC12
    Merchant --> UC13
    Merchant --> UC14
    Merchant --> UC15

    Admin[Platform Administrator] --> UC16
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
```

### 2.2 Sequence Diagram — Place Subsidized Order

```mermaid
sequenceDiagram
    actor User
    participant UI as React SPA
    participant API as Express API<br/>(Vercel)
    participant MID as Middleware<br/>Auth + Validate
    participant DB as PostgreSQL<br/>(Supabase)

    User->>UI: Browse menu & add items
    User->>UI: Tap "Proceed to Checkout"
    UI->>UI: Compute totals client-side
    User->>UI: Enter down payment (e.g. ₦1,500)
    User->>UI: Tap "Pay ₦1,500 — Start Order"
    UI->>UI: Show PaymentPortal mock card
    User->>UI: Tap "Pay" in portal
    UI->>UI: Processing animation (1.5s)

    UI->>API: POST /api/orders<br/>Authorization: Bearer &lt;JWT&gt;<br/>{ merchantId, items, downPayment }

    API->>MID: authenticate middleware
    MID->>MID: Verify JWT → req.user

    API->>MID: validate(schemas.createOrder)
    MID->>MID: Zod parse body

    API->>DB: SELECT user WHERE id = $1
    DB-->>API: user data

    API->>API: checkAndApplyFreeze(user.id)<br/>Any PREPAID order past due with balance?

    API->>DB: SELECT merchant WHERE id = $1 AND is_active = 1
    DB-->>API: merchant

    API->>DB: SELECT menu_items for each cart item
    DB-->>API: menu item data

    API->>API: Compute totalCost = Σ(price × qty)

    alt Full payment (downPayment = totalCost)
        API->>DB: INSERT order (COMPLETED, outstanding=0, due=now+window_days)
        API->>DB: INSERT transactions (DOWN_PAYMENT)
        API-->>UI: { status: COMPLETED, fullPayment: true }
    else Subsidized payment
        API->>API: subsidy = total - down<br/>fee = 10% × subsidy<br/>outstanding = subsidy + fee
        API->>DB: SELECT * FROM tiers WHERE UPPER(name) = UPPER(user.tier)
        DB-->>API: { per_order, total_cap, window_days }
        API->>API: Validate: subsidy ≤ per_order &&<br/>(currentOutstanding + outstanding) ≤ total_cap
        alt Limit exceeded
            API-->>UI: 400 error with<br/>required down payment
        else Within caps
            API->>DB: SELECT SUM(outstanding_balance) FROM users
            DB-->>API: current exposure
            alt Exposure + subsidy > 85% × seedPool
                API-->>UI: 503 error: seed-pool reserve reached
            else Reserve available
                API->>DB: INSERT order (PREPAID, outstanding_naira, wallet_address,<br/>due = now + window_days)
                API->>DB: INSERT order_items × N
                API->>DB: INSERT transactions (DOWN_PAYMENT, SUBSIDY, FEE)
                API->>DB: UPDATE user SET outstanding_balance += outstanding
                API->>DB: UPDATE merchant SET total_prepaid++, revenue += totalCost
                API-->>UI: { id, totalCost, downPayment, outstanding, fee, dueAt }
            end
        end
    end

    UI->>UI: Show success screen
    UI->>API: GET /api/users/me (refresh user state)
    API-->>UI: Updated user (debt, cycles, tier)
```

### 2.3 Sequence Diagram — Clear Balance via Analog PoW Task

```mermaid
sequenceDiagram
    actor User
    participant UI as React SPA
    participant API as Express API
    participant DB as PostgreSQL

    User->>UI: View balance (₦1,050 outstanding)
    UI->>API: GET /api/tasks<br/>Authorization: Bearer &lt;JWT&gt;
    API->>DB: SELECT tasks WHERE status='OPEN'<br/>OR assigned_to = userId
    DB-->>API: [Task A: ₦1,050, Task B: ₦700, ...]
    API-->>UI: tasks array

    User->>UI: Tap "Assign" on Task A
    UI->>API: POST /api/tasks/:id/assign
    API->>DB: UPDATE tasks SET assigned_to, status='ASSIGNED'
    DB-->>API: updated task
    API-->>UI: { status: ASSIGNED }

    User->>User: Complete task offline

    User->>UI: Tap "Mark Complete"
    UI->>API: POST /api/tasks/:id/complete
    API->>DB: UPDATE tasks SET status='COMPLETED_PENDING'
    API-->>UI: { message: 'Submitted for verification' }

    Note over Merchant: Merchant verifies in their dashboard
    Merchant->>API: POST /api/tasks/:id/verify
    API->>DB: UPDATE tasks SET status='VERIFIED'
    API->>API: applySettlement(userId, credit_value, 'TASK_CREDIT')<br/>Credit capped at outstanding; settle oldest PREPAID orders
    API->>DB: INSERT transaction (TASK_CREDIT)
    API->>API: Award clean cycle only if order settled by due_at
    API->>API: syncUserTier(clean_cycles)
    API->>API: Auto-unfreeze only when outstanding_balance <= 0
    API-->>Merchant: { message: 'Verified, balance credited' }

    User->>UI: Refresh dashboard
    UI->>API: GET /api/users/me
    API-->>UI: Updated user (outstanding: ₦0)
```

### 2.4 Activity Diagram — Order & Settlement Flow

```mermaid
flowchart TB
    Start([User opens Chop First]) --> Browse[Browse menu from<br/>partnered vendors]
    Browse --> Select[Select meal items]
    Select --> Total[View total cost<br/>e.g. ₦4,000]
    Total --> Prompt["How much you get?"<br/>Enter down payment]
    Prompt --> CheckFreeze{Account frozen?<br/>overdue balance?}

    CheckFreeze -->|FROZEN| Block[❌ Order blocked<br/>Clear balance first]
    Block --> End1([End])

    CheckFreeze -->|ACTIVE| Validate{Down payment<br/>≥ total?}

    Validate -->|Yes, full payment| Full[Process full payment<br/>No subsidy, no fee]
    Full --> Complete[✅ Order completed]

    Validate -->|No, partial| Calc[subsidy = total - down<br/>fee = 10% of subsidy<br/>outstanding = subsidy + fee]
    Calc --> Limits{Subsidy ≤ per_order?}

    Limits -->|No| Deny[❌ Order denied<br/>Increase down payment]
    Deny --> Prompt

    Limits -->|Yes| DebtCheck{Current outstanding + outstanding<br/>≤ total_cap?}
    DebtCheck -->|No| Deny2[❌ Would exceed total cap<br/>Increase down payment]
    Deny2 --> Prompt

    DebtCheck -->|Yes| PoolCheck{Exposure + subsidy<br/>≤ 85% seed pool?}
    PoolCheck -->|No| Deny4[❌ Seed pool reserve reached<br/>Try later]
    Deny4 --> End1

    PoolCheck -->|Yes| Insert[INSERT order (PREPAID)<br/>INSERT transactions<br/>UPDATE user debt]
    Insert --> Confirm[✅ Order placed]
    Confirm --> Remind[Reminder: Pay ₦X within N days]

    Remind --> Wait{User action<br/>within window?}

    Wait -->|Pay Naira| PayFull[User pays full outstanding]
    PayFull --> Settle[Settlement complete<br/>Clean cycle +1]

    Wait -->|Complete tasks| BrowseTask[Browse task marketplace]
    BrowseTask --> Assign[Assign & complete<br/>analog PoW task]
    Assign --> MerchantVer[Merchant verifies<br/>task completion]
    MerchantVer --> Credit[Task credited to balance]
    Credit --> Settle

    Wait -->|No action / due date passed| Freeze[⛔ Freeze Guardrail triggered]
    Freeze --> Inactive[Account set to FROZEN<br/>New orders blocked]
    Inactive --> Eventually[User eventually pays<br/>or completes tasks]
    Eventually --> Reactivate[Account reactivated<br/>on full balance clear]
    Reactivate --> Settle

    Settle --> TierCheck{clean_cycles<br/>range?}
    TierCheck -->|0–9| Tier0[Tier: UNVERIFIED<br/>Per-order: ₦2,500<br/>Total cap: ₦5,000<br/>Window: 7 days]
    TierCheck -->|10–19| Tier1[Tier: VERIFIED<br/>Per-order: ₦10,000<br/>Total cap: ₦30,000<br/>Window: 14 days]
    TierCheck -->|20–29| Tier2[Tier: TRUSTED<br/>Per-order: ₦15,000<br/>Total cap: ₦50,000<br/>Window: 14 days]
    TierCheck -->|30–39| Tier3[Tier: ADVANCED<br/>Per-order: ₦20,000<br/>Total cap: ₦100,000<br/>Window: 14 days]
    TierCheck -->|40+| Tier4[Tier: COMMUNITY<br/>Per-order: ₦25,000<br/>Total cap: ₦150,000<br/>Window: 14 days]
    Tier0 --> End2([End])
    Tier1 --> End2
    Tier2 --> End2
    Tier3 --> End2
    Tier4 --> End2
```

### 2.5 State Machine Diagram — User Account Lifecycle

```mermaid
stateDiagram-v2
    [*] --> SIGNED_UP: User registers

    SIGNED_UP --> ACTIVE: Approved (approval flow)
    SIGNED_UP --> FROZEN: Suspicious activity detected

    ACTIVE --> ACTIVE: Place order / make payment
    ACTIVE --> TIER_UP: Clean cycles ≥ threshold
    ACTIVE --> FROZEN: Overdue balance triggers freeze

    TIER_UP --> ACTIVE: New tier limits applied<br/>(UNVERIFIED→VERIFIED→TRUSTED→ADVANCED→COMMUNITY)

    FROZEN --> ACTIVE: Full balance cleared<br/>(via naira or tasks)

    note right of ACTIVE
        Tiers (clean cycles):
        UNVERIFIED: ₦2.5K per order, ₦5K cap, 7d (0–9)
        VERIFIED:   ₦10K per order, ₦30K cap, 14d (10–19)
        TRUSTED:    ₦15K per order, ₦50K cap, 14d (20–29)
        ADVANCED:   ₦20K per order, ₦100K cap, 14d (30–39)
        COMMUNITY:  ₦25K per order, ₦150K cap, 14d (40+)
        New users start at 0 clean_cycles
    end note

    note right of FROZEN
        Hard technical freeze.
        No new orders.
        No compounding interest; 10% fee at checkout.
        Exit: clear full balance.
        Auto-freeze when any PREPAID order
        passes its due date with a balance.
    end note
```

### 2.6 Sequence Diagram — Freeze Guardrail Trigger & Recovery

```mermaid
sequenceDiagram
    actor User
    participant API as Express API
    participant DB as PostgreSQL

    Note over User,API: Freeze check on order placement
    User->>API: POST /api/orders { items, downPayment }
    API->>API: checkAndApplyFreeze(user.id)
    API->>DB: SELECT SUM(outstanding) FROM orders<br/>WHERE status='PREPAID' AND outstanding > 0 AND due_at < NOW()
    DB-->>API: overdue balance (e.g. ₦3,300)
    API->>API: If overdue > 0 → freeze
    API->>DB: UPDATE users SET status='FROZEN', frozen_at=NOW()
    API-->>User: 403: Account frozen.<br/>Reason: settlement window passed

    Note over User,API: User sees frozen state
    User->>API: GET /api/users/me
    API-->>User: { status: 'FROZEN', outstanding_balance: 3300 }

    Note over User,API: Recovery via task completion
    User->>API: Complete tasks until balance cleared
    API->>API: applySettlement(..., 'TASK_CREDIT')<br/>caps credit at outstanding
    API->>API: checkAndApplyFreeze()<br/>unfreeze only when outstanding_balance <= 0
    API->>DB: UPDATE users SET status='ACTIVE'<br/>WHERE outstanding_balance <= 0 AND status='FROZEN'

    Note over User,API: Recovery via payment
    User->>API: POST /api/users/pay { amount: 3300 }
    API->>API: applySettlement(..., 'SETTLEMENT')<br/>settle oldest PREPAID orders
    API->>DB: Update order + user outstanding_balance
    API->>API: checkAndApplyFreeze() → unfreezes
    API-->>User: { status: 'ACTIVE', balance: 0 }

    Note over User,API: User can order again
    User->>API: POST /api/orders
    API->>API: checkAndApplyFreeze() → passes
    API-->>User: Order confirmed
```

### 2.7 Communication Diagram — Order Processing (Object Interaction)

```mermaid
flowchart LR
    subgraph Actors
        U([User / Browser])
        M([Merchant Dashboard])
    end

    subgraph "Express Serverless"
        AUTH[":JWT Auth"]
        VAL[":Zod Validate"]
        CE[":Checkout Engine<br/>orders.ts"]
        FG[":Freeze Guardrail<br/>helpers.ts"]
        TM[":Task Service<br/>tasks.ts"]
        USR[":User Service<br/>users.ts"]
    end

    subgraph "Supabase PostgreSQL"
        DB[(Database)]
    end

    U -- "1: POST /api/orders\nBearer token + body" --> AUTH
    AUTH -- "2: verified" --> VAL
    VAL -- "3: parsed body" --> CE
    CE -- "4: check freeze" --> FG
    FG -- "5: SELECT overdue PREPAID orders\n(no remaining-credit check)" --> DB
    CE -- "6: SELECT tier + seed pool exposure\ncheck per-order/total caps" --> DB
    CE -- "7: INSERT order\n+ transactions" --> DB
    CE -- "8: UPDATE user\noutstanding_balance" --> DB
    CE -- "9: response" --> U
    M -- "10: verify task" --> TM
    TM -- "11: credit user\n+ INSERT transaction" --> DB
    USR -- "12: pay balance" --> DB
    USR -- "13: login/signup\n+ return JWT" --> U
```

### 2.8 User Flow Diagram — End-to-End Journey

```mermaid
flowchart TB
    Start([User arrives]) --> Auth{Has<br/>JWT token?}
    Auth -->|No| Landing[Landing page<br/>Learn about platform]
    Landing --> Choose{Want to<br/>explore?}
    Choose -->|Demo| DemoLogin[Select a demo user<br/>from the list]
    Choose -->|Sign up| Signup[Enter name, phone/email<br/>& password]
    Choose -->|Sign in| Login[Enter phone/email<br/>& password]

    DemoLogin --> DemoLoginAPI[POST /api/users/demo-login<br/>returns JWT]
    Signup --> SignupAPI[POST /api/users<br/>creates user, returns JWT]
    Login --> LoginAPI[POST /api/users/login<br/>verifies password, returns JWT]

    DemoLoginAPI --> Dashboard[Dashboard<br/>View balance, merchants, orders]
    SignupAPI --> Approval[Approval flow<br/>3-step animated KYC]
    Approval --> Dashboard

    LoginAPI --> Dashboard

    Auth -->|Yes| Dashboard

    Dashboard --> Browse[Browse merchants<br/>from partnered restaurants]
    Browse --> Menu[Select merchant<br/>view menu items]
    Menu --> Cart[Add items to cart<br/>floating cart bar]
    Cart --> Checkout[Checkout page<br/>'How Much You Get?' input]
    Checkout --> Validate{Down payment<br/>valid?}
    Validate -->|No| Checkout
    Validate -->|Yes| Portal[PaymentPortal modal<br/>mock card payment]
    Portal --> PlaceOrder[POST /api/orders<br/>server validates limits]
    PlaceOrder --> OrderResult{Success?}
    OrderResult -->|No| Checkout
    OrderResult -->|Yes| Success[Order placed ✓<br/>See breakdown]
    Success --> Dashboard

    Dashboard --> Tasks[Browse tasks<br/>to clear debt]
    Tasks --> Assign[Assign task]
    Assign --> Complete[Mark complete<br/>pending verification]
    Complete --> Dashboard

    Dashboard --> Profile[View profile<br/>tier, limits, logout]
    Profile --> Logout[Clear token<br/>redirect to login]
    Logout --> Landing

    Dashboard --> Pay[Clear balance<br/>pay via naira]
    Pay --> Portal
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
