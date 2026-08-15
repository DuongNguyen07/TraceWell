import { PrismaClient, Role, CareNoteType, DiagnosisStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

function dob(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}

function daysAgo(n: number, hourOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

// ─── Hospital ─────────────────────────────────────────────────────────────────

const HOSPITAL_STAFF: { name: string; email: string; password: string; role: Role; org: string }[] = [
  { name: "Sarah Jones",      email: "sarah.jones@stpetershospital.com",  password: "nurse123",   role: "NURSE",   org: "hospital" },
  { name: "James Kowalski",   email: "j.kowalski@stpetershospital.com",   password: "nurse123",   role: "NURSE",   org: "hospital" },
  { name: "Dr. Michael Chen", email: "dr.chen@stpetershospital.com",      password: "doctor123",  role: "DOCTOR",  org: "hospital" },
  { name: "Patricia Walsh",   email: "p.walsh@stpetershospital.com",      password: "manager123", role: "MANAGER", org: "hospital" },
];

const HOSPITAL_PATIENTS = [
  {
    user: { name: "Amara Chen",  email: "amara.chen@stpetershospital.com",  password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1957, 3, 12),
      ward: "Ward 3B",
      allergies: ["Penicillin", "Shellfish"],
      baseline:   { mood: 6, appetite: 6, mobility: 5, sleep: 6 },
      profileData: {
        preferences: "Prefers tea over coffee; likes the curtain open during the day.",
        routine: "Usually naps 2-3pm; anxious before scans.",
        communicationStyle: "Mandarin is first language; prefers written instructions repeated verbally.",
      },
      medications: [
        { name: "Metformin",  dose: "500mg", frequency: "Twice daily" },
        { name: "Lisinopril", dose: "10mg",  frequency: "Once daily"  },
      ],
      diagnoses: [
        { condition: "Type 2 diabetes", status: "CHRONIC" as DiagnosisStatus },
        { condition: "Hypertension",    status: "ACTIVE"  as DiagnosisStatus },
      ],
      dietaryNotes: "Low-sodium, diabetic diet.",
    },
  },
  {
    user: { name: "David Osei", email: "david.osei@stpetershospital.com", password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1970, 8, 25),
      ward: "Ward 2A",
      allergies: ["Latex"],
      baseline:   { mood: 7, appetite: 7, mobility: 7, sleep: 5 },
      profileData: {
        preferences: "Prefers to be called Dave; likes the radio on low.",
        routine: "Early riser, walks the ward corridor most mornings.",
        communicationStyle: "Direct communicator, appreciates being told things plainly.",
      },
      medications: [
        { name: "Paracetamol", dose: "1g",   frequency: "Four times daily" },
        { name: "Enoxaparin",  dose: "40mg", frequency: "Once daily"       },
      ],
      diagnoses: [
        { condition: "Post-op recovery (hip replacement)", status: "ACTIVE" as DiagnosisStatus },
      ],
      dietaryNotes: "No restrictions.",
    },
  },
  {
    user: { name: "Priya Singh", email: "priya.singh@stpetershospital.com", password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1953, 11, 7),
      ward: "ICU-4",
      allergies: [] as string[],
      baseline:   { mood: 5, appetite: 5, mobility: 3, sleep: 6 },
      profileData: {
        preferences: "Vegetarian; family visits are important, prefers evenings.",
        routine: "Sleeps lightly, wakes easily to noise.",
        communicationStyle: "Prefers Hindi for complex explanations; daughter often translates.",
      },
      medications: [
        { name: "Warfarin",         dose: "3mg",      frequency: "Once daily, evening" },
        { name: "Metoprolol",       dose: "25mg",     frequency: "Twice daily"         },
        { name: "Insulin (Lantus)", dose: "10 units", frequency: "Nightly"             },
      ],
      diagnoses: [
        { condition: "Post-cardiac surgery", status: "ACTIVE"  as DiagnosisStatus },
        { condition: "Atrial fibrillation",  status: "CHRONIC" as DiagnosisStatus },
      ],
      dietaryNotes: "Fluid-restricted, vegetarian.",
    },
  },
];

