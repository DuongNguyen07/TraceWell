"use client";

import { useState } from "react";
import Image from "next/image";

const PORTALS = [
  {
    role: "Nurse",
    tagline: "Care at the bedside",
    desc: "Log voice and photo observations, track vitals, generate AI-powered handovers, and manage the full shift from one view.",
    image: "/nurse.jpg",
    features: ["Voice notes", "Photo capture", "Vital signs", "AI handover", "Wellbeing checks"],
    accent: "oklch(0.50 0.13 175)",
  },
  {
    role: "Doctor",
    tagline: "Clinical oversight",
    desc: "Review complete patient histories, shift logs, diagnoses, referrals, and generate structured discharge summaries in seconds.",
    image: "/doctor.jpg",
    features: ["Shift history", "Diagnoses", "Discharge summaries", "Q&A AI", "Referrals"],
    accent: "oklch(0.40 0.11 250)",
  },
  {
    role: "Manager",
    tagline: "Operational intelligence",
    desc: "Monitor org-level activity: staff note counts per shift, average wellbeing by ward, and recent alert activity — all in real time.",
    image: "/manager.jpg",
    features: ["Shift overview", "Staff activity", "Wellbeing metrics", "Alert feed", "Ward snapshot"],
    accent: "oklch(0.28 0.06 248)",
  },
  {
    role: "Family",
    tagline: "Stay connected",
    desc: "Secure, scoped access to updates for your linked family member. View wellbeing trends, care notes, and message the care team directly.",
    image: "/family.jpg",
    features: ["Care updates", "Wellbeing trends", "Messaging", "Notifications", "Notes"],
    accent: "oklch(0.55 0.12 50)",
  },
  {
    role: "Patient",
    tagline: "Your health, your view",
    desc: "See your own care timeline, wellbeing history, and updates from your clinical team — all in a clear, jargon-free personal dashboard.",
    image: "/patient.jpg",
    features: ["Care timeline", "Wellbeing chart", "Team messages", "Notifications", "Profile"],
    accent: "oklch(0.46 0.10 290)",
  },
];

