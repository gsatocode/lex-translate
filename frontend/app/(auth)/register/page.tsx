"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, ActionResult } from "../actions";

const initialState: ActionResult = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4 py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Form panel */}
        <section
          className="rounded-lg border p-8 md:p-10"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="mb-7">
            <span className="eyebrow">Create Workspace</span>
            <h1 className="mt-4 text-2xl">Start your organization</h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Provision a secure translation workspace for your agency or law firm.
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
                Organization name
              </label>
              <input
                name="org_name"
                type="text"
                required
                autoComplete="organization"
                className="field"
              />
            </div>

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
                autoComplete="new-password"
                minLength={8}
                className="field"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="primary-button w-full disabled:opacity-60"
            >
              {pending ? "Creating workspace..." : "Create Workspace"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Already have access?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--accent)" }}>
              Sign in
            </Link>
          </p>
        </section>

        {/* Marketing panel */}
        <section
          className="rounded-lg border p-8 md:p-12"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span className="eyebrow">Built For Legal Ops</span>
          <h2 className="mt-5 text-4xl leading-tight">
            From upload to translated output, with visibility at every stage.
          </h2>

          <div className="mt-8 divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              [
                "Source-aware intake",
                "Accept PDF, DOCX, JPG, and PNG files with queued processing.",
              ],
              [
                "Structured validation",
                "Inspect dates, numbers, and length anomalies before delivery.",
              ],
              [
                "Glossary controls",
                "Enforce organization terminology inside the translation pipeline.",
              ],
              [
                "Operational reporting",
                "Monitor cost, throughput, and job history in one place.",
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
      </div>
    </div>
  );
}