const HOSPITAL_FAMILY = [
  {
    user: { name: "Lena Chen", email: "lena.chen@gmail.com", password: "family123", role: "FAMILY_MEMBER" as Role, org: "hospital" },
    linkedPatientEmail: "amara.chen@stpetershospital.com",
    relationship: "daughter",
  },
];

// ─── Aged Care ────────────────────────────────────────────────────────────────

const AGED_CARE_STAFF: { name: string; email: string; password: string; role: Role; org: string }[] = [
  { name: "Mary Nguyen",     email: "mary.nguyen@sunriseagedcare.com.au",  password: "nurse123",   role: "NURSE",   org: "agedcare" },
  { name: "Tom Bradley",     email: "t.bradley@sunriseagedcare.com.au",    password: "nurse123",   role: "NURSE",   org: "agedcare" },
  { name: "Dr. Anita Patel", email: "dr.patel@sunriseagedcare.com.au",     password: "doctor123",  role: "DOCTOR",  org: "agedcare" },
  { name: "James Wilson",    email: "j.wilson@sunriseagedcare.com.au",     password: "manager123", role: "MANAGER", org: "agedcare" },
];

const AGED_CARE_PATIENTS = [
  {
    user: { name: "Margaret Wu", email: "margaret.wu@sunriseagedcare.com.au", password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1942, 5, 20),
      ward: "Room 12B",
      allergies: ["Sulfa drugs"],
      baseline:   { mood: 7, appetite: 7, mobility: 6, sleep: 7 },
      profileData: {
        preferences: "Enjoys gardening chat and classical music; dislikes rushed showers.",
        routine: "Church call every Sunday morning; tea at 3pm sharp.",
        communicationStyle: "Mild hearing loss in left ear - approach from the right.",
      },
      medications: [
        { name: "Donepezil",   dose: "5mg",   frequency: "Once daily, evening" },
        { name: "Paracetamol", dose: "500mg", frequency: "As required"         },
      ],
      diagnoses: [
        { condition: "Osteoarthritis",         status: "CHRONIC" as DiagnosisStatus },
        { condition: "Mild cognitive impairment", status: "CHRONIC" as DiagnosisStatus },
      ],
      dietaryNotes: "Soft-food diet, thickened fluids.",
    },
  },
  {
    user: { name: "Robert Nguyen", email: "robert.nguyen@sunriseagedcare.com.au", password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1948, 9, 14),
      ward: "Room 08A",
      allergies: [] as string[],
      baseline:   { mood: 6, appetite: 8, mobility: 7, sleep: 6 },
      profileData: {
        preferences: "Enjoys card games with other residents; strong coffee only.",
        routine: "Physio every Tuesday and Thursday at 10am.",
        communicationStyle: "Vietnamese first language; son Minh usually assists with complex topics.",
      },
      medications: [
        { name: "Metformin",  dose: "500mg", frequency: "Twice daily with meals" },
        { name: "Metoprolol", dose: "25mg",  frequency: "Twice daily"            },
      ],
      diagnoses: [
        { condition: "Type 2 diabetes", status: "CHRONIC" as DiagnosisStatus },
      ],
      dietaryNotes: "Diabetic diet, no added sugar.",
    },
  },
  {
    user: { name: "Elsie Campbell", email: "elsie.campbell@sunriseagedcare.com.au", password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1935, 2, 28),
      ward: "Room 14C",
      allergies: ["Penicillin"],
      baseline:   { mood: 8, appetite: 6, mobility: 4, sleep: 8 },
      profileData: {
        preferences: "Loves her dog's photo on the nightstand; prefers female carers for personal care.",
        routine: "Settles best with the hallway light left on overnight.",
        communicationStyle: "Mild dementia - short, simple sentences work best; avoid open-ended questions.",
      },
      medications: [
        { name: "Furosemide", dose: "40mg",  frequency: "Once daily, morning" },
        { name: "Aspirin",    dose: "100mg", frequency: "Once daily"          },
      ],
      diagnoses: [
        { condition: "Congestive heart failure", status: "CHRONIC" as DiagnosisStatus },
        { condition: "Reduced mobility",         status: "ACTIVE"  as DiagnosisStatus },
      ],
      dietaryNotes: "Low-salt diet, fluid intake monitored.",
    },
  },
];