const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export default function PortalShowcase() {
  const [active, setActive] = useState<number | null>(null);
  const [touched, setTouched] = useState<number | null>(null);

  const effectiveActive = active ?? touched;

  return (
    <>
      {/* ── Desktop: horizontal accordion ─────────────────────────────── */}
      <div
        className="hidden md:flex"
        style={{ height: 460, gap: 6, borderRadius: 20, overflow: "hidden" }}
        onMouseLeave={() => setActive(null)}
      >
        {PORTALS.map((portal, i) => {
          const isActive = effectiveActive === i;
          const isShrunk = effectiveActive !== null && !isActive;

          return (
            <div
              key={portal.role}
              onMouseEnter={() => setActive(i)}
              style={{
                position: "relative",
                flexGrow: isActive ? 3 : isShrunk ? 0.5 : 1,
                flexShrink: 0,
                flexBasis: 0,
                minWidth: 52,
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                transition: `flex-grow 0.65s ${EASE_OUT}`,
              }}
            >
              {/* Photo with Ken Burns zoom */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: isActive ? "scale(1.06)" : "scale(1.01)",
                  transition: `transform 0.7s ${EASE_OUT}`,
                  willChange: "transform",
                }}
              >
                <Image
                  src={portal.image}
                  alt={portal.role}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  quality={95}
                  className="object-cover object-center"
                  priority={i <= 1}
                />
              </div>

              {/* Base gradient overlay — always visible */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(to top, ${portal.accent}e6 0%, ${portal.accent}60 35%, transparent 70%)`,
                  transition: `opacity 0.5s ${EASE}`,
                  opacity: isActive ? 1 : 0.75,
                }}
              />

              {/* Dark scrim that deepens when active so text is legible */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0) 100%)",
                  opacity: isActive ? 1 : 0,
                  transition: `opacity 0.4s ${EASE}`,
                }}
              />

              {/* Collapsed label — role name, fades away on hover */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "20px 16px",
                  opacity: isActive ? 0 : 1,
                  transform: isActive ? "translateY(6px)" : "translateY(0)",
                  transition: `opacity 0.3s ${EASE}, transform 0.3s ${EASE}`,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontSize: isShrunk ? 11 : 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.92)",
                    letterSpacing: isShrunk ? "0.06em" : "0",
                    writingMode: isShrunk ? "vertical-rl" : "horizontal-tb",
                    display: "block",
                    transition: `font-size 0.4s ${EASE}, writing-mode 0s`,
                    textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  }}
                >
                  {portal.role}
                </span>
              </div>

              {/* Slide-up detail panel */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "24px 20px",
                  transform: isActive ? "translateY(0)" : "translateY(100%)",
                  opacity: isActive ? 1 : 0,
                  transition: `transform 0.55s ${EASE_OUT}, opacity 0.4s ${EASE}`,
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                {/* Tagline */}
                <p
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 4,
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(8px)",
                    transition: isActive
                      ? `opacity 0.4s ${EASE} 60ms, transform 0.4s ${EASE} 60ms`
                      : `opacity 0.2s ${EASE}, transform 0.2s ${EASE}`,
                  }}
                >
                  {portal.tagline}
                </p>

                {/* Role name */}
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 8,
                    lineHeight: 1.2,
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                    transition: isActive
                      ? `opacity 0.4s ${EASE} 90ms, transform 0.4s ${EASE} 90ms`
                      : `opacity 0.2s ${EASE}, transform 0.2s ${EASE}`,
                  }}
                >
                  {portal.role}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: "rgba(255,255,255,0.78)",
                    marginBottom: 14,
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                    transition: isActive
                      ? `opacity 0.4s ${EASE} 120ms, transform 0.4s ${EASE} 120ms`
                      : `opacity 0.2s ${EASE}, transform 0.2s ${EASE}`,
                  }}
                >
                  {portal.desc}
                </p>

                {/* Feature chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(8px)",
                    transition: isActive
                      ? `opacity 0.4s ${EASE} 155ms, transform 0.4s ${EASE} 155ms`
                      : `opacity 0.2s ${EASE}, transform 0.2s ${EASE}`,
                  }}
                >
                  {portal.features.map((f) => (
                    <span
                      key={f}
                      style={{
                        background: "rgba(255,255,255,0.16)",
                        backdropFilter: "blur(6px)",
                        borderRadius: 9999,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile: tap-to-expand stack ───────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {PORTALS.map((portal, i) => {
          const isOpen = touched === i;
          return (
            <div
              key={portal.role}
              onClick={() => setTouched(isOpen ? null : i)}
              style={{
                position: "relative",
                borderRadius: 16,
                overflow: "hidden",
                height: isOpen ? 280 : 76,
                cursor: "pointer",
                transition: `height 0.5s ${EASE_OUT}`,
              }}
            >
              {/* Photo */}
              <div style={{ position: "absolute", inset: 0, transform: isOpen ? "scale(1.04)" : "scale(1)", transition: `transform 0.6s ${EASE_OUT}` }}>
                <Image src={portal.image} alt={portal.role} fill sizes="100vw" quality={95} className="object-cover object-center" />
              </div>

              {/* Gradient */}
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(to top, ${portal.accent}e0 0%, ${portal.accent}80 40%, rgba(0,0,0,0.25) 100%)`,
              }} />

              {/* Collapsed row */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, opacity: isOpen ? 0 : 1, transition: `opacity 0.25s ${EASE}` }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{portal.role}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{portal.tagline}</span>
                <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.6)", fontSize: 18, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: `transform 0.35s ${EASE}` }}>↓</span>
              </div>

              {/* Expanded content */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 20px 20px", opacity: isOpen ? 1 : 0, transform: isOpen ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.4s ${EASE} 80ms, transform 0.4s ${EASE} 80ms` }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>{portal.tagline}</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{portal.role}</h3>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", marginBottom: 12 }}>{portal.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {portal.features.map((f) => (
                    <span key={f} style={{ background: "rgba(255,255,255,0.18)", borderRadius: 9999, padding: "3px 10px", fontSize: 11, color: "rgba(255,255,255,0.9)" }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
