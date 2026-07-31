import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 text-ink">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(122,139,105,0.16), transparent 55%), linear-gradient(180deg, #0c0b0a 0%, #0a0a0a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-2.5 border border-ink/15 sm:inset-3"
        aria-hidden
      />
      <h1 className="font-display text-3xl font-medium italic">Not found</h1>
      <p className="mt-2 text-sm text-ink-soft">
        This page or signing link does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 bg-sage px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent hover:bg-sage-hover"
      >
        Go home
      </Link>
    </div>
  );
}
