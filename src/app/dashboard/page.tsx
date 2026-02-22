"use client";

import {
  Play,
  Clock,
  Headphones,
  TrendingUp,
  Zap,
  ChevronRight,
  Podcast,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

// Mock data for the dashboard
const recentDigests = [
  {
    id: "1",
    title: "Weekly Tech & Culture Digest",
    date: "Feb 21, 2026",
    duration: "58 min",
    clipCount: 12,
    status: "COMPLETED" as const,
    podcasts: ["Lex Fridman", "Huberman Lab", "All-In Podcast"],
    artworkColors: ["from-purple-500", "to-orange-500"],
  },
  {
    id: "2",
    title: "Startup & Business Roundup",
    date: "Feb 14, 2026",
    duration: "45 min",
    clipCount: 9,
    status: "COMPLETED" as const,
    podcasts: ["How I Built This", "My First Million", "The Tim Ferriss Show"],
    artworkColors: ["from-blue-500", "to-purple-500"],
  },
  {
    id: "3",
    title: "Science & Health Weekly",
    date: "Feb 7, 2026",
    duration: "62 min",
    clipCount: 14,
    status: "COMPLETED" as const,
    podcasts: ["Huberman Lab", "Radiolab", "Science Vs"],
    artworkColors: ["from-green-500", "to-teal-500"],
  },
];

const stats = [
  {
    label: "Digests Generated",
    value: "24",
    icon: Headphones,
    change: "+3 this month",
  },
  {
    label: "Hours Saved",
    value: "142",
    icon: Clock,
    change: "~6h per digest",
  },
  {
    label: "Podcasts Tracked",
    value: "18",
    icon: Podcast,
    change: "Across 5 categories",
  },
  {
    label: "Top Clips Saved",
    value: "87",
    icon: TrendingUp,
    change: "12 this week",
  },
];

const processingDigest = {
  title: "This Week's Digest",
  status: "ANALYZING",
  progress: 45,
  step: "AI analyzing 23 episodes...",
  episodesProcessed: 11,
  totalEpisodes: 23,
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your podcast digest is being prepared. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Processing status */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{processingDigest.title}</h3>
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {processingDigest.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {processingDigest.step}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <Progress value={processingDigest.progress} className="h-2 flex-1" />
              <span className="text-sm font-medium text-muted-foreground">
                {processingDigest.progress}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent digests */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Digests</h2>
          <Link href="/dashboard/history">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentDigests.map((digest) => (
            <Card
              key={digest.id}
              className="group cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="p-5">
                {/* Gradient header */}
                <div
                  className={`mb-4 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br ${digest.artworkColors[0]} ${digest.artworkColors[1]} opacity-80`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Play className="h-6 w-6 text-white ml-0.5" />
                  </div>
                </div>

                <h3 className="font-semibold line-clamp-1">{digest.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {digest.date}
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {digest.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Headphones className="h-3 w-3" />
                    {digest.clipCount} clips
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {digest.podcasts.slice(0, 2).map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {name}
                    </Badge>
                  ))}
                  {digest.podcasts.length > 2 && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      +{digest.podcasts.length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
