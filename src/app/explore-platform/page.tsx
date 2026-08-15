import Link from "next/link";

export default function ExplorePlatformPage() {
    return (
        <main className="min-h-screen bg-[#f5f8f7] text-[#102f2a]">
            <header className="border-b border-[#dce7e4] bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <Link href="/" className="font-[var(--font-display)] text-lg text-ink">
                        TraceWell
                    </Link>

                    <Link
                        href="/request-demo"
                        className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
                        Request a demo
                    </Link>
                </div>
            </header>

            <section className="mx-auto max-w-6xl px-6 py-20 text-center">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#238477]">
                    Explore the platform
                </p>

                <h1 className="mx-auto max-w-4xl text-4xl leading-tight md:text-6xl">
                    A clearer view of patient wellbeing and care activity
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5a6f6a]">
                    TraceWell brings symptoms, observations, medication records, care notes,
                    and patient trends into one clear dashboard.
                </p>
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-20">
                <div className="overflow-hidden rounded-3xl border border-[#dce7e4] bg-white shadow-xl">
                    <div className="flex items-center gap-2 border-b border-[#e4ecea] bg-[#f8faf9] px-5 py-4">
                        <span className="h-3 w-3 rounded-full bg-[#d7dfdd]" />
                        <span className="h-3 w-3 rounded-full bg-[#d7dfdd]" />
                        <span className="h-3 w-3 rounded-full bg-[#d7dfdd]" />

                        <div className="ml-4 rounded-full bg-white px-4 py-1.5 text-xs text-[#71827e]">
                            app.tracewell.com/dashboard
                        </div>
                    </div>

                    <div className="grid min-h-[600px] md:grid-cols-[220px_1fr]">
                        <aside className="bg-[#0d2d38] p-5 text-white">
                            <div className="mb-10 text-xl font-semibold">
                                TraceWell
                            </div>

                            <nav className="space-y-2 text-sm">
                                <div className="rounded-xl bg-white/10 px-4 py-3">
                                    Overview
                                </div>

                                <div className="rounded-xl px-4 py-3 text-white/70">
                                    Patients
                                </div>

                                <div className="rounded-xl px-4 py-3 text-white/70">
                                    Symptoms
                                </div>

                                <div className="rounded-xl px-4 py-3 text-white/70">
                                    Care notes
                                </div>

                                <div className="rounded-xl px-4 py-3 text-white/70">
                                    Reports
                                </div>
                            </nav>
                        </aside>

                        <div className="bg-[#f7faf9] p-6 md:p-8">
                            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div>
                                    <p className="text-sm text-[#70817d]">
                                        Monday, 27 July
                                    </p>

                                    <h2 className="mt-1 text-3xl font-semibold">
                                        Patient overview
                                    </h2>
                                </div>

                                <button className="rounded-full bg-[#168474] px-5 py-2.5 text-sm font-semibold text-white">
                                    Add observation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
