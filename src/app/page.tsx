import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";
import AnimateIn from "@/components/AnimateIn";
import PortalShowcase from "@/components/PortalShowcase";
import RoadmapSection from "@/components/RoadmapSection";

const ROLE_PATHS: Record<Role, string> = {
  NURSE:         "/nurse",
  DOCTOR:        "/doctor",
  PATIENT:       "/patient",
  FAMILY_MEMBER: "/family",
  MANAGER:       "/manager",
  ADMIN:         "/manager",
};

// ── Inline SVG icon primitives ───────────────────────────────────────────────

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588 4 4 0 0 0 7.636 2.106 3.2 3.2 0 0 0 .461-.047A4.002 4.002 0 0 0 21 19a4 4 0 0 0-2.072-3.513 4 4 0 0 0 .556-6.589 4 4 0 0 0-2.526-5.769A3 3 0 0 0 12 5Z" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconHandshake() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ── Page data ────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: <IconBrain />,  title: "AI handover generation",   desc: "One click produces a structured clinical handover grounded in real notes — not a hallucinated summary." },
  { icon: <IconMic />,    title: "Voice-first care notes",    desc: "Dictate observations hands-free. Speech-to-text with noise cancellation feeds directly into the patient record." },
  { icon: <IconChart />,  title: "Health trend charts",       desc: "Mood, appetite, mobility, and sleep plotted over time against each patient's personal baseline." },
  { icon: <IconCamera />, title: "Photo documentation",       desc: "Capture wound photos from any device. AI automatically describes the image and attaches it to the note." },
  { icon: <IconBell />,   title: "Smart alerts",              desc: "Automatic flags when wellbeing metrics drop significantly from baseline. Instant notifications to family." },
  { icon: <IconShield />, title: "Role-based access",         desc: "Nurses, doctors, managers, patients, and families each see only what's relevant to their role." },
];

const SECTORS = [
  { label: "Hospitals",       sub: "Acute wards, ICU, surgical units",        icon: "H"  },
  { label: "Aged Care",       sub: "Residential, memory care, respite",       icon: "A"  },
];

