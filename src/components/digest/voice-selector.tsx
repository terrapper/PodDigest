"use client";

import { Play, User, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VOICE_OPTIONS, type VoiceOption } from "@/types";

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
}

function GenderIcon({ gender }: { gender?: VoiceOption["gender"] }) {
  switch (gender) {
    case "male":
      return <User className="h-5 w-5" />;
    case "female":
      return <UserCircle className="h-5 w-5" />;
    default:
      return <User className="h-5 w-5" />;
  }
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {VOICE_OPTIONS.map((voice) => {
        const isSelected = value === voice.id;
        return (
          <button
            key={voice.id}
            type="button"
            onClick={() => onChange(voice.id)}
            className={cn(
              "relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all",
              "hover:bg-muted/50",
              isSelected
                ? "border-primary bg-primary/5 shadow-[0_0_12px_-2px_hsl(270,60%,58%,0.4)]"
                : "border-border bg-card"
            )}
          >
            {/* Top row: icon + preview button */}
            <div className="flex w-full items-center justify-between">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <GenderIcon gender={voice.gender} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  isSelected
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  // Placeholder: preview voice
                }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Voice info */}
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isSelected ? "text-foreground" : "text-foreground"
                )}
              >
                {voice.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {voice.description}
              </p>
            </div>

            {/* Selected indicator dot */}
            {isSelected && (
              <div className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full gradient-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
