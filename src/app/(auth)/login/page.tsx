"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

type OrgType = "hospital" | "agedcare";
type Stage = "org-select" | "login";

const ROLE_PATHS: Record<Role, string> = {
  NURSE:         "/nurse",
  DOCTOR:        "/doctor",
  PATIENT:       "/patient",
  FAMILY_MEMBER: "/family",
  MANAGER:       "/manager",
  ADMIN:         "/manager",
};

export default function LoginPage() {
  const router = useRouter();

  const [stage, setStage]       = useState<Stage>("org-select");
  const [orgType, setOrgType]   = useState<OrgType>("hospital");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function selectOrg(type: OrgType) {
    setOrgType(type);
    setError("");
    setStage("login");
  }

  function goBack() {
    setError("");
    setStage("org-select");
  }

  async function handleSignIn() {
    if (!email || !password) return;
    setError("");
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = (session?.user as any)?.role as Role | undefined;
    const basePath = role ? (ROLE_PATHS[role] ?? "/") : "/";
    router.push(`${basePath}?org=${orgType}`);
  }

  // ── Screen 1: organisation type ──────────────────────────────────
  if (stage === "org-select") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-soft">
          <p className="eyebrow mb-2">TraceWell</p>
          <h1 className="text-2xl">Select your organisation type</h1>
          <p className="mt-1 text-ink-soft">
            You&apos;ll sign in with your individual credentials next.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => selectOrg("hospital")}
              className="rounded-2xl border border-border bg-card p-6 text-left shadow-soft transition-shadow hover:shadow-lift"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-teal-soft text-teal font-semibold">
                H
              </div>
              <div className="font-medium text-ink">Hospital</div>
              <div className="mt-1 text-sm text-ink-soft">
                Nurses, doctors, managers and admins on acute wards.
              </div>
            </button>

            <button
              onClick={() => selectOrg("agedcare")}
              className="rounded-2xl border border-border bg-card p-6 text-left shadow-soft transition-shadow hover:shadow-lift"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-ink font-semibold">
                A
              </div>
              <div className="font-medium text-ink">Aged Care</div>
              <div className="mt-1 text-sm text-ink-soft">
                Carers, doctors, managers and admins in residential care.
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Screen 2: individual login ───────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <button onClick={goBack} className="mb-4 text-sm text-ink-soft hover:text-ink">
          ← Back
        </button>
        <p className="eyebrow mb-2">
          {orgType === "hospital" ? "Hospital" : "Aged Care"}
        </p>
        <h1 className="text-2xl">Sign in</h1>
        <p className="mt-1 text-ink-soft">Enter your account credentials to continue.</p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground space-y-1">
          <div className="font-semibold not-mono text-xs mb-1 font-sans">Demo accounts:</div>
          <div>nurse@tracewell.demo · nurse123</div>
          <div>doctor@tracewell.demo · doctor123</div>
          <div>patient@tracewell.demo · patient123</div>
          <div>family@tracewell.demo · family123</div>
          <div>manager@tracewell.demo · manager123</div>
        </div>
      </div>
    </div>
  );
}
