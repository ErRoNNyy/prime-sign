"use client";

import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/app/actions";

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
    <div className="flex min-h-full flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_#ccfbf1,_#f4f7f6_60%)] px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <Link href="/" className="font-display text-2xl font-semibold text-teal-950">
          PrimeSign
        </Link>
        <h1 className="mt-6 text-xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-muted">Start sending envelopes in minutes.</p>
        <form action={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Full name</span>
            <input
              name="full_name"
              type="text"
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
