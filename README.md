# Lost & Found Management System

An AI-powered Lost & Found item matching and management system built with Next.js 15, Prisma, and SQLite.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Apply database schema
npx prisma db push

# Seed the database with demo data
npx prisma db seed

# Run the development server
npm run dev
```

The app will be available at http://localhost:3000

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API route handlers
│   │   ├── health/        # Health check endpoint
│   │   ├── users/         # User management
│   │   ├── items/         # Item CRUD operations
│   │   ├── upload/        # Image upload endpoint
│   │   ├── matches/       # Match management
│   │   └── notifications/ # Notification endpoints
│   ├── page.tsx           # Home dashboard
│   ├── report/page.tsx    # Item reporting form
│   ├── items/page.tsx     # Items browsing grid
│   ├── matches/page.tsx   # Match verification
│   └── notifications/page.tsx  # Notifications center
├── lib/                   # Backend services
│   ├── ai/                # AI extraction with fallback
│   ├── matching/          # Multi-signal matching engine
│   └── upload/            # Image upload validation
├── prisma/                # Database schema
└── public/                # Static assets
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="file:./dev.db"

# Match threshold (0.0 - 1.0)
MATCH_THRESHOLD=0.65

# AI Service (Optional - provides image similarity)
# OpenRouter compatible
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=your-key-here

# NVIDIA NIM compatible endpoint
NVIDIA_NIM_BASE_URL=https://ai.nvidia.com/v1
NVIDIA_NIM_API_KEY=your-key-here

# AI model to use
AI_MODEL=google/gemini-pro-vision
```

**Note:** AI features gracefully degrade without API keys - the system uses rule-based matching as a fallback.

### AI API Keys

For full image matching capabilities:

1. **OpenRouter**: Get an API key from https://openrouter.ai
2. **NVIDIA NIM**: Use NVIDIA's AI services at https://ai.nvidia.com

Set `OPENROUTER_API_KEY` or `NVIDIA_NIM_API_KEY` in your `.env`.

## 🏃 Run & Test Workflow

### Development

```bash
npm run dev    # Start dev server (http://localhost:3000)
npm run build  # Production build
npm start      # Start production server
```

### Database Management

```bash
npx prisma studio   # View database in browser
npx prisma migrate    # Apply migrations
npx prisma db seed    # Seed demo data
```

### Lint & Type Check

```bash
npm run lint    # ESLint
npx tsc --noEmit # TypeScript check
```

## 🔍 Full Workflow Test

1. **Report an Item**
   - Navigate to `/report`
   - Select "Lost" or "Found" item
   - Fill in details, upload photo, enter location
   - AI extracts item attributes

2. **System Matching**
   - The matching engine automatically finds potential matches
   - Uses location (35%), description (45%), image (20%) scoring
   - Matches must exceed `MATCH_THRESHOLD` (default 0.65)

3. **Review Notifications**
   - Go to `/notifications`
   - View potential matches
   - Click notification to see match details

4. **Verify Ownership**
   - On `/matches` page, review side-by-side comparison
   - Click "Confirm Match" if this is your item
   - Click "Not Mine" if incorrect
   - Item status updates to "Claimed"

5. **Browse Items**
   - All reported items at `/items`
   - Filter by Lost/Found/Claimed status
   - View details and match history

## 📊 System Features

- **Multi-signal Matching**: Location proximity, text similarity, image analysis
- **AI Attribute Extraction**: Automatically extracts brand, model, color, unique marks
- **Image Upload**: Validates and stores item photos
- **Notification Center**: Real-time match alerts
- **Claim Verification**: Owner confirms match before claiming

## 🧪 Testing

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/users | List users |
| POST | /api/users | Create user |
| GET | /api/items | List items (filter by type, status) |
| POST | /api/items | Create item + auto-match |
| POST | /api/upload | Upload image |
| GET | /api/matches | List matches (filter by status, userId) |
| POST | /api/matches/run | Run batch matching |
| PUT | /api/matches/:id | Update match status |
| GET | /api/notifications | List notifications |
| POST | /api/notifications/read-all | Mark all as read |
| PATCH | /api/notifications/:id | Mark as read |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: SQLite with Prisma ORM 5.x
- **Authentication**: Demo user system (Step 5: Add auth)
- **Image Processing**: File-based + AI vision (optional)
- **Deployment**: Vercel-ready

## 📄 Documentation

- `docs/STEP_01_LOGIC.md` - Core architecture and matching logic
- `docs/STEP_04_LOG.md` - Step 4 implementation log
- `docs/STEP_04_TEST_REPORT.md` - QA verification report

## 🤝 Contributing

Built as a learning project - feel free to fork and experiment!

---

For more details on the matching algorithm, see `docs/STEP_01_LOGIC.md`.