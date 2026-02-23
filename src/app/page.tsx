"use client";

import { Headphones, Zap, Music, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Claude AI scores every segment across 5 dimensions to find the most compelling moments from your podcasts.",
  },
  {
    icon: Music,
    title: "Original Audio Clips",
    description:
      "Hear the actual hosts, guests, and conversations — stitched together with professional AI narration.",
  },
  {
    icon: Zap,
    title: "Weekly Auto-Digest",
    description:
      "Set it and forget it. Your personalized digest is generated and delivered every week on your schedule.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-primary-text">
            PodDigest AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="gradient">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center lg:pt-32">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
          AI-Powered Podcast Digests
        </Badge>
        <h1 className="text-5xl font-bold leading-tight tracking-tight lg:text-7xl">
          Your podcasts,{" "}
          <span className="gradient-primary-text">distilled</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-xl">
          PodDigest AI analyzes your favorite podcasts, extracts the most
          compelling moments with original audio, and delivers a professionally
          narrated weekly digest.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/auth/signup">
            <Button variant="gradient" size="lg" className="text-base px-8">
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="text-base"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            See how it works
          </Button>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
          <div>
            <p className="text-3xl font-bold gradient-primary-text">85%</p>
            <p className="mt-1 text-sm text-muted-foreground">Original audio</p>
          </div>
          <div>
            <p className="text-3xl font-bold gradient-primary-text">15%</p>
            <p className="mt-1 text-sm text-muted-foreground">AI narrator</p>
          </div>
          <div>
            <p className="text-3xl font-bold gradient-primary-text">60m</p>
            <p className="mt-1 text-sm text-muted-foreground">Weekly digest</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Digest anatomy */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold">
          Anatomy of a <span className="gradient-primary-text">Digest</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Each digest follows a proven structure: an AI narrator guides you
          between 8-20 original podcast clips, with smooth transitions and
          context.
        </p>
        <div className="mt-10 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 flex-[8.5] rounded-full bg-gradient-to-r from-purple-500 to-purple-400" />
            <div className="h-3 flex-[1.5] rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Original Podcast Audio (~85%)</span>
            <span>AI Narrator (~15%)</span>
          </div>
          <div className="mt-6 text-left text-sm text-muted-foreground space-y-2">
            <p>
              <span className="text-foreground font-medium">Opening</span> →
              AI narrator introduces the week&apos;s themes
            </p>
            <p>
              <span className="text-foreground font-medium">
                Clip Intro → Original Audio → Transition
              </span>{" "}
              × 8-20 segments
            </p>
            <p>
              <span className="text-foreground font-medium">Closing</span> →
              AI narrator wraps up key takeaways
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <div className="rounded-2xl gradient-primary p-12">
          <h2 className="text-3xl font-bold text-white">
            Ready to save hours every week?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/80">
            Subscribe to your favorite podcasts and let AI curate the best
            moments for you.
          </p>
          <Link href="/auth/signup">
            <Button
              size="lg"
              className="mt-8 bg-white text-gray-900 hover:bg-white/90 text-base px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <p>PodDigest AI — AI-powered podcast digest generator</p>
      </footer>
    </div>
  );
}
