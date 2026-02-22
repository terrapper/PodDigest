"use client";

import { ConfigForm } from "@/components/digest/config-form";

export default function ConfigurePage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight gradient-primary-text">
          Digest Configuration
        </h1>
        <p className="mt-2 text-muted-foreground">
          Customize how your weekly podcast digest is built, narrated, and
          delivered. Changes apply to your next digest.
        </p>
      </div>

      {/* Config Form */}
      <ConfigForm />
    </div>
  );
}
