# 🛠️ Developer Guide, CI/CD & Presentation Playbook (`README_DEV.md`)

This guide walks through setting up the **TCG Deck Builder & Probability Calculator** locally, running the automated test suite, deploying to DigitalOcean, and executing the class presentation demo.

---

## 📂 Monorepo Directory Structure

```text
card-deck-builder/
├── .github/workflows/
│   ├── ci.yml                # Automated CI: Node 20/22 matrix unit tests & Vite TypeScript build
│   └── deploy.yml            # Automated CD: SSH deployment to DigitalOcean on push to main
├── backend/
│   ├── src/
│   │   ├── config/           # MongoDB connection (db.js) & tournament deck seeder (seed.js)
│   │   ├── controllers/      # Auth, Deck, Card Search, and Probability Calculator handlers
│   │   ├── docs/             # OpenAPI 3.0 specification (swagger.json)
│   │   ├── middleware/       # JWT Bearer token authentication guard (auth.js)
│   │   ├── models/           # Mongoose schemas for User and Deck/Card
│   │   ├── routes/           # Express REST route definitions
│   │   ├── tests/            # Node test runner unit tests (math.test.js)
│   │   ├── utils/            # Exact hypergeometric & combo probability engine
│   │   └── server.js         # Express entry point & Swagger UI mount
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Navbar, AuthModal, DeckList, DeckEditor, ProbabilityCalculator, SearchBar
│   │   ├── services/         # Typed AJAX API client with automatic JWT header injection (api.ts)
│   │   ├── App.tsx           # Main SPA layout & tab navigation
│   │   └── index.css         # Minimalist design system tokens
│   └── package.json
├── mobile/
│   ├── lib/
│   │   ├── screens/          # Login, Deck Browser, and Mobile Probability Calculator screens
│   │   ├── services/         # Dart REST client & SharedPreferences JWT persistence
│   │   └── main.dart         # Flutter application entry point & theme
│   └── pubspec.yaml
├── scripts/
│   └── deploy.sh             # Production deployment script executed on DigitalOcean droplet
└── docker-compose.yml        # Local MongoDB 7.0 + mongo-express container orchestration
```

---

## 🚀 1. Local Development Setup

### Step 1: Start Local MongoDB with Docker Compose
We use Docker Compose so every teammate runs the exact same MongoDB 7.0 database and web GUI (`mongo-express`):

```bash
# Validate Docker Compose syntax
docker compose config

# Start MongoDB (port 27017) and mongo-express GUI (port 8081) in the background
docker compose up -d

# Check container status
docker compose ps
```
- **MongoDB URI**: `mongodb://localhost:27017/deckbuilder`
- **Mongo-Express Web GUI**: [http://localhost:8081](http://localhost:8081)

---

### Step 2: Configure & Run the Backend API (`backend/`)
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/deckbuilder
JWT_SECRET=super_secret_cop4331_jwt_key_2026
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

Install dependencies, seed the database, run unit tests, and start the server:
```bash
cd backend
npm install

# Run the Hypergeometric Math Engine unit tests
npm test

# Seed demo account (demouser@ucf.edu / password123) & tournament decks
npm run seed

# Start Express API server on http://localhost:5000
npm start
```

---

### Step 3: Configure & Run the Web Frontend (`frontend/`)
Create `frontend/.env` (optional — defaults to `/api` or `http://localhost:5000/api`):
```env
VITE_API_URL=http://localhost:5000/api
```

Install dependencies, verify TypeScript build, and launch the Vite dev server:
```bash
cd frontend
npm install

# Verify TypeScript compilation and production bundle
npm run build

# Start Vite dev server on http://localhost:5173
npm run dev
```

---

### Step 4: Run the Flutter Mobile App (`mobile/`)
```bash
cd mobile
flutter pub get
flutter analyze

# Run on connected Android/iOS emulator or device
flutter run
```

---

## ⚙️ 2. CI/CD Pipeline & DigitalOcean Production Deployment

### Continuous Integration (`.github/workflows/ci.yml`)
Triggered on every `push` and `pull_request` to `main`:
1. Spins up an Ubuntu runner across a **Node.js `20.x` and `22.x` matrix**.
2. Runs `npm ci` in `backend/` and executes `npm test` (`src/tests/math.test.js`) to verify exact hypergeometric calculations.
3. Runs `npm ci` and `npm run build` (`tsc -b && vite build`) in `frontend/` to enforce zero TypeScript or bundling errors before any PR can merge.

### Continuous Deployment (`.github/workflows/deploy.yml` & `scripts/deploy.sh`)
Triggered automatically whenever a PR is merged to `main`:
1. GitHub Actions connects to the DigitalOcean droplet (`talavital.com`) via SSH using repository secrets:
   - `DO_HOST`: `talavital.com`
   - `DO_USERNAME`: `root`
   - `DO_SSH_KEY`: Private SSH key for the droplet
2. Executes `/var/www/card-deck-builder/scripts/deploy.sh`:
   - Pulls the latest `main` branch.
   - Runs `npm ci --omit=dev` in `backend/` and reloads the `deckbuilder-api` process under **PM2**.
   - Runs `npm ci && npm run build` in `frontend/` to update the static production bundle served by **Nginx**.

### Manual Server Operations on DigitalOcean (`talavital.com`)
```bash
# SSH into production droplet
ssh root@talavital.com

# Run manual deployment
cd /var/www/card-deck-builder && bash ./scripts/deploy.sh

# Inspect PM2 process status & live API logs
pm2 status
pm2 logs deckbuilder-api --lines 50
```

---

## 🎤 3. Class Presentation & Live Demo Checklist

Follow this sequence during the live presentation to hit every rubric item smoothly:

1. **Architecture & DevOps Overview (Tal)**
   - Show `docker-compose.yml`, GitHub Actions green checkmarks (`ci.yml` & `deploy.yml`), and verify live HTTPS response with `curl -I https://talavital.com`.
2. **Database Schema & Seeding (Michael)**
   - Highlight `User` and `Deck` Mongoose schemas, text indexing, and the seeded tournament decks (`Branded Despia` & `Mono Red Aggro`).
3. **SwaggerHub & Math Engine (Toricelli)**
   - Open SwaggerHub / `https://talavital.com/api-docs` and execute `GET /api/cards/search?query=Ash` and `POST /api/calc/hypergeometric` live.
4. **Web Application Demo (An)**
   - Log into `https://talavital.com` using `demouser@ucf.edu` / `password123` (showing email validation & verification flow).
   - Open a deck in the **Deck Editor**, adjust card counts (`+`/`-`) to watch opening-hand probabilities update live, draw a simulated 5-card hand, and run a 2-card combo calculation.
5. **Mobile Application Demo (Andres)**
   - Show the Flutter mobile app logging in against the same API, browsing the user's synced decks, searching cards, and running mobile probability calculations.
