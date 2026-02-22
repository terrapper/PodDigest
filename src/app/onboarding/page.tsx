"use client";

import { useState } from "react";
import { Headphones, Search, Settings, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const steps = [
  { id: 1, title: "Find Podcasts", icon: Search },
  { id: 2, title: "Set Preferences", icon: Settings },
  { id: 3, title: "Get Your Digest", icon: Headphones },
];

const suggestedPodcasts = [
  { name: "Lex Fridman Podcast", genre: "Technology", selected: false },
  { name: "Huberman Lab", genre: "Science", selected: false },
  { name: "All-In Podcast", genre: "Business", selected: false },
  { name: "How I Built This", genre: "Entrepreneurship", selected: false },
  { name: "Radiolab", genre: "Science", selected: false },
  { name: "The Tim Ferriss Show", genre: "Lifestyle", selected: false },
  { name: "My First Million", genre: "Business", selected: false },
  { name: "Acquired", genre: "Technology", selected: false },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPodcasts, setSelectedPodcasts] = useState<Set<string>>(new Set());

  const togglePodcast = (name: string) => {
    setSelectedPodcasts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
          <Headphones className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold gradient-primary-text">
          PodDigest AI
        </span>
      </div>

      {/* Steps indicator */}
      <div className="mb-10 flex items-center gap-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step.id <= currentStep
                    ? "gradient-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`text-sm ${
                  step.id <= currentStep
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-12 ${
                  step.id < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  What podcasts do you listen to?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Select some podcasts to get started, or search for your favorites.
                </p>
              </div>

              <Input
                placeholder="Search for podcasts..."
                className="bg-background"
              />

              <div className="grid grid-cols-2 gap-3">
                {suggestedPodcasts.map((podcast) => (
                  <button
                    key={podcast.name}
                    onClick={() => togglePodcast(podcast.name)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      selectedPodcasts.has(podcast.name)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selectedPodcasts.has(podcast.name)
                          ? "gradient-primary"
                          : "bg-muted"
                      }`}
                    >
                      <Headphones
                        className={`h-5 w-5 ${
                          selectedPodcasts.has(podcast.name)
                            ? "text-white"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {podcast.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {podcast.genre}
                      </p>
                    </div>
                    {selectedPodcasts.has(podcast.name) && (
                      <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-bold">
                Set your preferences
              </h2>
              <p className="text-muted-foreground">
                You can customize these anytime in the Configure section.
              </p>
              <div className="space-y-4 text-left">
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Digest Length</p>
                  <p className="text-sm text-muted-foreground">60 minutes (recommended)</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Delivery Schedule</p>
                  <p className="text-sm text-muted-foreground">Every Friday at 8:00 AM</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Narrator Voice</p>
                  <p className="text-sm text-muted-foreground">Alex — Warm and articulate</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
              <p className="text-muted-foreground">
                We&apos;ll start analyzing your podcast episodes and have your first
                digest ready soon.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex justify-between">
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            {currentStep < 3 ? (
              <Button
                variant="gradient"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={currentStep === 1 && selectedPodcasts.size === 0}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Link href="/dashboard">
                <Button variant="gradient">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
