# PodDigest AI

## Project Overview
PodDigest AI is an AI-powered podcast digest generator that collects episodes from a user's favorite podcasts weekly, analyzes content using AI to identify the most compelling moments, extracts original audio clips from the source episodes, and produces a professionally narrated weekly audio digest.

The key differentiator: **the digest features original podcast audio** — the actual hosts, guests, and conversations — stitched together with AI-narrated contextual intros, transitions, and outros. The AI narrator is a guide between segments, never a replacement for the original voices.

## Architecture

### Tech Stack
- **Frontend:** Next.js 14+ (App Router) with React, Tailwind CSS
- **Backend API:** Next.js API routes (migrating to standalone Node.js/Express if needed)
- **Database:** PostgreSQL via Prisma ORM
- **Queue/Workers:** Bull (Redis-backed) for async podcast processing pipeline
- **AI/ML:** Anthropic Claude API for content analysis & narration script generation
- **Transcription:** Deepgram API (primary) or OpenAI Whisper (fallback)
- **Voice Synthesis:** ElevenLabs API for narrator voice generation
- **Audio Processing:** FFmpeg via fluent-ffmpeg for clip extraction, mixing, normalization
- **Podcast Discovery:** iTunes Search API for finding podcasts, RSS parsing via rss-parser
- **Storage:** AWS S3 (or compatible) for episode audio, clips, and final digests
- **CDN:** CloudFront for digest delivery
- **Auth:** NextAuth.js with email/OAuth providers

### Core Pipeline (7-step process)
1. **Feed Crawler** — Fetches new episodes from subscribed RSS feeds on schedule
2. **Audio Downloader** — Downloads full episode audio files to S3 for processing
3. **Transcription Engine** — Produces word-level timestamped, speaker-diarized transcripts
4. **AI Analyst** — Claude API analyzes transcripts, scores segments across 5 dimensions (insight density, emotional intensity, actionability, topical relevance, conversational quality), outputs ranked clip manifest with precise timestamps
5. **Narration Generator** — Claude API writes contextual intro/transition/outro scripts; ElevenLabs synthesizes to audio
6. **Audio Assembler** — FFmpeg extracts original clips at timestamps, interleaves narration, applies crossfades/music, normalizes loudness, renders final MP3
7. **Delivery Engine** — Uploads to S3/CDN, updates private RSS feed, triggers notifications

### Digest Anatomy (~60 min example)
- ~85% original podcast audio (50-52 min)
- ~15% AI narrator (8-10 min)
- Pattern: Opening → [Clip Intro → Original Audio Clip → Transition] × 8-20 → Closing

## Project Structure
```
poddigest-ai/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing/marketing page
│   │   ├── dashboard/         # Main app (post-auth)
│   │   │   ├── page.tsx       # Digest player / home
│   │   │   ├── library/       # Podcast subscription management
│   │   │   ├── configure/     # Digest configuration
│   │   │   └── history/       # Past digests
│   │   ├── api/
│   │   │   ├── podcasts/      # Search, subscribe, manage
│   │   │   ├── digests/       # Digest CRUD, playback
│   │   │   ├── pipeline/      # Trigger/monitor processing
│   │   │   ├── webhooks/      # Deepgram callbacks, etc.
│   │   │   └── auth/          # NextAuth routes
│   │   └── onboarding/        # First-time user flow
│   ├── components/
│   │   ├── ui/                # Shared UI components (shadcn/ui)
│   │   ├── player/            # Audio player components
│   │   ├── library/           # Podcast library components
│   │   └── digest/            # Digest config & display
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── queue.ts           # Bull queue setup
│   │   └── utils.ts           # Shared utilities
│   ├── services/
│   │   ├── feed-crawler.ts    # RSS feed fetching & parsing
│   │   ├── audio-downloader.ts # Episode audio download to S3
│   │   ├── transcription.ts   # Deepgram/Whisper integration
│   │   ├── ai-analyst.ts      # Claude API segment scoring
│   │   ├── narration.ts       # Script generation + ElevenLabs
│   │   ├── audio-assembler.ts # FFmpeg clip extraction & mixing
│   │   └── delivery.ts        # S3 upload, RSS feed, notifications
│   ├── workers/
│   │   ├── pipeline.ts        # Main digest pipeline orchestrator
│   │   ├── crawl.worker.ts    # Feed crawling worker
│   │   ├── transcribe.worker.ts
│   │   ├── analyze.worker.ts
│   │   ├── narrate.worker.ts
│   │   ├── assemble.worker.ts
│   │   └── deliver.worker.ts
│   └── types/
│       └── index.ts           # Shared TypeScript types
├── public/
├── CLAUDE.md                  # This file
├── PRD.md                     # Product Requirements Document
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.example
```

