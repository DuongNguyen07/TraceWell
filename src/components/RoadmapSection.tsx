import AnimateIn from "@/components/AnimateIn";

// S-curve road: bottom-left → rise → S-dip → final rise → top-right
const ROAD =
  "M -30 540 C 150 540, 200 200, 420 210 C 640 220, 700 500, 900 470 C 1000 455, 1100 200, 1230 80";

// ── Milestone data ────────────────────────────────────────────────────────
// cx/cy are bezier-computed road centerline positions.
// card.x/y are positioned in non-overlapping horizontal zones:
//   M1 → [15–243]   M2 → [270–490]   M3 → [510–732]   M4 → [760–982]
// lineEnd connects the milestone circle to the nearest card edge.

type Phase = {
  phase: string;
  badgeW: number;
  color: string;
  title: string;
  items: string[];
  cx: number; cy: number;
  card: { x: number; y: number };
  lineEnd: [number, number];
};

const PHASES: Phase[] = [
  {
    phase: "Now", badgeW: 40, color: "#2a9885",
    title: "Core platform live",
    items: ["Voice & photo notes", "AI handover generation", "Health trend charts", "Role dashboards", "Alerts & notifications"],
    cx: 85, cy: 487,
    card: { x: 15, y: 190 },
    lineEnd: [95, 341],
  },
  {
    phase: "Q3 2026", badgeW: 68, color: "#3b82f6",
    title: "Integrations",
    items: ["HL7 FHIR import/export", "PMS integrations", "Push notifications"],
    cx: 260, cy: 277,
    card: { x: 270, y: 340 },
    lineEnd: [270, 345],
  },
  {
    phase: "Q4 2026", badgeW: 68, color: "#8b5cf6",
    title: "Advanced AI",
    items: ["Deterioration scoring", "AI-assisted care plans", "Medication alerts"],
    cx: 647, cy: 335,
    card: { x: 510, y: 40 },
    lineEnd: [625, 161],
  },
  {
    phase: "2027", badgeW: 46, color: "#f59e0b",
    title: "Expansion",
    items: ["Disability care module", "Home healthcare app", "Multi-facility reports"],
    cx: 960, cy: 435,
    card: { x: 760, y: 340 },
    lineEnd: [982, 400],
  },
];

const CARD_W = 222;
const ITEM_Y0 = 64;   // y offset from card top where first bullet starts
const ITEM_H  = 15;   // line height per bullet

function cardH(n: number) {
  // top-pad(12) + badge(20) + gap(8) + title(15) + gap(9) + bullets + bottom-pad(14)
  return ITEM_Y0 + n * ITEM_H + 14;
}

export default function RoadmapSection() {
  return (
    <section id="roadmap" className="scroll-mt-16 overflow-hidden py-20 md:py-28">

      {/* Heading inside normal page padding */}
      <div className="container-page mb-12">
        <AnimateIn>
          <p className="eyebrow mb-3">Roadmap</p>
          <h2 className="max-w-lg text-4xl leading-tight">
            Where we are and <em>where we&apos;re going.</em>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-ink-soft leading-relaxed">
            From platform launch to full sector coverage — here&apos;s the road ahead.
          </p>
        </AnimateIn>
      </div>

      {/* Full-width SVG — no card, no border, edge to edge */}
      <AnimateIn delay={120}>
        <svg
          viewBox="0 0 1200 580"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "auto", display: "block", minWidth: 640 }}
          aria-label="TraceWell product roadmap"
        >
          <defs>
            <filter id="rdShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="8" stdDeviation="13"
                floodColor="#0f172a" floodOpacity="0.22" />
            </filter>
            <filter id="cdShadow" x="-15%" y="-15%" width="130%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="8"
                floodColor="#0f172a" floodOpacity="0.09" />
            </filter>
          </defs>

          {/* ── Road ── */}
          {/* Drop-shadow layer */}
          <path d={ROAD} fill="none" stroke="#1e293b" strokeWidth="92"
            strokeLinecap="round" filter="url(#rdShadow)" />
          {/* Edge highlight ring */}
          <path d={ROAD} fill="none" stroke="#3d5166" strokeWidth="90" strokeLinecap="round" />
          {/* Main asphalt surface */}
          <path d={ROAD} fill="none" stroke="#1e293b" strokeWidth="84" strokeLinecap="round" />
          {/* Subtle inner sheen */}
          <path d={ROAD} fill="none" stroke="rgba(255,255,255,0.035)"
            strokeWidth="80" strokeLinecap="round" />
          {/* Centre dashes */}
          <path d={ROAD} fill="none" stroke="rgba(255,255,255,0.44)"
            strokeWidth="4.5" strokeDasharray="32 20" strokeLinecap="round" />

          {/* ── Connector lines (behind cards) ── */}
          {PHASES.map((p, i) => (
            <line
              key={`conn-${i}`}
              x1={p.cx} y1={p.cy}
              x2={p.lineEnd[0]} y2={p.lineEnd[1]}
              stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3"
            />
          ))}

          {/* ── Cards ── */}
          {PHASES.map((p, i) => {
            const h = cardH(p.items.length);
            const { x, y } = p.card;
            return (
              <g key={`card-${i}`}>
                <rect
                  x={x} y={y} width={CARD_W} height={h} rx={10}
                  fill="white" stroke="#e2e8f0" strokeWidth="1"
                  filter="url(#cdShadow)"
                />
                {/* Phase badge */}
                <rect x={x + 12} y={y + 12} width={p.badgeW} height={20} rx={10} fill={p.color} />
                <text
                  x={x + 12 + p.badgeW / 2} y={y + 25.5}
                  textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white"
                  fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
                  letterSpacing="0.03em"
                >{p.phase}</text>
                {/* Title */}
                <text
                  x={x + 12} y={y + 49}
                  fontSize="12.5" fontWeight="600" fill="#0f172a"
                  fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
                >{p.title}</text>
                {/* Bullets */}
                {p.items.map((item, j) => (
                  <text
                    key={`item-${j}`}
                    x={x + 18} y={y + ITEM_Y0 + j * ITEM_H}
                    fontSize="9.5" fill="#64748b"
                    fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
                  >∙ {item}</text>
                ))}
              </g>
            );
          })}

          {/* ── Milestone dots (topmost) ── */}
          {PHASES.map((p, i) => (
            <g key={`dot-${i}`}>
              <circle cx={p.cx} cy={p.cy} r={18} fill="white" />
              <circle cx={p.cx} cy={p.cy} r={12} fill={p.color} />
              <text
                x={p.cx} y={p.cy + 4.5}
                textAnchor="middle" fontSize="10" fontWeight="700" fill="white"
                fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
              >{i + 1}</text>
            </g>
          ))}
        </svg>
      </AnimateIn>

    </section>
  );
}
