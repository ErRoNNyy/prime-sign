import Link from "next/link";
import { signOut } from "@/app/actions";

const navLinkClass =
  "px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink";

export function AppNav({ email }: { email: string }) {
  return (
    <header className="relative z-20 bg-transparent pt-3 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-5 sm:gap-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold uppercase tracking-[0.14em] text-ink no-underline"
          >
            PRIMESIGN
            <span className="ml-[0.1em] align-super text-[0.62em]">®</span>
          </Link>
          <nav className="hidden items-center gap-0.5 rounded-full border border-ink/12 bg-black/45 px-1 py-1 sm:flex">
            <Link href="/dashboard" className={navLinkClass}>
              Envelopes
            </Link>
            <Link href="/history" className={navLinkClass}>
              History
            </Link>
            <Link href="/contacts" className={navLinkClass}>
              Contacts
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[14rem] truncate text-xs text-ink-soft md:inline">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="border border-ink/25 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 py-2 sm:hidden">
        <Link href="/dashboard" className={navLinkClass}>
          Envelopes
        </Link>
        <Link href="/history" className={navLinkClass}>
          History
        </Link>
        <Link href="/contacts" className={navLinkClass}>
          Contacts
        </Link>
      </nav>
    </header>
  );
}
