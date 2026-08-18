"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

type OrgType = "hospital" | "agedcare";
type Stage = "org-select" | "login" | "change-password";

const ROLE_PATHS: Record<Role, string> = {
  NURSE:         "/nurse",
  DOCTOR:        "/doctor",
  PATIENT:       "/patient",
  FAMILY_MEMBER: "/family",
  MANAGER:       "/manager",
  ADMIN:         "/manager",
  CARER:         "/carer",
};

export default function LoginPage() {
  const router = useRouter();

  const [stage, setStage]               = useState<Stage>("org-select");
  const [orgType, setOrgType]           = useState<OrgType>("hospital");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  
  const [cpEmail, setCpEmail]           = useState("");
  const [cpCurrent, setCpCurrent]       = useState("");
  const [cpNew, setCpNew]               = useState("");
  const [cpConfirm, setCpConfirm]       = useState("");
  const [cpError, setCpError]           = useState("");
  const [cpSuccess, setCpSuccess]       = useState(false);
  const [cpLoading, setCpLoading]       = useState(false);

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

    const result = await signIn("credentials", { email, password, org: orgType, redirect: false });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role as Role | undefined;
    const basePath = role ? (ROLE_PATHS[role] ?? "/") : "/";
    router.push(`${basePath}?org=${orgType}`);
  }

  async function handleChangePassword() {
    setCpError("");
    if (!cpEmail || !cpCurrent || !cpNew || !cpConfirm) {
      setCpError("All fields are required.");
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpError("New passwords do not match.");
      return;
    }
    if (cpNew.length < 8) {
      setCpError("New password must be at least 8 characters.");
      return;
    }
    setCpLoading(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cpEmail, currentPassword: cpCurrent, newPassword: cpNew }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCpError((data as { error?: string }).error ?? "Failed to change password.");
        return;
      }
      setCpSuccess(true);
    } finally {
      setCpLoading(false);
    }
  }

  
  if (stage === "org-select") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <Image src="/TraceWell_Logo_nobg.png" alt="TraceWell logo" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-[var(--font-display)] text-xl text-ink">TraceWell</span>
          </div>
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

  
  if (stage === "change-password") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
          <button onClick={() => { setStage("login"); setCpError(""); setCpSuccess(false); setCpEmail(""); setCpCurrent(""); setCpNew(""); setCpConfirm(""); }}
            className="mb-4 text-sm text-ink-soft hover:text-ink">
            ← Back
          </button>
          <div className="mb-4 flex items-center gap-2">
            <Image src="/TraceWell_Logo_nobg.png" alt="TraceWell logo" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="font-[var(--font-display)] text-lg text-ink">TraceWell</span>
          </div>
          <h1 className="text-2xl">Change password</h1>
          <p className="mt-1 text-ink-soft">Enter your current password and choose a new one.</p>

          {cpSuccess ? (
            <div className="mt-6 rounded-xl bg-teal-soft p-4 text-sm text-teal">
              Password updated successfully. You can now sign in with your new password.
              <button onClick={() => { setStage("login"); setCpSuccess(false); }} className="mt-3 block text-xs underline hover:opacity-70">
                Back to sign in
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              <input
                value={cpEmail}
                onChange={(e) => setCpEmail(e.target.value)}
                type="email"
                placeholder="Your email address"
                autoComplete="email"
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={cpCurrent}
                onChange={(e) => setCpCurrent(e.target.value)}
                type="password"
                placeholder="Current password"
                autoComplete="current-password"
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                type="password"
                placeholder="New password (min 8 characters)"
                autoComplete="new-password"
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={cpConfirm}
                onChange={(e) => setCpConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {cpError && <p className="text-sm text-destructive">{cpError}</p>}
              <button
                onClick={handleChangePassword}
                disabled={cpLoading}
                className="rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {cpLoading ? "Updating…" : "Update password"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <button onClick={goBack} className="mb-4 text-sm text-ink-soft hover:text-ink">
          ← Back
        </button>
        <div className="mb-4 flex items-center gap-2">
          <Image src="/TraceWell_Logo_nobg.png" alt="TraceWell logo" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="font-[var(--font-display)] text-lg text-ink">TraceWell</span>
        </div>
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
          <p className="text-center text-xs text-muted-foreground">
            Need to change your password?{" "}
            <button onClick={() => { setCpEmail(email); setStage("change-password"); }} className="underline hover:opacity-70">
              Change password
            </button>
          </p>
        </div>

        <div className="mt-6 rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground space-y-2">
          <div className="font-sans font-semibold text-xs text-ink mb-1">Demo accounts</div>
          {orgType === "hospital" ? (
            <>
              <div className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">St Peter&apos;s Hospital</div>
              <div>sarah.jones@stpetershospital.com · nurse123</div>
              <div>dr.chen@stpetershospital.com · doctor123</div>
              <div>p.walsh@stpetershospital.com · manager123</div>
              <div>amara.chen@stpetershospital.com · patient123</div>
              <div>lena.chen@gmail.com · family123</div>
            </>
          ) : (
            <>
              <div className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Sunrise Aged Care</div>
              <div>mary.nguyen@sunriseagedcare.com.au · nurse123</div>
              <div>dr.patel@sunriseagedcare.com.au · doctor123</div>
              <div>j.wilson@sunriseagedcare.com.au · manager123</div>
              <div>margaret.wu@sunriseagedcare.com.au · patient123</div>
              <div>tom.wu@gmail.com · family123</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
