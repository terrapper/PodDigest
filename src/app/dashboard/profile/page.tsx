"use client";

import { useState, useEffect } from "react";
import { UserCircle, Mail, Calendar, Library, Headphones, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [digestCount, setDigestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, subsRes, digestsRes] = await Promise.all([
          fetch("/api/user/me"),
          fetch("/api/podcasts/subscriptions"),
          fetch("/api/digests?limit=1"),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data.user);
        }
        if (subsRes.ok) {
          const data = await subsRes.json();
          setSubscriptionCount(data.subscriptions?.length ?? 0);
        }
        if (digestsRes.ok) {
          const data = await digestsRes.json();
          setDigestCount(data.pagination?.total ?? 0);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Unable to load profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-primary-text">Profile</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account information
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name || "User"}</h2>
              <p className="text-sm text-muted-foreground">Member</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border p-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border p-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Library className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subscriptionCount}</p>
              <p className="text-xs text-muted-foreground">Subscriptions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{digestCount}</p>
              <p className="text-xs text-muted-foreground">Digests</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
