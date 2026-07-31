"use client";

import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/app/actions";
import {
  AuthShell,
  AuthSubmitButton,
  authInputClass,
  authLabelClass,
} from "@/components/auth-shell";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="Start sending envelopes with OTP-verified signatures."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-sage transition-colors hover:text-sage-hover"
          >
            Log in
          </Link>
        </>
      }
    >
      <form action={onSubmit} className="space-y-4">
        <label className="block">
          <span className={authLabelClass}>Full name</span>
          <input
            name="full_name"
            type="text"
            required
            autoComplete="name"
            className={authInputClass}
          />
        </label>
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
            autoComplete="new-password"
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
          idleLabel="Sign up"
          pendingLabel="Creating…"
        />
      </form>
    </AuthShell>
  );
}
