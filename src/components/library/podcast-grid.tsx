"use client";

import Image from "next/image";
import Link from "next/link";
import { Library, Headphones } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Priority = "must" | "preferred" | "nice";

interface SubscribedPodcast {
  id: number;
  title: string;
  author: string;
  artworkUrl: string;
  episodeCount: number;
  priority: Priority;
  genre: string;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string }
> = {
  must: {
    label: "Must Listen",
    className:
      "bg-accent/15 text-accent border-accent/30 hover:bg-accent/25",
  },
  preferred: {
    label: "Preferred",
    className:
      "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25",
  },
  nice: {
    label: "Nice to Have",
    className:
      "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  },
};

const MOCK_PODCASTS: SubscribedPodcast[] = [
  {
    id: 1,
    title: "Lex Fridman Podcast",
    author: "Lex Fridman",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/1d/0a/4c/1d0a4ce3-1d53-65f8-ef50-c30de3e63778/mza_7781707873437498982.jpg/600x600bb.jpg",
    episodeCount: 420,
    priority: "must",
    genre: "Technology",
  },
  {
    id: 2,
    title: "Huberman Lab",
    author: "Andrew Huberman",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/24/1b/34/241b3404-95c5-8e31-4b72-2639bb7b1425/mza_8180374072498647498.jpg/600x600bb.jpg",
    episodeCount: 210,
    priority: "must",
    genre: "Science",
  },
  {
    id: 3,
    title: "The Tim Ferriss Show",
    author: "Tim Ferriss",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/42/3e/a3/423ea336-85c7-cca8-3513-55a9c9326a1f/mza_13189334982498498104.jpg/600x600bb.jpg",
    episodeCount: 730,
    priority: "preferred",
    genre: "Business",
  },
  {
    id: 4,
    title: "All-In Podcast",
    author: "All-In Podcast, LLC",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/0a/3c/3f/0a3c3f2e-8a3c-e32d-4e3e-a10ef3038b5b/mza_10414157776215498361.jpg/600x600bb.jpg",
    episodeCount: 195,
    priority: "preferred",
    genre: "Technology",
  },
  {
    id: 5,
    title: "Acquired",
    author: "Ben Gilbert & David Rosenthal",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/4a/d5/b3/4ad5b31f-8932-dd0b-8c4a-92a9b8f5f1db/mza_16162891987885146498.jpg/600x600bb.jpg",
    episodeCount: 190,
    priority: "nice",
    genre: "Business",
  },
  {
    id: 6,
    title: "Darknet Diaries",
    author: "Jack Rhysider",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/cf/3b/19/cf3b19f1-c30d-1899-83e7-41a498ae5269/mza_12169498015023810498.jpg/600x600bb.jpg",
    episodeCount: 155,
    priority: "nice",
    genre: "Technology",
  },
];

export function PodcastGrid() {
  const podcasts = MOCK_PODCASTS;

  if (podcasts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {podcasts.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
}

function PodcastCard({ podcast }: { podcast: SubscribedPodcast }) {
  const priorityConfig = PRIORITY_CONFIG[podcast.priority];

  return (
    <Link href={`/dashboard/library/${podcast.id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden border-border bg-card p-4 transition-all duration-300",
          "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
          "cursor-pointer"
        )}
      >
        {/* Subtle glow effect on hover */}
        <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]" />

        <div className="relative flex gap-4">
          {/* Artwork */}
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl shadow-md">
            <Image
              src={podcast.artworkUrl}
              alt={podcast.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="72px"
            />
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col">
            <h4 className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
              {podcast.title}
            </h4>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {podcast.author}
            </p>

            {/* Priority badge */}
            <div className="mt-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0 font-medium",
                  priorityConfig.className
                )}
              >
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" />
            <span>{podcast.episodeCount} episodes</span>
          </div>
          <Badge variant="secondary" className="text-[10px] px-2 py-0">
            {podcast.genre}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Library className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold">No podcasts yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Head over to the Discover tab to search and subscribe to your favorite
        podcasts. They will appear here once added.
      </p>
    </div>
  );
}

export { MOCK_PODCASTS };
