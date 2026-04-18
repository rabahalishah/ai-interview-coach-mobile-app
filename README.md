# 🎙️ AI Interview Coach (Public Version)

> **MLH Hackathon — API Week**
> An AI-powered mobile app that helps you ace your next interview through real-time recording, transcription, and personalized coaching feedback.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Integrations](#integrations)
- [Notes & Caveats](#notes--caveats)

---

## Overview

AI Interview Coach is a full-stack mobile application built for MLH API Week. Users can record mock interviews on their phone, get their speech transcribed via OpenAI Whisper, and receive structured AI coaching feedback — all tracked across sessions with detailed skill breakdowns and history.

The project is split into two parts:
- **Mobile App** — React Native (Expo) frontend handling recording, UI, and session display
- **Backend API** — Node.js/TypeScript server handling auth, profiles, session storage, AI analysis, and file management

---
## 🎬 Demo

📹 [Watch the demo video](https://youtu.be/aVHCxvGy3M4)
---

## Features

### Mobile App
- 🔐 **Authentication** — Login/sign-up UI with local persistence via AsyncStorage
- 🎤 **Interview Recording** — Microphone capture via `expo-audio` with permission handling
- 🤖 **AI Coaching** — Transcription via OpenAI Whisper + coaching feedback via GPT Chat Completions
- 📊 **Skill Breakdown** — Radar chart visualization across Clarity, Confidence, Tone, Enthusiasm, and Specificity
- 📝 **Session History** — Full session list with score badges and detailed view with transcript bubbles
- 👤 **Profile & Resume Intake** — Resume upload UI (PDF/Word) and target role selection (industry + job title)

## 📸 Screenshots
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/65c43922-4fd8-4caa-bbf6-04726d2fad37" />
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/3cf02bb2-e944-41ca-92a9-4124302b563d" />
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/6798c054-157b-4103-a381-56ea9b0e638d" />
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/5963ff8e-b99e-47e3-8a7c-67184ed5b68a" />
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/b758dc94-9766-4985-aa87-0f64abf21aa9" />
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/be1d7dc5-abc4-4e21-9a31-80cd70e413aa" />
<img width="360" height="800" alt="Image" src="https://github.com/user-attachments/assets/9405ef02-9bdd-4a4e-b25d-fa24525c9ac8" />

### Backend API
- 🔐 **Auth & Identity** — Email/password with JWTs, optional Google OAuth, OTP-based password reset
- 📁 **Profile Management** — Resume upload, parsing, and AI-derived attribute persistence
- 🎧 **Audio Sessions** — Upload audio → Whisper transcription → GPT analysis → scores and insights stored
- 💳 **Subscriptions & Usage** — Free vs. paid tier enforcement with monthly limits
- 🛡️ **Security** — Helmet, request sanitization, rate limiting, abuse detection, per-user data isolation
- 📈 **Observability** — Health/metrics endpoints, request logging, circuit-breaker patterns

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Runtime | Expo SDK ~54, React 19, React Native 0.81 |
| Navigation | React Navigation (bottom tabs + native stack) |
| Audio | `expo-audio` |
| Storage | `@react-native-async-storage/async-storage` |
| File Picking | `expo-document-picker`, `expo-file-system` |
| Charts | `react-native-gifted-charts`, `react-native-svg`, `react-native-chart-kit` |
| Styling | React Native `StyleSheet` + shared design tokens |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18, TypeScript |
| HTTP Framework | Express, CORS |
| Auth | JWT, bcrypt |
| Database | PostgreSQL + Prisma ORM |
| File Uploads | Multer |
| Validation | Joi (env/config), request schema validation |
| Security | Helmet, rate limiting, abuse detection middleware |
| Testing | Jest, Supertest, fast-check |

---

## Architecture

```
┌─────────────────────────────────┐
│       React Native App          │
│  (Expo, AsyncStorage, Charts)   │
└────────────┬────────────────────┘
             │ REST API calls
             ▼
┌─────────────────────────────────┐
│       Express API Server        │
│   /api/auth  /api/sessions      │
│   /api/profile  /api/dashboard  │
└─────┬──────────┬────────────────┘
      │          │
      ▼          ▼
┌──────────┐ ┌──────────────────────┐
│PostgreSQL│ │   External Services  │
│ (Prisma) │ │  OpenAI GPT/Whisper  │
└──────────┘ │  AWS S3              │
             │  Resend (email)      │
             │  Google OAuth        │
             └──────────────────────┘
```

The backend follows a layered pattern: **Routes → Services → Prisma / S3 / OpenAI**. Route handlers stay thin and delegate all business logic to services. Dependencies are wired once at startup via a DI container (`src/container.ts`). Configuration is validated at boot via Joi — missing required env vars cause a fail-fast crash before serving any traffic.

---

## Project Structure

### Frontend
```
App.js                  # Entry point, auth gate, navigation setup, global state
index.js                # Expo root registration
screens/                # Home, Record, Practice, History, HistoryDetail, Profile
components/             # Reusable UI (Login, ProfileForm, etc.)
services/               # Auth/profile persistence via AsyncStorage
src/styles/             # Design tokens + shared styles
```

### Backend
```
src/
├── index.ts            # App bootstrap, middleware, route mounting
├── container.ts        # Dependency injection wiring
├── routes/             # auth / profile / sessions / subscription / dashboard / admin
├── services/           # Business logic + integrations (OpenAI, S3, email, monitoring)
├── middleware/         # Auth, security, validation, rate limiting, logging, error handling
└── utils/              # Config/env validation, startup checks, helpers
prisma/                 # Prisma schema + seed
tests/                  # Unit, integration, and property-based tests
```

---

## Getting Started

### Prerequisites

- **Node.js** LTS (≥ 18)
- **PostgreSQL** database
- **Expo Go** app (for physical device) or Android Studio / Xcode (for emulators)
- API keys: OpenAI, Whisper, AWS S3, and optionally Resend + Google OAuth

---

### Backend Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in required values (see Environment Variables section)

# 3. Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# 4. Start the dev server
npm run dev
```

The server defaults to port `3000`. Verify it's running:
```
GET http://localhost:3000/api/health
```

---

### Frontend Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Create a .env file in the project root:
EXPO_PUBLIC_OPENAI_API_KEY=your_key_here

# 3. Start the Expo dev server
npm run start
```

Then choose your target:
- Press `a` — Android emulator
- Press `i` — iOS simulator (macOS only)
- Scan the QR code — Expo Go on a physical device

> ⚠️ **Microphone permission** is requested after login. Make sure to allow it on your device/emulator.

---

## Environment Variables

### Backend — Required (startup fails if missing)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `OPENAI_API_KEY` | GPT analysis + resume parsing |
| `WHISPER_API_KEY` | Audio transcription |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `AWS_REGION` | S3 region |
| `AWS_S3_BUCKET` | S3 bucket name |

### Backend — Optional

| Variable | Description |
|---|---|
| `PORT`, `NODE_ENV`, `CORS_ORIGIN` | Server config |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `ADMIN_EMAILS`, `ENABLE_ADMIN_ENDPOINTS` | Admin access control |
| `ENABLE_RATE_LIMITING`, `ENABLE_ABUSE_DETECTION` | Security toggles |
| `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE` | AI tuning |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | Transactional email |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `REDIS_URL`, `SENTRY_DSN` | Monitoring hooks (optional placeholders) |

### Frontend

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_OPENAI_API_KEY` | Required for transcription + AI coach flows |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google auth (if wired in UI) |
| `EXPO_PUBLIC_API_URL` | Backend API URL for LAN usage |

---

## API Reference

**Base path:** `/api`

### Auth — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Create account |
| `POST` | `/login` | Obtain JWT |
| `POST` | `/google` | Google ID-token login/register |
| `POST` | `/logout` | Logout (token invalidation) |
| `GET` | `/me` | Current user |
| `POST` | `/refresh` | Refresh JWT |
| `GET` | `/validate` | Validate JWT |
| `POST` | `/forgot-password` | Request OTP email |
| `POST` | `/verify-otp` | Verify OTP → reset token |
| `POST` | `/reset-password` | Reset password with token |
| `POST` | `/change-password` | Change password (authenticated) |
| `POST` | `/change-email` | Change email (authenticated) |

### Profile — `/api/profile` *(auth required)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Fetch profile |
| `PUT` | `/` | Update profile |
| `POST` | `/manual-entry` | Save profile without resume |
| `POST` | `/resume` | Upload resume (multipart) |
| `GET` | `/resume/url` | Get presigned URL for resume |
| `PUT` | `/target-role` | Set target industry/job title |
| `GET` | `/ai-attributes` | Fetch AI-derived attributes |
| `DELETE` | `/` | Delete profile |

### Sessions — `/api/sessions` *(auth required)*
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/start` | Create session (enforces usage limit) |
| `POST` | `/:id/audio` | Upload audio → triggers transcription + analysis |
| `PATCH` | `/:id/transcript` | Update transcript → re-run insights |
| `PATCH` | `/:id` | Update session display name |
| `GET` | `/:id` | Session details (transcript, analysis, scores) |
| `GET` | `/history` | List sessions (filters + limit) |
| `GET` | `/:id/audio-url` | Presigned playback URL |

### Other Endpoints
| Prefix | Description |
|---|---|
| `/api/subscription` | Tier info, usage, upgrade |
| `/api/dashboard` | Aggregated stats, insights, trends |
| `/api/admin` | Health, metrics, system config (admin-gated) |

---

## Integrations

| Service | Purpose |
|---|---|
| **OpenAI GPT** | Session analysis + resume parsing |
| **OpenAI Whisper** | Audio transcription |
| **AWS S3** | Resume and audio file storage + presigned URLs |
| **Resend** | Password reset transactional emails (optional) |
| **Google OAuth** | "Continue with Google" login (optional) |
| **SmartRecruiters API** | Public endpoint for fetching industry list (frontend) |

> **Stripe** is not implemented — subscription upgrade is a DB tier change only in this version.

---

## Notes & Caveats

- **Frontend auth is client-side only.** User sessions are stored in `AsyncStorage` and are intended for prototyping, not production security. The backend has full JWT-based auth ready for integration.
- **Resume processing is stubbed on the frontend.** The document picker UI is in place, but processing is deferred — the backend handles actual resume parsing.
- **Presigned URLs for files** — clients never receive direct S3 credentials; all file access goes through short-lived signed URLs generated by the backend.
- **Fail-fast configuration** — the backend validates all required environment variables at boot via Joi. An invalid or missing config prevents the server from starting.

---

*Built with ❤️ for MLH Hackathon — API Week*
