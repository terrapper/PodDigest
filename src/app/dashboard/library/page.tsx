"use client";

import { Library, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PodcastSearch } from "@/components/library/podcast-search";
import { PodcastGrid, MOCK_PODCASTS } from "@/components/library/podcast-grid";

export default function LibraryPage() {
  const subscriptionCount = MOCK_PODCASTS.length;

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
              {subscriptionCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2">
            <Search className="h-4 w-4" />
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-podcasts">
          <PodcastGrid />
        </TabsContent>

        <TabsContent value="discover">
          <PodcastSearch />
        </TabsContent>
      </Tabs>
    </div>
  );
}