const AGED_CARE_FAMILY = [
  {
    user: { name: "Tom Wu", email: "tom.wu@gmail.com", password: "family123", role: "FAMILY_MEMBER" as Role, org: "agedcare" },
    linkedPatientEmail: "margaret.wu@sunriseagedcare.com.au",
    relationship: "son",
  },
];

// ─── Sample clinical data ──────────────────────────────────────────────────────

function sampleNotes(patientName: string): { content: string; daysBack: number; hour: number }[] {
  const n = patientName.split(" ")[0];
  return [
    { content: `${n} settled overnight. No complaints of pain. Encouraged oral fluids. Obs stable.`,                                                daysBack: 0, hour: 7  },
    { content: `Assisted ${n} with morning care. Mood appears brighter today — engaged in conversation. Appetite improving.`,                        daysBack: 1, hour: 9  },
    { content: `${n} reported some discomfort this afternoon. Administered analgesia as charted. Will monitor. Family visited.`,                     daysBack: 2, hour: 14 },
    { content: `Night round — ${n} sleeping comfortably. No incidents to report. Fluid balance within expected range.`,                              daysBack: 3, hour: 22 },
    { content: `${n} participated in morning exercises with physio. Good engagement, tolerated well.`,                                               daysBack: 5, hour: 10 },
  ];
}

