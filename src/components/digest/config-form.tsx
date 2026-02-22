"use client";

import { useState } from "react";
import {
  Clock,
  Scissors,
  LayoutList,
  SlidersHorizontal,
  Mic2,
  MessageSquare,
  Music,
  Waves,
  Calendar,
  Timer,
  Send,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { VoiceSelector } from "@/components/digest/voice-selector";
import {
  TARGET_LENGTHS,
  CLIP_LENGTH_OPTIONS,
  STRUCTURE_OPTIONS,
  NARRATION_DEPTH_OPTIONS,
  MUSIC_OPTIONS,
  TRANSITION_OPTIONS,
  DELIVERY_DAYS,
  DELIVERY_TIMES,
  DELIVERY_METHODS,
} from "@/types";

// ─── Section Header ───────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── Option Label ─────────────────────────────────────────────

function OptionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}

// ─── Toggle Button Group ──────────────────────────────────────

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
            "hover:bg-muted/50",
            value === option.key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
          )}
          title={option.description}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ─── Pill Button Group (compact) ──────────────────────────────

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
            value === option.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ─── Config Form ──────────────────────────────────────────────

export function ConfigForm() {
  // Content state
  const [targetLength, setTargetLength] = useState("60");
  const [clipLength, setClipLength] = useState("MEDIUM");
  const [structure, setStructure] = useState("BY_SCORE");
  const [breadthDepth, setBreadthDepth] = useState([50]);

  // Voice & Audio state
  const [voiceId, setVoiceId] = useState("narrator-1");
  const [narrationDepth, setNarrationDepth] = useState("STANDARD");
  const [musicStyle, setMusicStyle] = useState("LOFI");
  const [transitionStyle, setTransitionStyle] = useState("SOFT_FADE");

  // Delivery state
  const [deliveryDay, setDeliveryDay] = useState("saturday");
  const [deliveryTime, setDeliveryTime] = useState("08:00");
  const [deliveryMethod, setDeliveryMethod] = useState("IN_APP");

  const handleSave = () => {
    const config = {
      targetLength: Number(targetLength),
      clipLength,
      structure,
      breadthDepth: breadthDepth[0],
      voiceId,
      narrationDepth,
      musicStyle,
      transitionStyle,
      deliveryDay,
      deliveryTime,
      deliveryMethod,
    };
    // TODO: Save config via API
    console.log("Saving config:", config);
  };

  return (
    <div className="space-y-8">
      {/* ─── Content Section ──────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            icon={LayoutList}
            title="Content"
            description="Control the length, structure, and composition of your weekly digest."
          />

          <div className="space-y-6">
            {/* Target Length */}
            <div>
              <OptionLabel icon={Clock} label="Target Length" />
              <PillGroup
                options={TARGET_LENGTHS.map((t) => ({
                  key: String(t.value),
                  label: t.label,
                }))}
                value={targetLength}
                onChange={setTargetLength}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {TARGET_LENGTHS.find((t) => String(t.value) === targetLength)
                  ?.description}
              </p>
            </div>

            <Separator />

            {/* Clip Length Preference */}
            <div>
              <OptionLabel icon={Scissors} label="Clip Length Preference" />
              <ToggleGroup
                options={Object.entries(CLIP_LENGTH_OPTIONS).map(
                  ([key, opt]) => ({
                    key,
                    label: opt.label,
                    description: opt.description,
                  })
                )}
                value={clipLength}
                onChange={setClipLength}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {CLIP_LENGTH_OPTIONS[
                  clipLength as keyof typeof CLIP_LENGTH_OPTIONS
                ]?.description}
              </p>
            </div>

            <Separator />

            {/* Structure */}
            <div>
              <OptionLabel icon={LayoutList} label="Structure" />
              <ToggleGroup
                options={Object.entries(STRUCTURE_OPTIONS).map(
                  ([key, opt]) => ({
                    key,
                    label: opt.label,
                    description: opt.description,
                  })
                )}
                value={structure}
                onChange={setStructure}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {STRUCTURE_OPTIONS[
                  structure as keyof typeof STRUCTURE_OPTIONS
                ]?.description}
              </p>
            </div>

            <Separator />

            {/* Breadth ↔ Depth Slider */}
            <div>
              <OptionLabel icon={SlidersHorizontal} label="Breadth vs Depth" />
              <div className="px-1">
                <Slider
                  value={breadthDepth}
                  onValueChange={setBreadthDepth}
                  max={100}
                  min={0}
                  step={1}
                  className="my-4"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    More shows, fewer clips
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Fewer shows, deeper clips
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Voice & Audio Section ────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            icon={Mic2}
            title="Voice & Audio"
            description="Choose your narrator and set the mood for your digest."
          />

          <div className="space-y-6">
            {/* Voice Selector */}
            <div>
              <OptionLabel icon={Mic2} label="Narrator Voice" />
              <VoiceSelector value={voiceId} onChange={setVoiceId} />
            </div>

            <Separator />

            {/* Narration Depth */}
            <div>
              <OptionLabel icon={MessageSquare} label="Narration Depth" />
              <ToggleGroup
                options={Object.entries(NARRATION_DEPTH_OPTIONS).map(
                  ([key, opt]) => ({
                    key,
                    label: opt.label,
                    description: opt.description,
                  })
                )}
                value={narrationDepth}
                onChange={setNarrationDepth}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {NARRATION_DEPTH_OPTIONS[
                  narrationDepth as keyof typeof NARRATION_DEPTH_OPTIONS
                ]?.description}
              </p>
            </div>

            <Separator />

            {/* Background Music */}
            <div>
              <OptionLabel icon={Music} label="Background Music" />
              <ToggleGroup
                options={Object.entries(MUSIC_OPTIONS).map(([key, opt]) => ({
                  key,
                  label: opt.label,
                  description: opt.description,
                }))}
                value={musicStyle}
                onChange={setMusicStyle}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {MUSIC_OPTIONS[musicStyle as keyof typeof MUSIC_OPTIONS]
                  ?.description}
              </p>
            </div>

            <Separator />

            {/* Transition Style */}
            <div>
              <OptionLabel icon={Waves} label="Transitions" />
              <ToggleGroup
                options={Object.entries(TRANSITION_OPTIONS).map(
                  ([key, opt]) => ({
                    key,
                    label: opt.label,
                    description: opt.description,
                  })
                )}
                value={transitionStyle}
                onChange={setTransitionStyle}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {TRANSITION_OPTIONS[
                  transitionStyle as keyof typeof TRANSITION_OPTIONS
                ]?.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Delivery Section ─────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            icon={Send}
            title="Delivery"
            description="When and how you receive your weekly digest."
          />

          <div className="space-y-6">
            {/* Delivery Day */}
            <div>
              <OptionLabel icon={Calendar} label="Day" />
              <PillGroup
                options={DELIVERY_DAYS.map((d) => ({
                  key: d.value,
                  label: d.label,
                }))}
                value={deliveryDay}
                onChange={setDeliveryDay}
              />
            </div>

            <Separator />

            {/* Delivery Time */}
            <div>
              <OptionLabel icon={Timer} label="Time" />
              <PillGroup
                options={DELIVERY_TIMES.map((t) => ({
                  key: t.value,
                  label: t.label,
                }))}
                value={deliveryTime}
                onChange={setDeliveryTime}
              />
            </div>

            <Separator />

            {/* Delivery Method */}
            <div>
              <OptionLabel icon={Send} label="Delivery Method" />
              <ToggleGroup
                options={Object.entries(DELIVERY_METHODS).map(
                  ([key, opt]) => ({
                    key,
                    label: opt.label,
                    description: opt.description,
                  })
                )}
                value={deliveryMethod}
                onChange={setDeliveryMethod}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {DELIVERY_METHODS[
                  deliveryMethod as keyof typeof DELIVERY_METHODS
                ]?.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Save Button ──────────────────────────────────── */}
      <div className="flex justify-end pb-8">
        <Button
          variant="gradient"
          size="lg"
          className="min-w-[200px]"
          onClick={handleSave}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
