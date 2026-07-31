import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden bg-[#0a0a0a] text-ink">
      <div
        className="pointer-events-none absolute inset-2.5 z-30 border border-ink/20 sm:inset-[0.65rem]"
        aria-hidden
      />

      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-studio.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_32%] scale-[1.08] translate-y-[4%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,0.88)_0%,rgba(8,8,8,0.72)_45%,rgba(8,8,8,0.78)_100%),linear-gradient(180deg,rgba(8,8,8,0.7)_0%,rgba(8,8,8,0.45)_40%,rgba(8,8,8,0.85)_100%)]" />
      </div>

      <header className="relative z-20 px-6 pt-6 sm:px-10 sm:pt-8">
        <Link
          href="/"
          className="text-[clamp(1.05rem,1.6vw,1.2rem)] font-semibold uppercase tracking-[0.14em] text-ink no-underline"
        >
          PRIMESIGN
          <span className="ml-[0.1em] align-super text-[0.62em]">®</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md animate-landing-up motion-reduce:animate-none">
          <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.35rem)] font-medium italic leading-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
        </div>
      </main>
    </div>
  );
}

export const authInputClass =
  "w-full border border-ink/25 bg-black/40 px-3.5 py-2.5 text-sm text-ink outline-none backdrop-blur-sm transition-colors placeholder:text-ink/35 focus:border-sage";

export const authLabelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft";

export function AuthSubmitButton({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex w-full overflow-hidden bg-sage text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#1a2118] transition-colors duration-200 hover:bg-sage-hover disabled:opacity-60"
    >
      <span className="flex flex-1 items-center justify-center py-3.5 px-5">
        {pending ? pendingLabel : idleLabel}
      </span>
      <span
        className="flex w-10 shrink-0 items-center justify-center bg-sage-deep text-ink transition-colors duration-200 group-hover:bg-sage-arrow-hover group-disabled:bg-sage-deep"
        aria-hidden
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        >
          <path
            d="M2.5 7h9M7.5 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