function sampleWellbeing(baseline: { mood: number; appetite: number; mobility: number; sleep: number }) {
  const vary = (base: number) => Math.min(10, Math.max(1, Math.round(base + (Math.random() - 0.5) * 2)));
  return [5, 4, 2, 0].map((daysBack) => ({
    mood:      vary(baseline.mood),
    appetite:  vary(baseline.appetite),
    mobility:  vary(baseline.mobility),
    sleep:     vary(baseline.sleep),
    daysBack,
  }));
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

async function upsertUser(u: { name: string; email: string; password: string; role: Role; org: string }) {
  const hashed = await hash(u.password);
  return prisma.user.upsert({
    where:  { email: u.email },
    update: { name: u.name, role: u.role, org: u.org },
    create: { name: u.name, email: u.email, password: hashed, role: u.role, org: u.org },
  });
}

async function seedFacility(
  label: string,
  staff: typeof HOSPITAL_STAFF,
  patients: typeof HOSPITAL_PATIENTS,
  family: typeof HOSPITAL_FAMILY,
  nurseEmail: string,
  authorRoleLabel: string,
) {
  console.log(`\n${label}`);

  for (const s of staff) {
    await upsertUser(s);
    console.log(`  ✓ ${s.role.padEnd(12)} ${s.email}`);
  }

  const nurseUser = await prisma.user.findUnique({ where: { email: nurseEmail } });

  for (const p of patients) {
    const patientUser = await upsertUser(p.user);
    console.log(`  ✓ PATIENT       ${p.user.email}`);

    const pp = await prisma.patientProfile.upsert({
      where:  { userId: patientUser.id },
      update: {
        org:         p.user.org,
        dateOfBirth: p.profile.dateOfBirth,
        ward:        p.profile.ward,
        allergies:   p.profile.allergies,
        baseline:    p.profile.baseline,
        profile:     p.profile.profileData,
      },
      create: {
        userId:      patientUser.id,
        org:         p.user.org,
        dateOfBirth: p.profile.dateOfBirth,
        ward:        p.profile.ward,
        allergies:   p.profile.allergies,
        baseline:    p.profile.baseline,
        profile:     p.profile.profileData,
      },
    });

    // Medications
    await prisma.medication.deleteMany({ where: { patientProfileId: pp.id } });
    for (const m of p.profile.medications) {
      await prisma.medication.create({
        data: { patientProfileId: pp.id, name: m.name, dose: m.dose, frequency: m.frequency },
      });
    }

    // Diagnoses
    await prisma.diagnosis.deleteMany({ where: { patientProfileId: pp.id } });
    for (const d of p.profile.diagnoses) {
      await prisma.diagnosis.create({
        data: {
          patientProfileId: pp.id,
          condition:        d.condition,
          status:           d.status,
          authorRole:       authorRoleLabel,
        },
      });
    }

    // Care notes
    if (nurseUser) {
      await prisma.careNote.deleteMany({ where: { patientProfileId: pp.id } });
      for (const note of sampleNotes(p.user.name)) {
        await prisma.careNote.create({
          data: {
            patientProfileId: pp.id,
            authorId:         nurseUser.id,
            authorRole:       `${nurseUser.name} (${authorRoleLabel})`,
            type:             CareNoteType.TEXT,
            content:          note.content,
            createdAt:        daysAgo(note.daysBack, note.hour),
          },
        });
      }
    }

    // Wellbeing checks
    await prisma.wellbeingCheck.deleteMany({ where: { patientProfileId: pp.id } });
    for (const w of sampleWellbeing(p.profile.baseline)) {
      await prisma.wellbeingCheck.create({
        data: {
          patientProfileId: pp.id,
          mood:      w.mood,
          appetite:  w.appetite,
          mobility:  w.mobility,
          sleep:     w.sleep,
          recordedAt: daysAgo(w.daysBack, 9),
        },
      });
    }
  }

  for (const f of family) {
    const familyUser = await upsertUser(f.user);
    console.log(`  ✓ FAMILY_MEMBER ${f.user.email} → ${f.linkedPatientEmail}`);

    const linkedPatientUser = await prisma.user.findUnique({ where: { email: f.linkedPatientEmail } });
    if (linkedPatientUser) {
      const linkedProfile = await prisma.patientProfile.findUnique({ where: { userId: linkedPatientUser.id } });
      if (linkedProfile) {
        await prisma.familyLink.upsert({
          where:  { familyMemberId_patientProfileId: { familyMemberId: familyUser.id, patientProfileId: linkedProfile.id } },
          update: {},
          create: { familyMemberId: familyUser.id, patientProfileId: linkedProfile.id, relationship: f.relationship },
        });
      }
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding Tracewell demo data...");

  // Remove legacy demo accounts
  const removed = await prisma.user.deleteMany({ where: { email: { endsWith: "@tracewell.demo" } } });
  if (removed.count > 0) console.log(`Removed ${removed.count} legacy @tracewell.demo account(s)`);

  await seedFacility(
    "🏥  St Peter's Hospital",
    HOSPITAL_STAFF,
    HOSPITAL_PATIENTS,
    HOSPITAL_FAMILY,
    "sarah.jones@stpetershospital.com",
    "Nurse",
  );

  await seedFacility(
    "🌅  Sunrise Aged Care",
    AGED_CARE_STAFF,
    AGED_CARE_PATIENTS,
    AGED_CARE_FAMILY,
    "mary.nguyen@sunriseagedcare.com.au",
    "Carer",
  );

  console.log("\n✅  Seed complete.");
  console.log("\n── Demo credentials ──────────────────────────────────────────────");
  console.log("  St Peter's Hospital  (org: hospital)");
  console.log("    Nurse:   sarah.jones@stpetershospital.com   / nurse123");
  console.log("    Doctor:  dr.chen@stpetershospital.com       / doctor123");
  console.log("    Manager: p.walsh@stpetershospital.com       / manager123");
  console.log("    Patient: amara.chen@stpetershospital.com    / patient123");
  console.log("    Family:  lena.chen@gmail.com                / family123");
  console.log("  Sunrise Aged Care  (org: agedcare)");
  console.log("    Carer:   mary.nguyen@sunriseagedcare.com.au / nurse123");
  console.log("    Doctor:  dr.patel@sunriseagedcare.com.au    / doctor123");
  console.log("    Manager: j.wilson@sunriseagedcare.com.au    / manager123");
  console.log("    Resident:margaret.wu@sunriseagedcare.com.au / patient123");
  console.log("    Family:  tom.wu@gmail.com                   / family123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
