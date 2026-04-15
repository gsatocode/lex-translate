"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, ActionResult } from "../actions";

const initialState: ActionResult = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="app-panel relative overflow-hidden p-8 md:p-12">
          <span className="eyebrow">Secure Intake</span>
          <h1 className="mt-6 max-w-2xl text-5xl leading-[0.92]">
            Legal translation with a clearer operational surface.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7" style={{ color: "hsl(var(--muted-foreground))" }}>
            Upload client documents, route them through the AI pipeline, inspect validation issues,
            and deliver polished translated output from one workspace.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Queue-aware", "Track OCR, chunking, translation, and reconstruction live."],
              ["Glossary-controlled", "Keep legal terminology locked to your preferred phrasing."],
              ["Download-ready", "Pull final PDF or DOCX outputs the moment processing finishes."],
            ].map(([title, copy]) => (
              <div key={title} className="app-panel-muted p-4">
                <h2 className="text-lg">{title}</h2>
                <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-panel p-8 md:p-10">
          <div className="mb-8">
            <span className="eyebrow">Sign In</span>
            <h2 className="mt-5 text-3xl">Welcome back</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
              Use your organization account to access active jobs, glossary control, and completed translations.
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
                autoComplete="current-password"
                className="field"
              />
            </div>

            <button type="submit" disabled={pending} className="primary-button w-full disabled:opacity-60">
              {pending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Need an organization workspace?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "hsl(var(--primary))" }}>
              Create one
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
