import { LogoutButton } from "@/components/logout-button";

export default function RestrictedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
          Access restricted
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-950">
          Use a verified Waterloo email.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          This archive is limited to signed-in users with a verified
          @uwaterloo.ca email address. No capstone data is loaded for this
          account.
        </p>
        <LogoutButton className="mt-6 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
          Sign out
        </LogoutButton>
      </section>
    </main>
  );
}
