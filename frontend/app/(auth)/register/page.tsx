"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, ActionResult } from "../actions";

const initialState: ActionResult = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="app-panel p-8 md:p-10">
          <div className="mb-8">
            <span className="eyebrow">Create Workspace</span>
            <h1 className="mt-5 text-3xl">Start your organization</h1>
            <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
              Provision a secure translation workspace for your agency or law firm and go straight into the dashboard.
            </p>
          </div>

          <form action={action} className="space-y-4">
            {state.error && (
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  background: "hsl(var(--destructive) / 0.1)",
                  color: "hsl(var(--destructive-foreground))",
                  border: "1px solid hsl(var(--destructive) / 0.3)",
                }}
              >
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Organization name
              </label>
              <input name="org_name" type="text" required autoComplete="organization" className="field" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Email
              </label>
              <input name="email" type="email" required autoComplete="email" className="field" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="field"
              />
            </div>

            <button type="submit" disabled={pending} className="primary-button w-full disabled:opacity-60">
              {pending ? "Creating workspace..." : "Create Workspace"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Already have access?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "hsl(var(--primary))" }}>
              Sign in
            </Link>
          </p>
        </section>

        <section className="app-panel relative overflow-hidden p-8 md:p-12">
          <span className="eyebrow">Built For Legal Ops</span>
          <h2 className="mt-6 max-w-2xl text-5xl leading-[0.92]">
            From upload to translated output, with visibility at every stage.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Source-aware intake", "Accept PDF, DOCX, JPG, and PNG files with queued processing."],
              ["Structured validation", "Inspect dates, numbers, and length anomalies before delivery."],
              ["Glossary controls", "Enforce organization terminology inside the translation pipeline."],
              ["Operational reporting", "Monitor cost, throughput, and recent job history in one place."],
            ].map(([title, copy]) => (
              <div key={title} className="app-panel-muted p-4">
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
