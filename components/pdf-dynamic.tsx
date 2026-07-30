"use client";

import dynamic from "next/dynamic";

export const PrepareEnvelopeClient = dynamic(
  () =>
    import("@/components/prepare-envelope-client").then(
      (m) => m.PrepareEnvelopeClient,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted">Loading prepare workspace…</p>
    ),
  },
);

export const SignClient = dynamic(
  () => import("@/components/sign-client").then((m) => m.SignClient),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted">Loading signing view…</p>,
  },
);
