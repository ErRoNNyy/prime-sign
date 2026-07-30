import Link from "next/link";
import { signOut } from "@/app/actions";

export function AppNav({ email }: { email: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-display text-lg font-semibold text-teal-950"
          >
            PrimeSign
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-teal-50 hover:text-foreground"
            >
              Envelopes
            </Link>
            <Link
              href="/inbox"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-teal-50 hover:text-foreground"
            >
              Inbox
            </Link>
            <Link
              href="/contacts"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-teal-50 hover:text-foreground"
            >
              Contacts
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-teal-50"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
