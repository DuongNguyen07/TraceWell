import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_USERS: { name: string; email: string; password: string; role: Role }[] = [
  { name: "Alice Nurse",   email: "nurse@tracewell.demo",   password: "nurse123",   role: "NURSE"         },
  { name: "Dr. Ben Chen",  email: "doctor@tracewell.demo",  password: "doctor123",  role: "DOCTOR"        },
  { name: "Pat Patient",   email: "patient@tracewell.demo", password: "patient123", role: "PATIENT"       },
  { name: "Fiona Family",  email: "family@tracewell.demo",  password: "family123",  role: "FAMILY_MEMBER" },
  { name: "Max Manager",   email: "manager@tracewell.demo", password: "manager123", role: "MANAGER"       },
  { name: "Ada Admin",     email: "admin@tracewell.demo",   password: "admin123",   role: "ADMIN"         },
];

async function main() {
  for (const u of DEMO_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: hashed, role: u.role },
    });
    console.log(`✓ ${u.role}: ${u.email}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
