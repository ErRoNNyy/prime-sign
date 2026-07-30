import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 20%, #99f6e4 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 10%, #ccfbf1 0%, transparent 50%), linear-gradient(180deg, #ecfdf8 0%, #f4f7f6 45%, #e8f0ee 100%)",
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-xl font-semibold tracking-tight text-teal-950">
          PrimeSign
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-900/5"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-24 pt-10 sm:px-10">
        <p className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-teal-950 sm:text-6xl md:text-7xl">
          PrimeSign
        </p>
        <h1 className="mt-4 max-w-xl text-xl font-medium text-teal-900/90 sm:text-2xl">
          Document envelopes that move from upload to completed PDF — with OTP
          verification at every signature.
        </h1>
        <p className="mt-4 max-w-lg text-base text-muted">
          Choose recipients, place signature and approval fields, send
          invitations, and keep a full audit trail.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Create an envelope
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:bg-teal-50"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
