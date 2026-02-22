# PodDigest AI

AI-powered weekly podcast digest generator. Subscribe to your favorite podcasts, and PodDigest automatically analyzes each episode's transcript, identifies the most compelling moments, extracts the original audio clips, and stitches them together with AI-narrated context into a single polished digest.

The key difference from other podcast summaries: **the digest features the original podcast audio** — real hosts, guests, and conversations — with an AI narrator acting as a guide between segments, never a replacement for the original voices.

## How It Works

```
Subscribe to podcasts
        ↓
  Crawl RSS feeds for new episodes
        ↓
  Download episode audio → S3
        ↓
  Transcribe with Deepgram (word-level timestamps, speaker diarization)
        ↓
  Claude AI scores transcript segments across 5 dimensions
        ↓
  Generate narration scripts (Claude) → synthesize voice (ElevenLabs)
        ↓
  FFmpeg assembles clips + narration → normalized MP3 with chapters
        ↓
  Deliver via private RSS feed, email, push, or in-app player
```

A typical 60-minute digest is ~85% original podcast audio and ~15% AI narrator providing context and transitions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui |
| Backend | Next.js API routes, Bull queues (Redis) |
| Database | PostgreSQL, Prisma ORM |
| AI | Anthropic Claude (analysis & scripts), Deepgram (transcription), ElevenLabs (voice) |
| Audio | FFmpeg via fluent-ffmpeg |
| Storage | AWS S3 + CloudFront CDN |
| Auth | NextAuth.js (Google OAuth) |

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 15+**
- **Redis 7+**
- **FFmpeg** — required for audio processing
  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu/Debian
  sudo apt install ffmpeg
  ```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials. See [API Keys](#api-keys) below.

### 3. Start PostgreSQL and Redis

```bash
# Docker (recommended)
docker run -d --name poddigest-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=poddigest postgres:16

docker run -d --name poddigest-redis -p 6379:6379 redis:7
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Keys

| Service | Purpose | Sign up |
|---------|---------|---------|
| Google OAuth | User authentication | Google Cloud Console |
| Anthropic | Content analysis & narration scripts | console.anthropic.com |
| Deepgram | Podcast transcription | console.deepgram.com |
| ElevenLabs | AI narrator voice synthesis | elevenlabs.io |
| AWS | S3 storage for audio files | aws.amazon.com |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── podcasts/search/         # POST/GET — iTunes Search proxy
│   │   ├── podcasts/subscribe/      # POST — subscribe with priority
│   │   ├── podcasts/subscriptions/  # GET — list subscriptions
│   │   ├── podcasts/subscriptions/[id]/  # PATCH/DELETE — update/unsubscribe
│   │   ├── digests/                 # GET — paginated digest list
│   │   ├── digests/[id]/            # GET — digest with chapters & clips
│   │   ├── digests/[id]/feedback/   # POST — thumbs up/down on clips
│   │   ├── digests/latest/          # GET — most recent completed digest
│   │   ├── config/                  # GET/PUT — digest configuration
│   │   └── pipeline/trigger/        # POST — manually trigger generation
│   ├── dashboard/                   # Main app pages (player, library, config, history)
│   └── onboarding/                  # First-time user flow
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── player/          # Audio player with chapters
│   ├── library/         # Podcast search & grid
│   ├── digest/          # Config form & voice selector
│   └── layout/          # Header & sidebar
├── services/
│   ├── feed-crawler.ts      # iTunes search + RSS parsing
│   ├── audio-downloader.ts  # S3 upload with progress tracking
│   ├── transcription.ts     # Deepgram integration
│   ├── ai-analyst.ts        # Claude segment scoring (5 dimensions)
│   ├── narration.ts         # Script generation + ElevenLabs TTS
│   ├── audio-assembler.ts   # FFmpeg clip extraction, crossfades, loudness normalization
│   └── delivery.ts          # Private RSS feed generation, S3 upload
├── workers/
│   ├── pipeline.ts          # 7-step orchestrator
│   ├── crawl.worker.ts      # Feed crawling
│   ├── transcribe.worker.ts # Deepgram transcription
│   ├── analyze.worker.ts    # AI scoring
│   ├── narrate.worker.ts    # Script + voice synthesis
│   ├── assemble.worker.ts   # FFmpeg assembly
│   └── deliver.worker.ts    # Final delivery
├── lib/
│   ├── prisma.ts        # Database client
│   ├── api/auth.ts      # NextAuth config
│   ├── queue.ts         # Bull queue setup
│   └── validators/      # Zod schemas
└── types/
    └── index.ts         # Shared TypeScript types
```

## AI Scoring

Each transcript segment is scored 0–100 across five weighted dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Insight Density | 25% | Novel information, unique perspectives, surprising data |
| Emotional Intensity | 20% | Storytelling, humor, vulnerability, passion |
| Actionability | 20% | Practical takeaways, advice, applicable steps |
| Topical Relevance | 20% | Match to user interests and past feedback |
| Conversational Quality | 15% | Great dialogue, chemistry, memorable exchanges |

The analyzer processes transcripts in 180-second sliding windows (90s step), scoring in parallel batches of 5. Clips scoring below 40 are discarded. The breadth-depth slider (0–100) controls whether the digest favors many short clips across episodes or fewer long clips from fewer sources.

## Digest Configuration

Users can customize every aspect of their digest:

- **Length**: 30 / 60 / 90 / 120 minutes
- **Clip length**: Short (2–4m) / Medium (4–8m) / Long (8–15m) / Mixed
- **Structure**: By score / By show / By topic / Chronological
- **Narrator voice**: 6 voice options (Alex, Morgan, Sarah, James, Luna, River)
- **Narration depth**: Brief (~15s) / Standard (~30s) / Detailed (~45s)
- **Background music**: Lo-fi / Ambient / Acoustic / Upbeat / None
- **Transitions**: Stinger / Soft fade / Whoosh / Silence
- **Delivery**: Day, time, and method (RSS / push / email / in-app)

## API Routes

All routes require authentication (NextAuth session) and use Zod request validation.

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/podcasts/search` | Search iTunes podcast directory |
| `POST` | `/api/podcasts/subscribe` | Subscribe to a podcast |
| `GET` | `/api/podcasts/subscriptions` | List active subscriptions |
| `PATCH` | `/api/podcasts/subscriptions/[id]` | Update subscription priority |
| `DELETE` | `/api/podcasts/subscriptions/[id]` | Unsubscribe |
| `GET` | `/api/digests` | List digests (paginated) |
| `GET` | `/api/digests/[id]` | Get digest with chapters and clips |
| `GET` | `/api/digests/latest` | Most recent completed digest |
| `POST` | `/api/digests/[id]/feedback` | Thumbs up/down on a clip |
| `GET` | `/api/config` | Get digest configuration |
| `PUT` | `/api/config` | Update digest configuration |
| `POST` | `/api/pipeline/trigger` | Manually trigger digest generation |

## License

Private — all rights reserved.
