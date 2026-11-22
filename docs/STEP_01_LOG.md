# Step 1: Project Foundation, Tech Stack Setup & Database Schema

**Date:** 2026-11-22  
**Status:** ✅ Complete

---

## 1. Architecture & Stack Chosen

### Tech Stack
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 15.3.4 |
| Runtime | React | 19.3.1 |
| Renderer | React DOM | 19.3.1 |
| Language | TypeScript | 5.6.2 |
| ORM | Prisma | 5.22.0 |
| Database | SQLite | 3.x (via Prisma) |
| Package Manager | npm | v24.20.0 |

### Why This Stack?
- **Next.js App Router**: Modern file-system routing with React Server Components
- **TypeScript**: Full type safety for database models and API routes
- **Prisma ORM**: Elegant schema definition, type-safe queries, migrations
- **SQLite**: Zero-configuration, local file-based database - no external DB required
- **ES Modules**: Native ESM support throughout the project

### Folder Structure
```
Lost And Found/
├── .env                    # Environment variables (dev)
├── .env.example           # Environment template
├── package.json           # Project config & dependencies
├── next.config.mjs        # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed script
│   └── migrations/        # Auto-generated migrations
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts      # Health check endpoint
│   │   │   ├── items/route.ts       # Items CRUD API
│   │   │   └── users/route.ts       # Users CRUD API
│   │   ├── page.tsx                 # Home page
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   └── lib/
│       └── prisma.ts                # Prisma client singleton
├── docs/
│   └── STEP_01_LOG.md     # This file
├── dev.db                 # SQLite database file
└── node_modules/
```

---

## 2. Every File Created/Modified

| File | Purpose |
|------|---------|
| `package.json` | Project configuration with scripts and dependencies |
| `tsconfig.json` | TypeScript compiler options |
| `next.config.mjs` | Next.js configuration (eslint, typescript settings) |
| `prisma/schema.prisma` | Database model definitions with relations and indexes |
| `prisma/seed.ts` | Seed script creating test users, items, matches, notifications |
| `prisma/client` (generated) | Auto-generated Prisma Client for type-safe DB queries |
| `.env` | Environment variables for local development |
| `.env.example` | Template for environment configuration |
| `src/lib/prisma.ts` | Prisma Client singleton for connection pooling |
| `src/app/api/health/route.ts` | Health check API endpoint |
| `src/app/api/users/route.ts` | Users CRUD API endpoints |
| `src/app/api/items/route.ts` | Items CRUD API endpoints |
| `src/app/layout.tsx` | Root layout component |
| `src/app/page.tsx` | Home page with API status overview |
| `src/app/globals.css` | Global CSS styles |
| `next-env.d.ts` | Auto-generated TypeScript declarations |
| `dev.db` | SQLite database file |

---

## 3. Database Schema Details

### Tables Overview

#### User
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | Unique identifier |
| `name` | String | NOT NULL | User's full name |
| `email` | String | UNIQUE, NOT NULL | User's email |
| `phone` | String | NULL | User's phone number |
| `createdAt` | DateTime | DEFAULT now() | Account creation timestamp |

**Indexes:** `email`

#### Item
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | Unique identifier |
| `userId` | String | FK → User.id | Owner (lost/found person) |
| `type` | String | NOT NULL | "LOST" or "FOUND" |
| `title` | String | NOT NULL | Item title |
| `description` | String | NOT NULL | Item description |
| `extractedAttributes` | String | DEFAULT "{}" | JSON string of AI-extracted fields |
| `imageUrl` | String | NULL | Path/URL to item image |
| `imageEmbedding` | Bytes | NULL | Serialized image embedding vector |
| `visualSummary` | String | NULL | AI-generated visual description |
| `textEmbedding` | Bytes | NULL | Serialized text embedding vector |
| `locationName` | String | NOT NULL | Human-readable location |
| `latitude` | Float | NULL | GPS latitude |
| `longitude` | Float | NULL | GPS longitude |
| `incidentTime` | DateTime | NOT NULL | When item was lost/found |
| `status` | String | DEFAULT "OPEN" | "OPEN", "MATCHED", "CLAIMED", "CLOSED" |
| `createdAt` | DateTime | DEFAULT now() | Record creation |
| `updatedAt` | DateTime | auto-updated | Last update |

**Indexes:** `userId`, `type`, `status`, `locationName`, `incidentTime`, `(latitude, longitude)`

#### Match
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | Unique identifier |
| `lostItemId` | String | FK → Item.id | Reference to lost item |
| `foundItemId` | String | FK → Item.id | Reference to found item |
| `imageScore` | Float | DEFAULT 0 | Image similarity score |
| `descriptionScore` | Float | DEFAULT 0 | Text similarity score |
| `locationScore` | Float | DEFAULT 0 | Proximity score |
| `totalScore` | Float | DEFAULT 0 | Combined match score |
| `matchReason` | String | NOT NULL | Human-readable explanation |
| `status` | String | DEFAULT "PENDING_REVIEW" | "PENDING_REVIEW", "CONFIRMED_BY_OWNER", "REJECTED" |
| `createdAt` | DateTime | DEFAULT now() | Match creation |

