-- CreateEnum
CREATE TYPE "SubscriptionPriority" AS ENUM ('MUST', 'PREFERRED', 'NICE');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClipLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG', 'MIXED');

-- CreateEnum
CREATE TYPE "DigestStructure" AS ENUM ('BY_SCORE', 'BY_SHOW', 'BY_TOPIC', 'CHRONOLOGICAL');

-- CreateEnum
CREATE TYPE "NarrationDepth" AS ENUM ('BRIEF', 'STANDARD', 'DETAILED');

-- CreateEnum
CREATE TYPE "MusicStyle" AS ENUM ('LOFI', 'AMBIENT', 'ACOUSTIC', 'UPBEAT', 'NONE');

-- CreateEnum
CREATE TYPE "TransitionStyle" AS ENUM ('STINGER', 'SOFT_FADE', 'WHOOSH', 'SILENCE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PRIVATE_RSS', 'PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('PENDING', 'CRAWLING', 'TRANSCRIBING', 'ANALYZING', 'NARRATING', 'ASSEMBLING', 'DELIVERING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Podcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "feedUrl" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "itunesId" TEXT,
    "category" TEXT,
    "language" TEXT DEFAULT 'en',
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Podcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "podcastId" TEXT NOT NULL,
    "priority" "SubscriptionPriority" NOT NULL DEFAULT 'PREFERRED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "podcastId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audioUrl" TEXT NOT NULL,
    "duration" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "guid" TEXT,
    "season" INTEGER,
    "episode" INTEGER,
    "imageUrl" TEXT,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "segments" JSONB,
    "language" TEXT DEFAULT 'en',
    "status" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Weekly Digest',
    "targetLength" INTEGER NOT NULL DEFAULT 60,
    "clipLengthPref" "ClipLength" NOT NULL DEFAULT 'MIXED',
    "structure" "DigestStructure" NOT NULL DEFAULT 'BY_SCORE',
    "breadthDepth" INTEGER NOT NULL DEFAULT 50,
    "voiceId" TEXT NOT NULL DEFAULT 'narrator-1',
    "narrationDepth" "NarrationDepth" NOT NULL DEFAULT 'STANDARD',
    "musicStyle" "MusicStyle" NOT NULL DEFAULT 'NONE',
    "transitionStyle" "TransitionStyle" NOT NULL DEFAULT 'SOFT_FADE',
    "deliveryDay" TEXT NOT NULL DEFAULT 'friday',
    "deliveryTime" TEXT NOT NULL DEFAULT '08:00',
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'IN_APP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3),
    "weekEnd" TIMESTAMP(3),
    "audioUrl" TEXT,
    "totalDuration" INTEGER,
    "clipCount" INTEGER NOT NULL DEFAULT 0,
    "chapters" JSONB,
    "status" "DigestStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestClip" (
    "id" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreDimensions" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "feedbackType" TEXT,

    CONSTRAINT "DigestClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Podcast_feedUrl_key" ON "Podcast"("feedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Podcast_itunesId_key" ON "Podcast"("itunesId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_podcastId_key" ON "Subscription"("userId", "podcastId");

-- CreateIndex
CREATE INDEX "Episode_podcastId_publishedAt_idx" ON "Episode"("podcastId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_podcastId_guid_key" ON "Episode"("podcastId", "guid");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_episodeId_key" ON "Transcript"("episodeId");

-- CreateIndex
CREATE INDEX "Digest_userId_createdAt_idx" ON "Digest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DigestClip_digestId_position_idx" ON "DigestClip"("digestId", "position");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestConfig" ADD CONSTRAINT "DigestConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Digest" ADD CONSTRAINT "Digest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Digest" ADD CONSTRAINT "Digest_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DigestConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestClip" ADD CONSTRAINT "DigestClip_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestClip" ADD CONSTRAINT "DigestClip_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
