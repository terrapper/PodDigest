"use client";

import { useState, useEffect, useCallback } from "react";
import { Library, Search, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PodcastSearch } from "@/components/library/podcast-search";
import { PodcastGrid } from "@/components/library/podcast-grid";
import type { Subscription } from "@/components/library/podcast-grid";

export default function LibraryPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/podcasts/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubscriptions(data.subscriptions ?? []);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleUnsubscribe = async (subscriptionId: string) => {
    const res = await fetch(`/api/podcasts/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSubscriptions((prev) => prev.filter((s) => s.id !== subscriptionId));
    }
  };

  const handlePriorityChange = async (subscriptionId: string, priority: "MUST" | "PREFERRED" | "NICE") => {
    const res = await fetch(`/api/podcasts/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (res.ok) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscriptionId ? { ...s, priority } : s)),
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-primary-text">Podcast Library</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscriptions and discover new podcasts
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-podcasts" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="my-podcasts" className="gap-2">
            <Library className="h-4 w-4" />
            My Podcasts
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px] font-bold"
            >
              {subscriptions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2">
            <Search className="h-4 w-4" />
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-podcasts">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PodcastGrid
              subscriptions={subscriptions}
              onUnsubscribe={handleUnsubscribe}
              onPriorityChange={handlePriorityChange}
            />
          )}
        </TabsContent>

        <TabsContent value="discover">
          <PodcastSearch onSubscribed={fetchSubscriptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