const TRUST_POINTS = [
  { icon: <IconUsers />,    title: "Family transparency",    desc: "Families stay informed with scoped read access — no more anxious calls to the ward." },
  { icon: <IconShield />,   title: "Compliance-ready",       desc: "Audit trails, role-based access control, and tamper-evident note history built in." },
  { icon: <IconHandshake />, title: "AI stays in its lane",  desc: "AI supports decisions. Clinicians remain responsible for care — always." },
];

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = session.user.role as Role | undefined;
    const org  = session.user.org ?? "hospital";
    const path = role ? (ROLE_PATHS[role] ?? "/login") : "/login";
    redirect(`${path}?org=${org}`);
  }

  return (
    <div className="min-h-screen bg-background text-ink">

      {/* ── Sticky navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-page flex h-16 items-center justify-between">

          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/TraceWell_Logo_nobg.png" alt="TraceWell logo" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-[var(--font-display)] text-lg text-ink">TraceWell</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["#overview",     "Overview"],
              ["#platform",     "Platform"],
              ["#portals",      "Portals"],
              ["#roadmap",      "Roadmap"],
              ["#stakeholders", "Stakeholders"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-secondary hover:text-ink">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary sm:inline-flex">
              Sign in
            </Link>
            <Link href="/request-demo" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-shadow hover:shadow-lift">
              Request a demo
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section id="overview" className="hero-gradient scroll-mt-16">
        <div className="container-page py-24 md:py-32">

          <p className="eyebrow mb-4 hero-in" style={{ animationDelay: "0ms" }}>
            AI Healthcare Intelligence
          </p>

          <h1
            className="max-w-3xl text-5xl leading-tight md:text-6xl hero-in"
            style={{ animationDelay: "80ms" }}
          >
            From passive records to{" "}
            <em>proactive patient intelligence.</em>
          </h1>

          <p
            className="mt-6 max-w-xl text-lg text-ink-soft leading-relaxed hero-in"
            style={{ animationDelay: "160ms" }}
          >
            TraceWell is an AI intelligence layer across the documentation
            clinicians already create — turning it into complete patient stories,
            safer handovers, and earlier awareness of change.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 hero-in" style={{ animationDelay: "240ms" }}>
            <Link
              href="/request-demo"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-shadow hover:shadow-lift"
            >
              Request a demo
              <span className="transition-transform group-hover:translate-x-0.5"><IconArrow /></span>
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-secondary"
            >
              Sign in to dashboard →
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-2 hero-in" style={{ animationDelay: "320ms" }}>
            <span className="chip">Aged care</span>
            <span className="chip">Hospitals</span>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="container-page grid grid-cols-2 gap-px py-0 md:grid-cols-4">
          {[
            { value: "5",    unit: "portals",  label: "Role-specific views" },
            { value: "AI",   unit: "powered",  label: "Handovers, captions & Q&A" },
            { value: "Real", unit: "time",     label: "Alert & notification system" },
            { value: "0",    unit: "lock-in",  label: "Bring your own infrastructure" },
          ].map(({ value, unit, label }, i) => (
            <AnimateIn key={label} delay={i * 80}>
              <div className="px-6 py-8 text-center">
                <div className="font-[var(--font-display)] text-3xl text-ink">
                  {value} <span className="text-teal">{unit}</span>
                </div>
                <div className="mt-1 text-sm text-ink-soft">{label}</div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      <section id="platform" className="scroll-mt-16 py-20 md:py-28">
        <div className="container-page">
          <AnimateIn>
            <p className="eyebrow mb-3">Platform</p>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-lg text-4xl leading-tight">
                Every tool clinicians need in <em>one place.</em>
              </h2>
            </div>
          </AnimateIn>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <AnimateIn key={title} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal transition-colors group-hover:bg-teal group-hover:text-white">
                    {icon}
                  </div>
                  <div className="font-medium text-ink">{title}</div>
                  <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals ───────────────────────────────────────────────────── */}
      <section id="portals" className="scroll-mt-16 bg-surface py-20 md:py-28">
        <div className="container-page">
          <AnimateIn>
            <p className="eyebrow mb-3">Portals</p>
            <h2 className="max-w-lg text-4xl leading-tight">
              The right view for <em>every role.</em>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-ink-soft leading-relaxed">
              Hover over each role to explore its dedicated experience.
              One platform, five distinct views — no information overload, no gaps.
            </p>
          </AnimateIn>

          <AnimateIn delay={100} className="mt-10">
            <PortalShowcase />
          </AnimateIn>

          <AnimateIn delay={260}>
            <div className="mt-8 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-ink shadow-soft transition-shadow hover:shadow-lift">
                Try a demo account <IconArrow />
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Roadmap ───────────────────────────────────────────────────── */}
      <RoadmapSection />

      {/* ── Stakeholders ──────────────────────────────────────────────── */}
      <section id="stakeholders" className="scroll-mt-16 bg-surface py-20 md:py-28">
        <div className="container-page">
          <AnimateIn>
            <p className="eyebrow mb-3">Stakeholders</p>
            <h2 className="max-w-lg text-4xl leading-tight">
              Built for every sector of <em>care.</em>
            </h2>
            <p className="mt-4 max-w-xl text-sm text-ink-soft leading-relaxed">
              One platform, purpose-built workflows for four distinct care settings.
              The terminology, the metrics, and the reporting all adapt to your sector.
            </p>
          </AnimateIn>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {SECTORS.map(({ label, sub, icon }, i) => (
              <AnimateIn key={label} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-ink transition-colors duration-300 group-hover:bg-teal-soft group-hover:text-teal">
                    {icon}
                  </div>
                  <div className="font-medium text-ink">{label}</div>
                  <p className="mt-1 text-xs text-ink-soft">{sub}</p>
                </div>
              </AnimateIn>
            ))}
          </div>

          <AnimateIn delay={320}>
            <div className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="grid gap-6 md:grid-cols-3">
                {TRUST_POINTS.map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="shrink-0 rounded-lg bg-teal-soft p-2 text-teal">{icon}</div>
                    <div>
                      <div className="font-medium text-ink">{title}</div>
                      <p className="mt-0.5 text-xs text-ink-soft">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

     

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="container-page py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Image src="/TraceWell_Logo_nobg.png" alt="TraceWell logo" width={24} height={24} className="h-6 w-6 object-contain" />
                <span className="font-[var(--font-display)] text-base text-ink">TraceWell</span>
              </div>
              <p className="mt-2 max-w-xs text-xs text-ink-soft leading-relaxed">
                AI healthcare intelligence for aged care, hospitals, disability, and home healthcare.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink">Product</div>
                <ul className="space-y-2 text-sm text-ink-soft">
                  <li><a href="#platform"     className="transition-colors hover:text-ink">Platform</a></li>
                  <li><a href="#portals"      className="transition-colors hover:text-ink">Portals</a></li>
                  <li><a href="#roadmap"      className="transition-colors hover:text-ink">Roadmap</a></li>
                </ul>
              </div>
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink">Sectors</div>
                <ul className="space-y-2 text-sm text-ink-soft">
                  <li><a href="#stakeholders" className="transition-colors hover:text-ink">Hospitals</a></li>
                  <li><a href="#stakeholders" className="transition-colors hover:text-ink">Aged care</a></li>
                  <li><a href="#stakeholders" className="transition-colors hover:text-ink">Disability care</a></li>
                </ul>
              </div>
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink">Access</div>
                <ul className="space-y-2 text-sm text-ink-soft">
                  <li><Link href="/login"           className="transition-colors hover:text-ink">Sign in</Link></li>
                  <li><Link href="/request-demo"    className="transition-colors hover:text-ink">Request a demo</Link></li>
                  <li><Link href="/explore-platform" className="transition-colors hover:text-ink">Explore platform</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>&copy; {new Date().getFullYear()} TraceWell. All rights reserved.</span>
            <span>AI supports decisions. Clinicians remain responsible for care.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