## Key Data Models

### User
- id, email, name, preferences (JSON), createdAt

### Podcast
- id, title, author, feedUrl, artworkUrl, category, lastCrawledAt

### Subscription
- id, userId, podcastId, priority (must/preferred/nice), addedAt

### Episode
- id, podcastId, title, audioUrl, publishedAt, duration, transcriptStatus

### Transcript
- id, episodeId, fullText, segments (JSON array with start/end timestamps, speaker, text)

### DigestConfig
- id, userId, targetLength, clipLength, structure, voiceId, narrationDepth, musicStyle, transitionStyle, deliveryDay, deliveryTime, deliveryMethod

### Digest
- id, userId, configId, weekStart, weekEnd, status (processing/ready/delivered), audioUrl, chapters (JSON), totalDuration, clipCount, createdAt

### DigestClip
- id, digestId, episodeId, startTime, endTime, score, scoreDimensions (JSON), position, feedbackType (thumbsUp/thumbsDown/null)

## Configuration Options
| Category | Setting | Options |
|----------|---------|---------|
| Length | Target Length | 30m / 60m / 90m / 120m |
| Content | Clip Length Pref | Short (2-4m) / Medium (4-8m) / Long (8-15m) / Mixed |
| Content | Structure | By Score / By Show / By Topic / Chronological |
| Content | Breadth ↔ Depth | Slider 0-100 |
| Voice | Narrator | 6+ voice options with preview |
| Voice | Narration Depth | Brief / Standard / Detailed |
| Audio | Background Music | Lo-fi / Ambient / Acoustic / Upbeat / None |
| Audio | Transitions | Stinger / Soft Fade / Whoosh / Silence |
| Delivery | Day | Fri / Sat / Sun / Mon |
| Delivery | Time | 6 AM / 8 AM / Noon / 6 PM |
| Delivery | Method | Private RSS / Push / Email / In-App |

## AI Segment Scoring Dimensions
Each transcript segment is scored 0-100 across:
1. **Insight Density (25%)** — Novel information, unique perspectives, surprising data
2. **Emotional Intensity (20%)** — Compelling storytelling, humor, vulnerability, passion
3. **Actionability (20%)** — Practical takeaways, advice, steps listeners can apply
4. **Topical Relevance (20%)** — Match to user's stated interests and past feedback
5. **Conversational Quality (15%)** — Great dialogue, chemistry, memorable exchanges

## Development Priorities
### Phase 1 — MVP (build this first)
1. Podcast search & subscription (iTunes API)
2. RSS feed crawling & episode audio download
3. Transcription pipeline (Deepgram)
4. AI analysis & segment scoring (Claude API)
5. Basic narration generation (Claude API + ElevenLabs)
6. Audio assembly (FFmpeg clip extraction + narration interleaving)
7. Web player with chapter markers
8. Digest configuration UI
9. Weekly scheduled pipeline execution

### Phase 2 — Personalization
- Feedback loop (thumbs up/down) influencing future scoring
- Topic preference learning
- Show priority weighting in clip selection
- Multiple digest profiles

### Phase 3 — Social & Growth
- Share individual clips
- Community-curated digest templates
- Creator analytics dashboard

## Environment Variables Needed
```
DATABASE_URL=
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=
REDIS_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Code Style
- TypeScript strict mode
- Functional components with hooks
- Server Components by default, 'use client' only when needed
- Tailwind CSS for styling (no CSS modules)
- shadcn/ui for base components
- Error boundaries on all major sections
- Zod for API validation
- Descriptive variable names, minimal comments (code should be self-documenting)
