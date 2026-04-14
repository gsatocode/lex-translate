"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, ActionResult } from "../actions";

const initialState: ActionResult = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Lex Translate
          </h1>
          <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Create your organization
          </p>
        </div>

        <form action={action} className="space-y-4">
          {state.error && (
            <div
              className="rounded-md px-4 py-3 text-sm"
              style={{
                background: "hsl(var(--destructive) / 0.1)",
                color: "hsl(var(--destructive-foreground))",
                border: "1px solid hsl(var(--destructive) / 0.3)",
              }}
            >
              {state.error}
            </div>
          )}

          <div className="space-y-1">
            <label
              className="block text-sm font-medium"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Organization name
            </label>
            <input
              name="org_name"
              type="text"
              required
              autoComplete="organization"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{
                background: "hsl(var(--input))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            />
          </div>

          <div className="space-y-1">
            <label
              className="block text-sm font-medium"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{
                background: "hsl(var(--input))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            />
          </div>

          <div className="space-y-1">
            <label
              className="block text-sm font-medium"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{
                background: "hsl(var(--input))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md py-2 text-sm font-medium transition-opacity disabled:opacity-60"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "hsl(var(--primary))" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
