import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";
import AnimateIn from "@/components/ui/AnimateIn";
import PortalShowcase from "@/components/landing/PortalShowcase";
import RoadmapSection from "@/components/landing/RoadmapSection";
import {
  Brain,
  Mic,
  Activity,
  Camera,
  Shield,
  Bell,
  Users,
  Handshake,
  ArrowRight,
} from "lucide-react";

const ROLE_PATHS: Record<Role, string> = {
  NURSE:         "/nurse",
  DOCTOR:        "/doctor",
  PATIENT:       "/patient",
  FAMILY_MEMBER: "/family",
  MANAGER:       "/manager",
  ADMIN:         "/manager",
  CARER:         "/carer",
};



const FEATURES = [
  { icon: <Brain className="h-5 w-5" />,    title: "AI handover generation",  desc: "One click produces a structured clinical handover grounded in real notes — not a hallucinated summary." },
  { icon: <Mic className="h-5 w-5" />,      title: "Voice-first care notes",   desc: "Dictate observations hands-free. Speech-to-text with noise cancellation feeds directly into the patient record." },
  { icon: <Activity className="h-5 w-5" />, title: "Health trend charts",      desc: "Mood, appetite, mobility, and sleep plotted over time against each patient's personal baseline." },
  { icon: <Camera className="h-5 w-5" />,   title: "Photo documentation",      desc: "Capture wound photos from any device. AI automatically describes the image and attaches it to the note." },
  { icon: <Bell className="h-5 w-5" />,     title: "Smart alerts",             desc: "Automatic flags when wellbeing metrics drop significantly from baseline. Instant notifications to family." },
  { icon: <Shield className="h-5 w-5" />,   title: "Role-based access",        desc: "Nurses, doctors, managers, patients, and families each see only what's relevant to their role." },
];

const SECTORS = [
  {
    label: "Hospitals",
    image: "/hospital.jpg",
    roles: ["Nurses", "Doctors", "Managers", "Patients", "Families"],
  },
  {
    label: "Aged Care",
    image: "/agecare.jpg",
    roles: ["Carers", "Doctors", "Managers", "Residents", "Families"],
  },
];

const TRUST_POINTS = [
  { icon: <Users className="h-5 w-5" />,     title: "Family transparency",   desc: "Families stay informed with scoped read access, no more anxious calls to the ward." },
  { icon: <Shield className="h-5 w-5" />,    title: "Compliance-ready",      desc: "Audit trails, role-based access control, and tamper-evident note history built in." },
  { icon: <Handshake className="h-5 w-5" />, title: "AI stays in its lane",  desc: "AI supports decisions. Clinicians remain responsible for care always." },
];

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
              <span className="transition-transform group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span>
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

      <section id="portals" className="scroll-mt-16 bg-surface py-20 md:py-28">
        <div className="container-page">
          <AnimateIn>
            <p className="eyebrow mb-3">Portals</p>
            <h2 className="max-w-lg text-4xl leading-tight">
              The right view for <em>every role.</em>
            </h2>
          </AnimateIn>

          <AnimateIn delay={100} className="mt-10">
            <PortalShowcase />
          </AnimateIn>

          <AnimateIn delay={260}>
            <div className="mt-8 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-ink shadow-soft transition-shadow hover:shadow-lift">
                Try a demo account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      <RoadmapSection />

      <section id="stakeholders" className="scroll-mt-16 bg-surface py-20 md:py-28">
        <div className="container-page">
          <AnimateIn>
            <p className="eyebrow mb-3">Stakeholders</p>
            <h2 className="max-w-lg text-4xl leading-tight">
              Built for every sector of <em>care.</em>
            </h2>
          </AnimateIn>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {SECTORS.map(({ label, image, roles }, i) => (
              <AnimateIn key={label} delay={i * 120}>
                <div className="group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-500 hover:-translate-y-2 hover:shadow-lift">
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={image}
                      alt={label}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-colors duration-500 group-hover:from-black/80" />
                    <div className="absolute bottom-0 left-0 z-10 p-5">
                      <h3 className="text-2xl font-semibold drop-shadow-lg" style={{ color: "#ffffff" }}>{label}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mt-4 flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-ink transition-colors duration-300 group-hover:bg-teal-soft group-hover:text-teal"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
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

           <footer className="border-t border-border bg-surface">
        <div className="container-page py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Image src="/TraceWell_Logo_nobg.png" alt="TraceWell logo" width={24} height={24} className="h-6 w-6 object-contain" />
                <span className="font-[var(--font-display)] text-base text-ink">TraceWell</span>
              </div>
              <p className="mt-2 max-w-xs text-xs text-ink-soft leading-relaxed">
                AI healthcare intelligence for aged care and hospitals.
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
                </ul>
              </div>
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink">Access</div>
                <ul className="space-y-2 text-sm text-ink-soft">
                  <li><Link href="/login"           className="transition-colors hover:text-ink">Sign in</Link></li>
                  <li><Link href="/request-demo"    className="transition-colors hover:text-ink">Request a demo</Link></li>
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
