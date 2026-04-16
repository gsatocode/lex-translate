"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, ActionResult } from "../actions";

const initialState: ActionResult = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4 py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Marketing panel */}
        <section
          className="rounded-lg border p-8 md:p-10"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span className="eyebrow">Secure Intake</span>
          <h1 className="mt-5 text-4xl leading-tight">
            Legal translation with a cleaner operating surface.
          </h1>
          <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            Upload documents, route them through the AI pipeline, inspect validation issues, and
            deliver translated output from one workspace.
          </p>

          <div className="mt-8 divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              ["Queue-aware", "Track OCR, chunking, translation, and reconstruction live."],
              [
                "Glossary-controlled",
                "Keep legal terminology locked to your preferred phrasing.",
              ],
              [
                "Download-ready",
                "Pull final PDF or DOCX outputs the moment processing finishes.",
              ],
            ].map(([title, copy]) => (
              <div key={title} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Form panel */}
        <section
          className="rounded-lg border p-8 md:p-10"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="mb-7">
            <span className="eyebrow">Sign In</span>
            <h2 className="mt-4 text-2xl">Welcome back</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Use your organization account to access jobs and glossary controls.
            </p>
          </div>

          <form action={action} className="space-y-4">
            {state.error && (
              <div
                className="rounded border-l-4 px-4 py-3 text-sm"
                style={{
                  borderLeftColor: "var(--destructive)",
                  background: "#fef2f2",
                  color: "var(--destructive)",
                }}
              >
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Email
              </label>
              <input name="email" type="email" required autoComplete="email" className="field" />
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
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

            <button
              type="submit"
              disabled={pending}
              className="primary-button w-full disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Need an organization workspace?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "var(--accent)" }}>
              Create one
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
