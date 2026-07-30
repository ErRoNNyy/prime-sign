import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4">
      <h1 className="font-display text-3xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted">
        This page or signing link does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        Go home
      </Link>
    </div>
  );
}
