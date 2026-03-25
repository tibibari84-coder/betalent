import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <section className="rounded-2xl border border-white/10 bg-[#141418] p-6">
        <h1 className="text-xl font-semibold text-white">Admin</h1>
        <p className="mt-1 text-sm text-white/60">
          Internal operational tools for protected admin workflows.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/live-control"
            className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-black/30"
          >
            <p className="text-sm font-semibold text-white">Live Session Control</p>
            <p className="mt-1 text-xs text-white/60">
              Create session, start live, advance performer, end session.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
