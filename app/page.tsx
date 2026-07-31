import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

function ArrowButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex overflow-hidden bg-sage text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#1a2118] no-underline transition-colors duration-200 hover:bg-sage-hover"
    >
      <span className="flex items-center px-5 py-3.5">{children}</span>
      <span
        className="flex w-10 items-center justify-center bg-sage-deep text-ink transition-colors duration-200 group-hover:bg-sage-arrow-hover"
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
    </Link>
  );
}

const navLinkClass =
  "px-3.5 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-soft no-underline transition-colors duration-200 hover:text-ink";

export default function HomePage() {
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
          className="mt-20 animate-landing-bg object-cover object-[42%_40%] motion-reduce:animate-none motion-reduce:scale-[1.00] motion-reduce:translate-y-0"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,0.78)_0%,rgba(8,8,8,0.42)_42%,rgba(8,8,8,0.28)_100%),linear-gradient(180deg,rgba(8,8,8,0.55)_0%,transparent_28%,transparent_58%,rgba(8,8,8,0.72)_100%)]" />
      </div>

      <header className="relative z-20 grid animate-landing-down grid-cols-[1fr_auto] items-center gap-4 px-6 pt-5 motion-reduce:animate-none sm:px-10 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="text-[clamp(1.05rem,1.6vw,1.2rem)] font-semibold uppercase tracking-[0.14em] text-ink no-underline"
          >
            PRIMESIGN
            <span className="ml-[0.1em] align-super text-[0.62em]">®</span>
          </Link>
        </div>

        <nav
          className="hidden items-center gap-0.5 rounded-full border border-ink/12 bg-black/55 px-1.5 py-1.5 backdrop-blur-[10px] md:flex"
          aria-label="Primary"
        >
          <a href="#how-it-works" className={navLinkClass}>
            How it works
          </a>
          <a href="#about" className={navLinkClass}>
            About us
          </a>
          <a href="#security" className={navLinkClass}>
            Security
          </a>
          <Link href="/login" className={navLinkClass}>
            Sign in
          </Link>
          <Link href="/signup" className={navLinkClass}>
            Contact
          </Link>
        </nav>

        <div className="justify-self-end">
          <ArrowButton href="/signup">Request access</ArrowButton>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-end px-6 pb-[clamp(5.5rem,10vh,7.5rem)] sm:px-10">
        <div className="max-w-xl animate-landing-up motion-reduce:animate-none [animation-delay:150ms]">
          <h1 className="m-0 flex flex-col gap-0.5">
            <span className="text-[clamp(1.65rem,4.2vw,2.85rem)] font-bold uppercase leading-[1.05] tracking-[0.04em] text-ink">
              Agreements change businesses.
            </span>
            <span className="animate-landing-serif font-display text-[clamp(2.1rem,5.4vw,3.75rem)] font-medium italic uppercase leading-[1.02] tracking-[0.02em] text-ink motion-reduce:animate-none">
              Signatures make them official.
            </span>
          </h1>
          <p className="mb-6 mt-5 max-w-md text-[clamp(0.9rem,1.4vw,1rem)] leading-[1.55] text-ink-soft">
            Want to send a document for signature? You can — with the respect
            every agreement deserves. PrimeSign® keeps every envelope verified,
            sealed, and alive in the record.
          </p>
          <ArrowButton href="/signup">Create an envelope</ArrowButton>
        </div>
      </main>

      <p className="absolute bottom-6 left-6 right-6 z-[15] m-0 animate-landing-up text-left text-[0.65rem] font-medium uppercase leading-snug tracking-[0.16em] text-white/80 motion-reduce:animate-none sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:whitespace-nowrap sm:text-center [animation-delay:550ms]">
        Secure envelopes · OTP verified · Full audit trail
      </p>
    </div>
  );
}