**Indexes:** `lostItemId`, `foundItemId`, `status`, `totalScore`  
**Unique:** `(lostItemId, foundItemId)`

#### Notification
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | Unique identifier |
| `userId` | String | FK → User.id | Recipient |
| `matchId` | String | FK → Match.id, NULLABLE | Related match (if any) |
| `title` | String | NOT NULL | Notification title |
| `message` | String | NOT NULL | Notification body |
| `isRead` | Boolean | DEFAULT false | Read status |
| `channel` | String | DEFAULT "IN_APP" | "IN_APP", "EMAIL" |
| `createdAt` | DateTime | DEFAULT now() | Notification creation |

**Indexes:** `userId`, `matchId`, `isRead`, `createdAt`

### Relationships
```
User 1 ──> * Item
User 1 ──> * Notification
Item 1 ──> * Match (as lostItem)
Item 1 ──> * Match (as foundItem)
Match 1 ──> * Notification
```

---

## 4. Setup & Run Commands

### Prerequisites
- Node.js v18+ (tested with v24.20.0)
- npm v9+ (or yarn/pnpm)

### Installation
```bash
# Clone and navigate to project
cd "Lost And Found"

# Install dependencies
npm install
```

### Database Setup
```bash
# Generate Prisma Client (auto-ran on migrate)
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with sample data
npm run seed
```

### Development Server
```bash
# Start dev server (auto-reloads on changes)
npm run dev

# Open in browser
# http://localhost:3000
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## 5. API Endpoints Available So Far

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server and DB connectivity |
| HEAD | `/api/health` | Quick connectivity check |

**Response (GET):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "checks": {
    "database": "connected",
    "prisma": "connected"
  }
}
```

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |

**Request Body (POST):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0101"
}
```

### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List all items (supports filtering) |
| POST | `/api/items` | Create new item |

**Query Parameters (GET):**
- `type`: Filter by "LOST" or "FOUND"
- `status`: Filter by status (OPEN, MATCHED, etc.)
- `userId`: Filter by owner
- `limit`: Limit results (default: 50)

**Request Body (POST):**
```json
{
  "userId": "user_abc123",
  "type": "LOST",
  "title": "Lost Wallet",
  "description": "Black leather wallet...",
  "extractedAttributes": "{\"category\":\"Accessories\"}",
  "imageUrl": "/uploads/wallet.jpg",
  "locationName": "Cafeteria",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "incidentTime": "2024-01-15T14:30:00Z"
}
```

---

## 6. Assumptions & Trade-offs Made

### Database Choice: SQLite
| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Vector Storage | Bytes columns | SQLite doesn't support native vector types; embeddings stored as serialized binary |
| Enums | String fields | Prisma 5.x removed SQLite enum support; enums stored as strings with application-level validation |
| JSON Storage | String column | SQLite doesn't have native JSON type; stored as JSON string with parsing in application |

### Vector Storage for AI Matching
- **Decision**: Use `Bytes` column type for `imageEmbedding` and `textEmbedding`
- **Trade-off**: No native vector search in SQLite; semantic similarity will require application-level computation or migration to pgvector later
- **Future**: When scaling, migrate to PostgreSQL with pgvector extension

### Local-First Architecture
- **Decision**: SQLite file-based database by default
- **Rationale**: Zero external dependencies for local development
- **Production Note**: For production deployment, migrate to PostgreSQL:
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/lost_and_found?schema=public"
  ```

### API Design
- **Decision**: REST-like API using Next.js Route Handlers
- **Rationale**: Simple, type-safe, no additional frameworks needed
- **Future**: Can migrate to TRPC for more type-safe RPC

### Image Storage
- **Decision**: Store image paths/URLs, not actual binary data
- **Rationale**: File storage separate from database; images stored in local `./uploads` or S3 bucket
- **Configuration**: `STORAGE_TYPE` and `STORAGE_LOCAL_PATH` in `.env`

### Enum Handling
- **Decision**: Store as String type in Prisma schema
- **Rationale**: SQLite doesn't support native enums in Prisma 5.x
- **Implementation**: Application validates allowed values at runtime

---

## Next Steps (Step 2+)

The foundation is complete for:
1. ✅ Database schema with relations and indexes
2. ✅ Health check API endpoint
3. ✅ Users API (CRUD)
4. ✅ Items API (CRUD with filtering)
5. ✅ Seed data verification

**Step 2 would include:**
- UI forms for creating/viewing items
- Image upload handler
- AI matching engine integration
- Notification system UI
- Match confirmation flow