import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-500 border-b border-border bg-background/80 backdrop-blur">
        <div className="container-page flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center">
              <Image
                src="/TraceWell_Logo_nobg.png"
                alt="TraceWell logo"
                width={10}
                height={10}
                className="h-10 w-10 object-contain"
              />
            </div>
            <span className="font-[var(--font-display)] text-lg text-ink">
              TraceWell
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
            <a href="#overview" className="hover:text-ink">Overview</a>
            <a href="#platform" className="hover:text-ink">Platform</a>
            <a href="#portals" className="hover:text-ink">Portals</a>
            <a href="#roadmap" className="hover:text-ink">Roadmap</a>
            <a href="#stakeholders" className="hover:text-ink">Stakeholders</a>
            <a href="#contact" className="hover:text-ink">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm text-ink hover:bg-secondary"
            >
              Sign in
            </Link>
            <Link
              href="/request-demo"
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Request a demo
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient">
        <div className="container-page py-24">
          <p className="eyebrow mb-4">AI Healthcare Intelligence</p>
          <h1 className="max-w-3xl text-5xl leading-tight">
            From passive records to <em>proactive patient intelligence.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Tracewell is an AI intelligence layer that sits across the
            documentation clinicians already create — turning it into a
            complete patient story, safer handovers, and earlier awareness
            of change.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/request-demo"
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft"
            >
              Request a demo
            </Link>
            <Link
              href="/explore-platform"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-ink"
            >
              Explore the platform →
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            <span className="chip">Aged care</span>
            <span className="chip">Hospitals</span>
            <span className="chip">Disability care</span>
            <span className="chip">Home healthcare</span>
          </div>
        </div>
      </section>

      {/* Footer accessibility line */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="container-page text-center text-sm text-muted-foreground">
          AI supports decisions. Clinicians remain responsible for care.
        </div>
      </footer>
    </div>
  );
}
