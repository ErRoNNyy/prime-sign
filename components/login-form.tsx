"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "@/app/actions";
import {
  AuthShell,
  AuthSubmitButton,
  authInputClass,
  authLabelClass,
} from "@/components/auth-shell";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("next", next);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Access your envelopes, contacts, and signing history."
      footer={
        <>
          No account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-sage transition-colors hover:text-sage-hover"
          >
            Sign up
          </Link>
        </>
      }
    >
      <form action={onSubmit} className="space-y-4">
        <label className="block">
          <span className={authLabelClass}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={authInputClass}
          />
        </label>
        <label className="block">
          <span className={authLabelClass}>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className={authInputClass}
          />
        </label>
        {error && (
          <p className="text-sm text-[#e8a0a0]" role="alert">
            {error}
          </p>
        )}
        <AuthSubmitButton
          pending={pending}
          idleLabel="Log in"
          pendingLabel="Signing in…"
        />
      </form>
    </AuthShell>
  );
}
