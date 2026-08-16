import { PrismaClient, Role, CareNoteType, DiagnosisStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hash(pw: string) { return bcrypt.hash(pw, 10); }
function dob(year: number, month: number, day: number) { return new Date(year, month - 1, day); }
function daysAgo(n: number, hourOffset = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Never produce a future timestamp — if today, cap to 1 hour before now.
  const safeHour = n === 0 ? Math.min(hourOffset, Math.max(0, new Date().getHours() - 1)) : hourOffset;
  d.setHours(safeHour, Math.floor(Math.random() * 59), 0, 0);
  return d;
}
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v: number, min = 1, max = 10) { return Math.min(max, Math.max(min, Math.round(v))); }
function vary(base: number, spread = 2) { return clamp(base + (Math.random() - 0.5) * spread * 2); }

// ─── Hospital staff ────────────────────────────────────────────────────────────

const HOSPITAL_STAFF = [
  // AM shift nurses (7 am – 3 pm)
  { name: "Sarah Jones",        email: "sarah.jones@stpetershospital.com",     password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  { name: "James Kowalski",     email: "j.kowalski@stpetershospital.com",      password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  { name: "Emma Davies",        email: "e.davies@stpetershospital.com",        password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  // PM shift nurses (3 pm – 11 pm)
  { name: "Aisha Okonkwo",      email: "a.okonkwo@stpetershospital.com",       password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  { name: "Rebecca Torres",     email: "r.torres@stpetershospital.com",        password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  { name: "Daniel Park",        email: "d.park@stpetershospital.com",          password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  // Night shift nurses (11 pm – 7 am)
  { name: "Kevin Murphy",       email: "k.murphy@stpetershospital.com",        password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  { name: "Nina Walsh",         email: "n.walsh@stpetershospital.com",         password: "nurse123",   role: "NURSE"   as Role, org: "hospital" },
  // Doctors
  { name: "Dr. Michael Chen",   email: "dr.chen@stpetershospital.com",         password: "doctor123",  role: "DOCTOR"  as Role, org: "hospital" },
  { name: "Dr. Fatima Malik",   email: "dr.malik@stpetershospital.com",        password: "doctor123",  role: "DOCTOR"  as Role, org: "hospital" },
  { name: "Dr. Raj Sundaram",   email: "dr.sundaram@stpetershospital.com",     password: "doctor123",  role: "DOCTOR"  as Role, org: "hospital" },
  { name: "Dr. Emma Lawson",    email: "dr.lawson@stpetershospital.com",       password: "doctor123",  role: "DOCTOR"  as Role, org: "hospital" },
  { name: "Patricia Walsh",     email: "p.walsh@stpetershospital.com",         password: "manager123", role: "MANAGER" as Role, org: "hospital" },
];

const HOSPITAL_PATIENTS = [
  {
    user: { name: "Amara Chen",    email: "amara.chen@stpetershospital.com",    password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1957, 3, 12), ward: "Ward 3B",
      allergies: ["Penicillin", "Shellfish"],
      baseline: { mood: 6, appetite: 6, mobility: 5, sleep: 6 },
      profileData: { preferences: "Prefers tea over coffee; likes the curtain open during the day.", routine: "Usually naps 2–3 pm; anxious before scans.", communicationStyle: "Mandarin is first language; prefers written instructions repeated verbally." },
      medications: [{ name: "Metformin", dose: "500 mg", frequency: "Twice daily" }, { name: "Lisinopril", dose: "10 mg", frequency: "Once daily" }],
      diagnoses: [{ condition: "Type 2 diabetes", status: "CHRONIC" as DiagnosisStatus }, { condition: "Hypertension", status: "ACTIVE" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "David Osei",    email: "david.osei@stpetershospital.com",    password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1970, 8, 25), ward: "Ward 2A",
      allergies: ["Latex"],
      baseline: { mood: 7, appetite: 7, mobility: 7, sleep: 5 },
      profileData: { preferences: "Prefers to be called Dave; likes the radio on low.", routine: "Early riser, walks the corridor most mornings.", communicationStyle: "Direct communicator, appreciates plain talk." },
      medications: [{ name: "Paracetamol", dose: "1 g", frequency: "Four times daily" }, { name: "Enoxaparin", dose: "40 mg", frequency: "Once daily" }],
      diagnoses: [{ condition: "Post-op recovery (hip replacement)", status: "ACTIVE" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Priya Singh",   email: "priya.singh@stpetershospital.com",   password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1953, 11, 7), ward: "ICU-4",
      allergies: [],
      baseline: { mood: 5, appetite: 5, mobility: 3, sleep: 6 },
      profileData: { preferences: "Vegetarian; family visits important, prefers evenings.", routine: "Sleeps lightly, wakes easily to noise.", communicationStyle: "Prefers Hindi for complex explanations; daughter often translates." },
      medications: [{ name: "Warfarin", dose: "3 mg", frequency: "Once daily, evening" }, { name: "Metoprolol", dose: "25 mg", frequency: "Twice daily" }, { name: "Insulin (Lantus)", dose: "10 units", frequency: "Nightly" }],
      diagnoses: [{ condition: "Post-cardiac surgery", status: "ACTIVE" as DiagnosisStatus }, { condition: "Atrial fibrillation", status: "CHRONIC" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Thomas Burke",  email: "t.burke@stpetershospital.com",       password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1965, 6, 19), ward: "Ward 5C",
      allergies: ["Codeine"],
      baseline: { mood: 7, appetite: 8, mobility: 6, sleep: 7 },
      profileData: { preferences: "Keen AFL fan; keep him updated on scores.", routine: "Showers independently in the morning.", communicationStyle: "Very talkative; brief summaries work better than long explanations." },
      medications: [{ name: "Omeprazole", dose: "20 mg", frequency: "Once daily" }, { name: "Atorvastatin", dose: "40 mg", frequency: "Once daily, night" }],
      diagnoses: [{ condition: "Peptic ulcer disease", status: "ACTIVE" as DiagnosisStatus }, { condition: "Hyperlipidaemia", status: "CHRONIC" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Helen Park",    email: "h.park@stpetershospital.com",        password: "patient123", role: "PATIENT" as Role, org: "hospital" },
    profile: {
      dateOfBirth: dob(1948, 2, 3), ward: "Ward 3B",
      allergies: ["Aspirin", "NSAIDs"],
      baseline: { mood: 6, appetite: 5, mobility: 4, sleep: 5 },
      profileData: { preferences: "Prefers female nurses for personal care; enjoys crossword puzzles.", routine: "Takes morning medications before breakfast.", communicationStyle: "Slight hearing impairment; speak clearly and face her directly." },
      medications: [{ name: "Furosemide", dose: "40 mg", frequency: "Once daily, morning" }, { name: "Spironolactone", dose: "25 mg", frequency: "Once daily" }, { name: "Digoxin", dose: "0.125 mg", frequency: "Once daily" }],
      diagnoses: [{ condition: "Heart failure (HFrEF)", status: "CHRONIC" as DiagnosisStatus }, { condition: "Chronic kidney disease stage 3", status: "CHRONIC" as DiagnosisStatus }],
    },
  },
];

const HOSPITAL_FAMILY = [
  { user: { name: "Lena Chen",    email: "lena.chen@gmail.com",       password: "family123", role: "FAMILY_MEMBER" as Role, org: "hospital" }, linkedPatientEmail: "amara.chen@stpetershospital.com",  relationship: "daughter" },
  { user: { name: "Kofi Osei",    email: "kofi.osei@gmail.com",       password: "family123", role: "FAMILY_MEMBER" as Role, org: "hospital" }, linkedPatientEmail: "david.osei@stpetershospital.com",  relationship: "brother"  },
  { user: { name: "Ananya Singh", email: "ananya.singh@gmail.com",    password: "family123", role: "FAMILY_MEMBER" as Role, org: "hospital" }, linkedPatientEmail: "priya.singh@stpetershospital.com", relationship: "daughter" },
  { user: { name: "Claire Burke", email: "claire.burke@gmail.com",    password: "family123", role: "FAMILY_MEMBER" as Role, org: "hospital" }, linkedPatientEmail: "t.burke@stpetershospital.com",     relationship: "spouse"   },
];

// ─── Aged Care staff ───────────────────────────────────────────────────────────

const AGED_CARE_STAFF = [
  // AM shift nurses (7 am – 3 pm)
  { name: "Mary Nguyen",        email: "mary.nguyen@sunriseagedcare.com.au",    password: "nurse123",   role: "NURSE"   as Role, org: "agedcare" },
  { name: "Fiona Brennan",      email: "f.brennan@sunriseagedcare.com.au",      password: "nurse123",   role: "NURSE"   as Role, org: "agedcare" },
  // PM shift nurses (3 pm – 11 pm)
  { name: "Tom Bradley",        email: "t.bradley@sunriseagedcare.com.au",      password: "nurse123",   role: "NURSE"   as Role, org: "agedcare" },
  { name: "Priya Sharma",       email: "p.sharma@sunriseagedcare.com.au",       password: "nurse123",   role: "NURSE"   as Role, org: "agedcare" },
  // Night shift nurse
  { name: "Chen Wei",           email: "c.wei@sunriseagedcare.com.au",          password: "nurse123",   role: "NURSE"   as Role, org: "agedcare" },
  // AM carers
  { name: "Linda Santos",       email: "l.santos@sunriseagedcare.com.au",       password: "carer123",   role: "CARER"   as Role, org: "agedcare" },
  { name: "Judy Kim",           email: "j.kim@sunriseagedcare.com.au",          password: "carer123",   role: "CARER"   as Role, org: "agedcare" },
  // PM carers
  { name: "Marcus Webb",        email: "m.webb@sunriseagedcare.com.au",         password: "carer123",   role: "CARER"   as Role, org: "agedcare" },
  { name: "Rosa Delgado",       email: "r.delgado@sunriseagedcare.com.au",      password: "carer123",   role: "CARER"   as Role, org: "agedcare" },
  // Night carer
  { name: "Ahmed Hassan",       email: "a.hassan@sunriseagedcare.com.au",       password: "carer123",   role: "CARER"   as Role, org: "agedcare" },
  // Doctors
  { name: "Dr. Anita Patel",    email: "dr.patel@sunriseagedcare.com.au",       password: "doctor123",  role: "DOCTOR"  as Role, org: "agedcare" },
  { name: "Dr. Samuel Obi",     email: "dr.obi@sunriseagedcare.com.au",         password: "doctor123",  role: "DOCTOR"  as Role, org: "agedcare" },
  { name: "James Wilson",       email: "j.wilson@sunriseagedcare.com.au",       password: "manager123", role: "MANAGER" as Role, org: "agedcare" },
];

const AGED_CARE_PATIENTS = [
  {
    user: { name: "Margaret Wu",    email: "margaret.wu@sunriseagedcare.com.au",    password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1942, 5, 20), ward: "Room 12B",
      allergies: ["Sulfa drugs"],
      baseline: { mood: 7, appetite: 7, mobility: 6, sleep: 7 },
      profileData: { preferences: "Enjoys gardening chat and classical music; dislikes rushed showers.", routine: "Church call Sunday morning; tea at 3 pm sharp.", communicationStyle: "Mild hearing loss in left ear — approach from the right." },
      medications: [{ name: "Donepezil", dose: "5 mg", frequency: "Once daily, evening" }, { name: "Paracetamol", dose: "500 mg", frequency: "As required" }],
      diagnoses: [{ condition: "Osteoarthritis", status: "CHRONIC" as DiagnosisStatus }, { condition: "Mild cognitive impairment", status: "CHRONIC" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Robert Nguyen",  email: "robert.nguyen@sunriseagedcare.com.au",  password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1948, 9, 14), ward: "Room 08A",
      allergies: [],
      baseline: { mood: 6, appetite: 8, mobility: 7, sleep: 6 },
      profileData: { preferences: "Enjoys card games with other residents; strong coffee only.", routine: "Physio every Tuesday and Thursday at 10 am.", communicationStyle: "Vietnamese first language; son Minh assists with complex topics." },
      medications: [{ name: "Metformin", dose: "500 mg", frequency: "Twice daily with meals" }, { name: "Metoprolol", dose: "25 mg", frequency: "Twice daily" }],
      diagnoses: [{ condition: "Type 2 diabetes", status: "CHRONIC" as DiagnosisStatus }, { condition: "Hypertension", status: "ACTIVE" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Elsie Campbell", email: "elsie.campbell@sunriseagedcare.com.au", password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1935, 2, 28), ward: "Room 14C",
      allergies: ["Penicillin"],
      baseline: { mood: 8, appetite: 6, mobility: 4, sleep: 8 },
      profileData: { preferences: "Loves her dog's photo on the nightstand; prefers female carers for personal care.", routine: "Settles best with the hallway light left on overnight.", communicationStyle: "Mild dementia — short simple sentences; avoid open-ended questions." },
      medications: [{ name: "Furosemide", dose: "40 mg", frequency: "Once daily, morning" }, { name: "Aspirin", dose: "100 mg", frequency: "Once daily" }],
      diagnoses: [{ condition: "Congestive heart failure", status: "CHRONIC" as DiagnosisStatus }, { condition: "Reduced mobility", status: "ACTIVE" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Arthur Reid",    email: "arthur.reid@sunriseagedcare.com.au",    password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1939, 11, 5), ward: "Room 07B",
      allergies: ["Ibuprofen"],
      baseline: { mood: 7, appetite: 7, mobility: 5, sleep: 7 },
      profileData: { preferences: "Retired schoolteacher; loves chess and the morning newspaper.", routine: "Walks to the garden daily at 9 am when weather permits.", communicationStyle: "Sharp and articulate; prefers full explanations of his care plan." },
      medications: [{ name: "Warfarin", dose: "2 mg", frequency: "Once daily" }, { name: "Amlodipine", dose: "5 mg", frequency: "Once daily" }, { name: "Atorvastatin", dose: "20 mg", frequency: "Once nightly" }],
      diagnoses: [{ condition: "Atrial fibrillation", status: "CHRONIC" as DiagnosisStatus }, { condition: "Peripheral vascular disease", status: "CHRONIC" as DiagnosisStatus }],
    },
  },
  {
    user: { name: "Dorothy Mason",  email: "dorothy.mason@sunriseagedcare.com.au",  password: "patient123", role: "PATIENT" as Role, org: "agedcare" },
    profile: {
      dateOfBirth: dob(1944, 7, 22), ward: "Room 11A",
      allergies: [],
      baseline: { mood: 6, appetite: 6, mobility: 6, sleep: 5 },
      profileData: { preferences: "Enjoys knitting and afternoon TV; dislikes fluorescent lighting.", routine: "Takes a short walk after lunch each day.", communicationStyle: "Responds well to humour; becomes withdrawn when in pain." },
      medications: [{ name: "Prednisolone", dose: "5 mg", frequency: "Once daily, morning" }, { name: "Calcium + Vit D", dose: "600 mg / 400 IU", frequency: "Once daily" }, { name: "Omeprazole", dose: "20 mg", frequency: "Once daily" }],
      diagnoses: [{ condition: "Rheumatoid arthritis", status: "CHRONIC" as DiagnosisStatus }, { condition: "Osteoporosis", status: "CHRONIC" as DiagnosisStatus }, { condition: "Insomnia", status: "ACTIVE" as DiagnosisStatus }],
    },
  },
];

const AGED_CARE_FAMILY = [
  { user: { name: "Tom Wu",       email: "tom.wu@gmail.com",          password: "family123", role: "FAMILY_MEMBER" as Role, org: "agedcare" }, linkedPatientEmail: "margaret.wu@sunriseagedcare.com.au",    relationship: "son"      },
  { user: { name: "Minh Nguyen",  email: "minh.nguyen@gmail.com",     password: "family123", role: "FAMILY_MEMBER" as Role, org: "agedcare" }, linkedPatientEmail: "robert.nguyen@sunriseagedcare.com.au",  relationship: "son"      },
  { user: { name: "Grace Reid",   email: "grace.reid@gmail.com",      password: "family123", role: "FAMILY_MEMBER" as Role, org: "agedcare" }, linkedPatientEmail: "arthur.reid@sunriseagedcare.com.au",    relationship: "daughter" },
  { user: { name: "Paul Mason",   email: "paul.mason@gmail.com",      password: "family123", role: "FAMILY_MEMBER" as Role, org: "agedcare" }, linkedPatientEmail: "dorothy.mason@sunriseagedcare.com.au",  relationship: "spouse"   },
];

// ─── Clinical data generators ──────────────────────────────────────────────────

// Each entry carries a shiftSlot so we can pick the right nurse author.
// slot 0 = AM (7–14), slot 1 = PM (15–22), slot 2 = Night (23/0–6)
type NoteTemplate = { content: string; daysBack: number; hour: number; slot: 0 | 1 | 2 };

function careNoteTemplates(n: string): NoteTemplate[] {
  return [
    { content: `${n} settled overnight. No complaints of pain. Encouraged oral fluids. Obs stable.`,                                      daysBack: 0,  hour: 2,  slot: 2 },
    { content: `Handover from night — ${n} had a restful night. Handing over to AM team.`,                                                daysBack: 0,  hour: 7,  slot: 0 },
    { content: `Assisted ${n} with morning care. Mood appears brighter today — engaged in conversation. Appetite improving.`,              daysBack: 0,  hour: 9,  slot: 0 },
    { content: `Medications administered on time. ${n} tolerating oral intake well. No acute concerns.`,                                   daysBack: 1,  hour: 8,  slot: 0 },
    { content: `${n} reported some discomfort this afternoon. Administered analgesia as charted. Will monitor. Family visited at 3 pm.`,   daysBack: 1,  hour: 15, slot: 1 },
    { content: `PM handover: ${n} settled after analgesia, obs stable. Handing to night team.`,                                           daysBack: 1,  hour: 22, slot: 1 },
    { content: `Night round — ${n} sleeping comfortably. No incidents to report. Fluid balance within expected range.`,                    daysBack: 2,  hour: 1,  slot: 2 },
    { content: `${n} participated in morning exercises with physio. Good engagement, tolerated well.`,                                     daysBack: 3,  hour: 10, slot: 0 },
    { content: `Lunchtime: ${n} ate well. Walked to the window with minimal assistance. Good progress.`,                                   daysBack: 3,  hour: 12, slot: 0 },
    { content: `Afternoon obs completed. ${n} asked about discharge timeline — relayed to medical team for review.`,                       daysBack: 4,  hour: 16, slot: 1 },
    { content: `PM check: ${n} resting comfortably. No new complaints. IV site reviewed — no signs of infiltration.`,                     daysBack: 4,  hour: 19, slot: 1 },
    { content: `${n} had a disrupted night, needed repositioning twice. No skin breakdown noted. Comfort measures applied.`,               daysBack: 5,  hour: 3,  slot: 2 },
    { content: `Handover note: ${n} has been more withdrawn today. Encouraged fluids. Consider checking in with family re: mood.`,         daysBack: 6,  hour: 14, slot: 0 },
    { content: `${n} brighter this afternoon following family visit. Ate full dinner. Good overnight.`,                                    daysBack: 7,  hour: 17, slot: 1 },
    { content: `Routine AM check — vitals stable, no acute concerns. ${n} in good spirits.`,                                              daysBack: 9,  hour: 8,  slot: 0 },
    { content: `${n} required assistance with mobilisation today. Physio referral discussed with medical team.`,                           daysBack: 11, hour: 11, slot: 0 },
    { content: `Night uneventful. ${n} slept through most of the night. Morning team has been updated.`,                                  daysBack: 13, hour: 6,  slot: 2 },
    { content: `${n} in good spirits. Chatted about going home. Plan reviewed with family by doctor this afternoon.`,                      daysBack: 15, hour: 15, slot: 1 },
  ];
}

function familyUpdateNotes(patientName: string, authorName: string): { content: string; daysBack: number }[] {
  const n = patientName.split(" ")[0];
  return [
    { content: `Hi family — just a quick update. ${n} has been in good spirits today and enjoyed lunch. No concerns from the nursing team.`, daysBack: 1  },
    { content: `${n} had a restful night and walked to the common area this morning. The care team is pleased with progress.`,               daysBack: 4  },
    { content: `A reminder that visiting hours are 10 am–7 pm. ${n} mentioned they'd love some familiar photos from home.`,                  daysBack: 8  },
  ];
}

function wellbeingHistory(baseline: { mood: number; appetite: number; mobility: number; sleep: number }) {
  // Spread over 6 weeks so weekly/monthly chart views have enough data
  const entries = [];
  for (let daysBack = 42; daysBack >= 0; daysBack -= rand(2, 4)) {
    entries.push({
      mood:      vary(baseline.mood),
      appetite:  vary(baseline.appetite),
      mobility:  vary(baseline.mobility),
      sleep:     vary(baseline.sleep),
      daysBack,
    });
  }
  return entries;
}

function vitalsHistory(daysSpan: number): { systolic: number; diastolic: number; heartRate: number; temperature: number; oxygenSaturation: number; respiratoryRate: number; daysBack: number; hour: number }[] {
  const entries = [];
  for (let daysBack = daysSpan; daysBack >= 0; daysBack -= rand(2, 3)) {
    entries.push({
      systolic:         rand(110, 145),
      diastolic:        rand(65, 95),
      heartRate:        rand(58, 95),
      temperature:      parseFloat((36.2 + Math.random() * 1.2).toFixed(1)),
      oxygenSaturation: parseFloat((95 + Math.random() * 4).toFixed(1)),
      respiratoryRate:  rand(14, 20),
      daysBack,
      hour: rand(6, 22),
    });
  }
  return entries;
}

// ─── Upsert helper ────────────────────────────────────────────────────────────

async function upsertUser(u: { name: string; email: string; password: string; role: Role; org: string }) {
  const hashed = await hash(u.password);
  return prisma.user.upsert({
    where:  { email: u.email },
    update: { name: u.name, role: u.role, org: u.org },
    create: { name: u.name, email: u.email, password: hashed, role: u.role, org: u.org },
  });
}

// ─── Facility seeder ──────────────────────────────────────────────────────────

async function seedFacility(
  label: string,
  staff: typeof HOSPITAL_STAFF,
  patients: typeof HOSPITAL_PATIENTS,
  family: typeof HOSPITAL_FAMILY,
  // One nurse email per shift slot: [AM, PM, Night]
  nurseEmailsByShift: [string, string, string],
  doctorEmails: string[],
  authorRoleLabel: string,
) {
  console.log(`\n${label}`);

  for (const s of staff) {
    await upsertUser(s);
    console.log(`  ✓ ${s.role.padEnd(13)} ${s.email}`);
  }

  const [amNurse, pmNurse, nightNurse] = await Promise.all(
    nurseEmailsByShift.map((e) => prisma.user.findUnique({ where: { email: e } }))
  );
  const nurseBySlot = [amNurse, pmNurse, nightNurse];

  const doctors = (await Promise.all(
    doctorEmails.map((e) => prisma.user.findUnique({ where: { email: e } }))
  )).filter(Boolean) as NonNullable<typeof amNurse>[];

  const patientProfiles: { id: string; patientName: string }[] = [];

  for (const p of patients) {
    const patientUser = await upsertUser(p.user);
    console.log(`  ✓ PATIENT        ${p.user.email}`);

    const pp = await prisma.patientProfile.upsert({
      where:  { userId: patientUser.id },
      update: { org: p.user.org, dateOfBirth: p.profile.dateOfBirth, ward: p.profile.ward, allergies: p.profile.allergies, baseline: p.profile.baseline, profile: p.profile.profileData },
      create: { userId: patientUser.id, org: p.user.org, dateOfBirth: p.profile.dateOfBirth, ward: p.profile.ward, allergies: p.profile.allergies, baseline: p.profile.baseline, profile: p.profile.profileData },
    });

    patientProfiles.push({ id: pp.id, patientName: p.user.name });

    // Medications
    await prisma.medication.deleteMany({ where: { patientProfileId: pp.id } });
    for (const m of p.profile.medications)
      await prisma.medication.create({ data: { patientProfileId: pp.id, name: m.name, dose: m.dose, frequency: m.frequency } });

    // Diagnoses — rotate doctors so different doctors author different diagnoses
    await prisma.diagnosis.deleteMany({ where: { patientProfileId: pp.id } });
    for (let i = 0; i < p.profile.diagnoses.length; i++) {
      const doc = doctors[i % doctors.length];
      await prisma.diagnosis.create({ data: { patientProfileId: pp.id, condition: p.profile.diagnoses[i].condition, status: p.profile.diagnoses[i].status, authorRole: doc ? `${doc.name} (Doctor)` : "Doctor" } });
    }

    // Care notes — each note is authored by the nurse on that shift
    await prisma.careNote.deleteMany({ where: { patientProfileId: pp.id, type: { in: ["TEXT", "IMAGE", "VOICE"] } } });
    for (const note of careNoteTemplates(p.user.name.split(" ")[0])) {
      const author = nurseBySlot[note.slot] ?? amNurse;
      if (!author) continue;
      await prisma.careNote.create({
        data: { patientProfileId: pp.id, authorId: author.id, authorRole: `${author.name} (${authorRoleLabel})`, type: CareNoteType.TEXT, content: note.content, createdAt: daysAgo(note.daysBack, note.hour) },
      });
    }

    // Family update notes — authored by AM nurse
    if (amNurse) {
      await prisma.careNote.deleteMany({ where: { patientProfileId: pp.id, type: "FAMILY_UPDATE" } });
      for (const note of familyUpdateNotes(p.user.name, amNurse.name))
        await prisma.careNote.create({
          data: { patientProfileId: pp.id, authorId: amNurse.id, authorRole: `${amNurse.name} (${authorRoleLabel})`, type: CareNoteType.FAMILY_UPDATE, content: note.content, createdAt: daysAgo(note.daysBack, 10) },
        });
    }

    // Wellbeing checks (6 weeks of history)
    await prisma.wellbeingCheck.deleteMany({ where: { patientProfileId: pp.id } });
    for (const w of wellbeingHistory(p.profile.baseline))
      await prisma.wellbeingCheck.create({ data: { patientProfileId: pp.id, mood: w.mood, appetite: w.appetite, mobility: w.mobility, sleep: w.sleep, recordedAt: daysAgo(w.daysBack, 9) } });

    // Vitals — rotate across shift nurses
    await prisma.vitalSigns.deleteMany({ where: { patientProfileId: pp.id } });
    const vitalEntries = vitalsHistory(21);
    for (let i = 0; i < vitalEntries.length; i++) {
      const v = vitalEntries[i];
      const slot = v.hour >= 7 && v.hour < 15 ? 0 : v.hour >= 15 && v.hour < 23 ? 1 : 2;
      const vNurse = nurseBySlot[slot] ?? amNurse;
      await prisma.vitalSigns.create({
        data: { patientProfileId: pp.id, authorRole: vNurse ? `${vNurse.name} (${authorRoleLabel})` : authorRoleLabel, systolic: v.systolic, diastolic: v.diastolic, heartRate: v.heartRate, temperature: v.temperature, oxygenSaturation: v.oxygenSaturation, respiratoryRate: v.respiratoryRate, recordedAt: daysAgo(v.daysBack, v.hour) },
      });
    }

    // Medical reports — authored by different doctors
    await prisma.medicalReport.deleteMany({ where: { patientProfileId: pp.id } });
    const firstName = p.user.name.split(" ")[0];
    const doc0 = doctors[0];
    const doc1 = doctors[1] ?? doctors[0];
    await prisma.medicalReport.create({ data: { patientProfileId: pp.id, title: `${firstName} — Admission blood panel`, type: "Blood Test", content: "FBC: Hb 118 g/L, WBC 7.2×10⁹/L, Plt 224×10⁹/L. HbA1c 7.4%. CRP 12 mg/L. Renal function within normal limits.", authorRole: doc0 ? `${doc0.name} (Doctor)` : "Doctor", createdAt: daysAgo(14, 11) } });
    await prisma.medicalReport.create({ data: { patientProfileId: pp.id, title: `${firstName} — Chest X-ray review`, type: "X-Ray", content: "Mild cardiomegaly noted. No acute consolidation or pleural effusion. Lung fields clear peripherally. Review in 6 weeks recommended.", authorRole: doc1 ? `${doc1.name} (Doctor)` : "Doctor", createdAt: daysAgo(7, 14) } });
  }

  // Referrals (between first two patients) — different doctors author each
  const refDoc0 = doctors[0];
  const refDoc1 = doctors[1] ?? doctors[0];
  const refDoc2 = doctors[2] ?? doctors[0];
  if (refDoc0 && patientProfiles.length >= 2) {
    await prisma.referralNote.deleteMany({ where: { patientProfileId: patientProfiles[0].id } });
    await prisma.referralNote.create({
      data: {
        patientProfileId: patientProfiles[0].id,
        authorId:  refDoc0.id,
        fromName:  `${refDoc0.name} (Doctor)`,
        toRecipient:  "Endocrinology",
        toRecipients: ["Endocrinology"],
        referralType: "internal",
        subject:   "Glycaemic review — HbA1c above target",
        message:   `${patientProfiles[0].patientName.split(" ")[0]}'s HbA1c remains at 7.4% despite dose adjustment. Requesting specialist review of current regimen and consideration of GLP-1 agonist.`,
        shareCode: "REF-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: daysAgo(5, 11),
      },
    });
    await prisma.referralNote.create({
      data: {
        patientProfileId: patientProfiles[1].id,
        authorId:  refDoc1.id,
        fromName:  `${refDoc1.name} (Doctor)`,
        toRecipient:  "Physiotherapy",
        toRecipients: ["Physiotherapy", "Occupational Therapy"],
        referralType: "internal",
        subject:   "Post-op mobility assessment",
        message:   "Requesting joint physio and OT review for mobility aids and home environment assessment prior to discharge.",
        shareCode: "REF-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        acknowledged: true,
        acknowledgedBy: amNurse ? `${amNurse.name} (${authorRoleLabel})` : authorRoleLabel,
        acknowledgedAt: daysAgo(2, 9),
        createdAt: daysAgo(6, 14),
      },
    });
    if (patientProfiles.length >= 3) {
      await prisma.referralNote.deleteMany({ where: { patientProfileId: patientProfiles[2].id } });
      await prisma.referralNote.create({
        data: {
          patientProfileId: patientProfiles[2].id,
          authorId:  refDoc2.id,
          fromName:  `${refDoc2.name} (Doctor)`,
          toRecipient:  "St Vincent's Cardiology",
          toRecipients: ["St Vincent's Cardiology"],
          referralType: "external",
          subject:   "Urgent cardiology consult — post-surgical arrhythmia",
          message:   "Patient has developed intermittent AF with RVR post-surgery. Requesting urgent review and consideration of rhythm vs rate control strategy.",
          createdAt: daysAgo(1, 8),
        },
      });
    }
  }

  // Chat messages (on first patient) — authored by AM nurse
  if (patientProfiles.length > 0 && amNurse) {
    await prisma.chatMessage.deleteMany({ where: { patientProfileId: patientProfiles[0].id } });
    const n = patientProfiles[0].patientName.split(" ")[0];
    await prisma.chatMessage.create({ data: { patientProfileId: patientProfiles[0].id, authorName: amNurse.name, authorRole: `${amNurse.name} (${authorRoleLabel})`, content: `Hi family — ${n} is doing well today. Good appetite at lunch and no complaints.`, createdAt: daysAgo(3, 11) } });
    await prisma.chatMessage.create({ data: { patientProfileId: patientProfiles[0].id, authorName: "Family", authorRole: "Family", content: "Thank you for the update! Can we bring in some home-cooked food tomorrow?", createdAt: daysAgo(2, 19) } });
    await prisma.chatMessage.create({ data: { patientProfileId: patientProfiles[0].id, authorName: amNurse.name, authorRole: `${amNurse.name} (${authorRoleLabel})`, content: "Absolutely — soft foods are fine, just avoid anything salty or high in sugar given the dietary restrictions.", createdAt: daysAgo(2, 20) } });
    await prisma.chatMessage.create({ data: { patientProfileId: patientProfiles[0].id, authorName: "Family", authorRole: "Family", content: "Understood! We'll bring congee. See you tomorrow around 4 pm.", createdAt: daysAgo(1, 9) } });
  }

  // Family links
  for (const f of family) {
    const familyUser = await upsertUser(f.user);
    console.log(`  ✓ FAMILY_MEMBER  ${f.user.email} → ${f.linkedPatientEmail}`);
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

  const removed = await prisma.user.deleteMany({ where: { email: { endsWith: "@tracewell.demo" } } });
  if (removed.count > 0) console.log(`Removed ${removed.count} legacy @tracewell.demo account(s)`);

  await seedFacility(
    "🏥  St Peter's Hospital",
    HOSPITAL_STAFF, HOSPITAL_PATIENTS, HOSPITAL_FAMILY,
    ["sarah.jones@stpetershospital.com", "a.okonkwo@stpetershospital.com", "k.murphy@stpetershospital.com"],
    ["dr.chen@stpetershospital.com", "dr.malik@stpetershospital.com", "dr.sundaram@stpetershospital.com", "dr.lawson@stpetershospital.com"],
    "Nurse",
  );

  await seedFacility(
    "🌅  Sunrise Aged Care",
    AGED_CARE_STAFF, AGED_CARE_PATIENTS, AGED_CARE_FAMILY,
    ["mary.nguyen@sunriseagedcare.com.au", "t.bradley@sunriseagedcare.com.au", "c.wei@sunriseagedcare.com.au"],
    ["dr.patel@sunriseagedcare.com.au", "dr.obi@sunriseagedcare.com.au"],
    "Nurse",
  );

  console.log("\n✅  Seed complete.\n");
  console.log("── Demo credentials ──────────────────────────────────────────────────────");
  console.log("  🏥 St Peter's Hospital  (org: hospital)");
  console.log("    — AM nurses (7am–3pm) —");
  console.log("    Nurse:    sarah.jones@stpetershospital.com    / nurse123");
  console.log("    Nurse:    j.kowalski@stpetershospital.com     / nurse123");
  console.log("    Nurse:    e.davies@stpetershospital.com       / nurse123");
  console.log("    — PM nurses (3pm–11pm) —");
  console.log("    Nurse:    a.okonkwo@stpetershospital.com      / nurse123");
  console.log("    Nurse:    r.torres@stpetershospital.com       / nurse123");
  console.log("    Nurse:    d.park@stpetershospital.com         / nurse123");
  console.log("    — Night nurses (11pm–7am) —");
  console.log("    Nurse:    k.murphy@stpetershospital.com       / nurse123");
  console.log("    Nurse:    n.walsh@stpetershospital.com        / nurse123");
  console.log("    — Doctors —");
  console.log("    Doctor:   dr.chen@stpetershospital.com        / doctor123");
  console.log("    Doctor:   dr.malik@stpetershospital.com       / doctor123");
  console.log("    Doctor:   dr.sundaram@stpetershospital.com    / doctor123");
  console.log("    Doctor:   dr.lawson@stpetershospital.com      / doctor123");
  console.log("    Manager:  p.walsh@stpetershospital.com        / manager123");
  console.log("    Patient:  amara.chen@stpetershospital.com     / patient123");
  console.log("    Patient:  david.osei@stpetershospital.com     / patient123");
  console.log("    Patient:  priya.singh@stpetershospital.com    / patient123");
  console.log("    Patient:  t.burke@stpetershospital.com        / patient123");
  console.log("    Patient:  h.park@stpetershospital.com         / patient123");
  console.log("    Family:   lena.chen@gmail.com                 / family123");
  console.log("    Family:   kofi.osei@gmail.com                 / family123");
  console.log("    Family:   ananya.singh@gmail.com              / family123");
  console.log("    Family:   claire.burke@gmail.com              / family123");
  console.log("");
  console.log("  🌅 Sunrise Aged Care  (org: agedcare)");
  console.log("    — AM nurses (7am–3pm) —");
  console.log("    Nurse:    mary.nguyen@sunriseagedcare.com.au  / nurse123");
  console.log("    Nurse:    f.brennan@sunriseagedcare.com.au    / nurse123");
  console.log("    — PM nurses (3pm–11pm) —");
  console.log("    Nurse:    t.bradley@sunriseagedcare.com.au    / nurse123");
  console.log("    Nurse:    p.sharma@sunriseagedcare.com.au     / nurse123");
  console.log("    — Night nurse —");
  console.log("    Nurse:    c.wei@sunriseagedcare.com.au        / nurse123");
  console.log("    — AM carers —");
  console.log("    Carer:    l.santos@sunriseagedcare.com.au     / carer123");
  console.log("    Carer:    j.kim@sunriseagedcare.com.au        / carer123");
  console.log("    — PM carers —");
  console.log("    Carer:    m.webb@sunriseagedcare.com.au       / carer123");
  console.log("    Carer:    r.delgado@sunriseagedcare.com.au    / carer123");
  console.log("    — Night carer —");
  console.log("    Carer:    a.hassan@sunriseagedcare.com.au     / carer123");
  console.log("    — Doctors —");
  console.log("    Doctor:   dr.patel@sunriseagedcare.com.au     / doctor123");
  console.log("    Doctor:   dr.obi@sunriseagedcare.com.au       / doctor123");
  console.log("    Manager:  j.wilson@sunriseagedcare.com.au     / manager123");
  console.log("    Resident: margaret.wu@sunriseagedcare.com.au  / patient123");
  console.log("    Resident: robert.nguyen@sunriseagedcare.com.au / patient123");
  console.log("    Resident: elsie.campbell@sunriseagedcare.com.au / patient123");
  console.log("    Resident: arthur.reid@sunriseagedcare.com.au  / patient123");
  console.log("    Resident: dorothy.mason@sunriseagedcare.com.au / patient123");
  console.log("    Family:   tom.wu@gmail.com                    / family123");
  console.log("    Family:   minh.nguyen@gmail.com               / family123");
  console.log("    Family:   grace.reid@gmail.com                / family123");
  console.log("    Family:   paul.mason@gmail.com                / family123");
  console.log("──────────────────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
