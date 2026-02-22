"use client";

import { useState } from "react";
import Image from "next/image";
import { Library, Headphones, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Priority = "MUST" | "PREFERRED" | "NICE";

export interface Subscription {
  id: string;
  priority: Priority;
  podcast: {
    id: string;
    title: string;
    author: string | null;
    artworkUrl: string | null;
    feedUrl: string;
    category: string | null;
  };
}

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string }
> = {
  MUST: {
    label: "Must Listen",
    className:
      "bg-accent/15 text-accent border-accent/30 hover:bg-accent/25",
  },
  PREFERRED: {
    label: "Preferred",
    className:
      "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25",
  },
  NICE: {
    label: "Nice to Have",
    className:
      "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  },
};

const PRIORITY_OPTIONS: Priority[] = ["MUST", "PREFERRED", "NICE"];

interface PodcastGridProps {
  subscriptions: Subscription[];
  onUnsubscribe: (subscriptionId: string) => Promise<void>;
  onPriorityChange: (subscriptionId: string, priority: Priority) => Promise<void>;
}

export function PodcastGrid({ subscriptions, onUnsubscribe, onPriorityChange }: PodcastGridProps) {
  if (subscriptions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subscriptions.map((sub) => (
        <PodcastCard
          key={sub.id}
          subscription={sub}
          onUnsubscribe={onUnsubscribe}
          onPriorityChange={onPriorityChange}
        />
      ))}
    </div>
  );
}

function PodcastCard({
  subscription,
  onUnsubscribe,
  onPriorityChange,
}: {
  subscription: Subscription;
  onUnsubscribe: (id: string) => Promise<void>;
  onPriorityChange: (id: string, priority: Priority) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const { podcast, priority } = subscription;
  const priorityConfig = PRIORITY_CONFIG[priority];

  const handleUnsubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onUnsubscribe(subscription.id);
    } finally {
      setLoading(false);
    }
  };

  const cyclePriority = async () => {
    const currentIndex = PRIORITY_OPTIONS.indexOf(priority);
    const nextPriority = PRIORITY_OPTIONS[(currentIndex + 1) % PRIORITY_OPTIONS.length];
    await onPriorityChange(subscription.id, nextPriority);
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border bg-card p-4 transition-all duration-300",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]" />

      {/* Unsubscribe button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
        onClick={handleUnsubscribe}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </Button>

      <div className="relative flex gap-4">
        {/* Artwork */}
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl shadow-md">
          {podcast.artworkUrl ? (
            <Image
              src={podcast.artworkUrl}
              alt={podcast.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="72px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Headphones className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
            {podcast.title}
          </h4>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {podcast.author || "Unknown author"}
          </p>

          {/* Priority badge — click to cycle */}
          <div className="mt-2">
            <button onClick={cyclePriority}>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0 font-medium cursor-pointer",
                  priorityConfig.className,
                )}
              >
                {priorityConfig.label}
              </Badge>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" />
          <span>{podcast.category || "Podcast"}</span>
        </div>
      </div>
    </Card>
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
