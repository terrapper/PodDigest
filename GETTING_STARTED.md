# PodDigest AI — Getting Started with Claude Code

## Prerequisites

1. **Node.js 18+** — https://nodejs.org
2. **Claude Code** — Install via npm:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
3. **PostgreSQL** — Local install or Docker
4. **Redis** — Local install or Docker
5. **FFmpeg** — Required for audio processing
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg
   ```

## Quick Start

### 1. Create the project
```bash
mkdir poddigest-ai && cd poddigest-ai
```

### 2. Place the CLAUDE.md file
Copy the `CLAUDE.md` file into the project root. This is the instruction file that Claude Code reads automatically to understand the project context, architecture, and conventions.

```bash
# Copy from wherever you downloaded it
cp ~/Downloads/CLAUDE.md .
```

### 3. Launch Claude Code
```bash
claude
```

### 4. Tell Claude Code to scaffold the project
Once Claude Code is running, give it this prompt:

---

**Prompt to paste into Claude Code:**

```
Initialize the PodDigest AI project following the CLAUDE.md spec. Do the following in order:

1. Initialize a Next.js 14 project with TypeScript, Tailwind CSS, App Router, and src/ directory
2. Install all dependencies: prisma, @prisma/client, bull, ioredis, @anthropic-ai/sdk, fluent-ffmpeg, rss-parser, aws-sdk (v3 clients for S3), next-auth, zod, lucide-react
3. Install shadcn/ui and add these components: button, card, input, slider, tabs, badge, dropdown-menu, dialog, separator, skeleton, toast, progress
4. Set up the Prisma schema with all models from CLAUDE.md (User, Podcast, Subscription, Episode, Transcript, DigestConfig, Digest, DigestClip)
5. Create the .env.example file with all required environment variables
6. Create the project structure from CLAUDE.md with placeholder files
7. Build the full frontend starting with the dashboard layout, podcast library (with iTunes search), digest configuration page, and audio player — port the design from the prototype we built (dark theme, purple/orange gradient accents, DM Sans font, the full config UI with voice selection, the chapter-based player)

Start with steps 1-6, then move to step 7.
```

---

### 5. Build the backend pipeline
After the frontend is scaffolded, continue with:

```
Now build the backend services:

1. feed-crawler.ts — RSS parsing with rss-parser, fetch new episodes since last crawl
2. audio-downloader.ts — Download episode MP3s to S3 with progress tracking
3. transcription.ts — Deepgram API integration with word-level timestamps and speaker diarization
4. ai-analyst.ts — Claude API prompt that scores transcript segments across the 5 dimensions, outputs a ranked clip manifest with timestamps
5. narration.ts — Claude API generates transition scripts, ElevenLabs synthesizes to audio files
6. audio-assembler.ts — FFmpeg pipeline that extracts clips at timestamps, interleaves narration audio, applies crossfades, normalizes loudness, renders final MP3
7. delivery.ts — Upload to S3, generate private RSS feed XML, send notifications

Wire these into Bull queue workers that execute in sequence. Create the pipeline orchestrator that triggers the full flow on a cron schedule.
```

### 6. API routes
```
Build the API routes:

1. POST /api/podcasts/search — proxy to iTunes Search API
2. POST /api/podcasts/subscribe — add subscription with priority
3. GET /api/podcasts/subscriptions — list user's subscribed podcasts
4. PATCH /api/podcasts/subscriptions/[id] — update priority
5. DELETE /api/podcasts/subscriptions/[id] — unsubscribe
6. GET /api/digests — list user's digests (paginated)
7. GET /api/digests/[id] — get digest with chapters and clips
8. GET /api/digests/latest — get most recent digest
9. POST /api/digests/[id]/feedback — submit clip feedback (thumbs up/down)
10. GET /api/config — get user's digest config
11. PUT /api/config — update digest config
12. POST /api/pipeline/trigger — manually trigger digest generation

All routes should use Zod validation, proper error handling, and NextAuth session checks.
```

## API Keys You'll Need

| Service | Purpose | Get it at |
|---------|---------|-----------|
| **Anthropic** | AI analysis & narration scripts | https://console.anthropic.com |
| **Deepgram** | Podcast transcription | https://console.deepgram.com |
| **ElevenLabs** | AI narrator voice synthesis | https://elevenlabs.io |
| **AWS** | S3 storage for audio files | https://aws.amazon.com |

## Development Workflow

```bash
# Start the database
docker run -d --name poddigest-db -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=poddigest postgres:16

# Start Redis
docker run -d --name poddigest-redis -p 6379:6379 redis:7

# Run database migrations
npx prisma migrate dev

# Start the dev server
npm run dev

# In another terminal, start the worker process
npm run worker
```

## Docker Compose (alternative)
You can also ask Claude Code to generate a `docker-compose.yml` that spins up PostgreSQL, Redis, and the app together.

## Key Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project spec — Claude Code reads this automatically |
| `prisma/schema.prisma` | Database schema |
| `src/services/ai-analyst.ts` | The core AI scoring logic |
| `src/services/audio-assembler.ts` | FFmpeg pipeline for final digest |
| `src/workers/pipeline.ts` | Orchestrates the full 7-step flow |
| `src/app/dashboard/page.tsx` | Main player/home screen |
| `src/app/dashboard/library/page.tsx` | Podcast search & management |
| `src/app/dashboard/configure/page.tsx` | Digest settings |
