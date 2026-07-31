import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-x-hidden bg-[#0a0a0a] text-ink">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 0%, rgba(122,139,105,0.14), transparent 55%), radial-gradient(ellipse 60% 45% at 90% 10%, rgba(212,198,185,0.08), transparent 50%), linear-gradient(180deg, #0c0b0a 0%, #0a0a0a 45%, #0e0d0b 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-2.5 z-30 border border-ink/15 sm:inset-3"
        aria-hidden
      />
      <AppNav email={user.email ?? ""} />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
