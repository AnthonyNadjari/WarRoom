import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const COMPANIES = [
  // Banks
  { name: "Goldman Sachs", type: "Bank" as const, mainLocation: "New York", websiteDomain: "goldmansachs.com" },
  { name: "JPMorgan", type: "Bank" as const, mainLocation: "New York", websiteDomain: "jpmorgan.com" },
  { name: "Morgan Stanley", type: "Bank" as const, mainLocation: "New York", websiteDomain: "morganstanley.com" },
  { name: "Barclays", type: "Bank" as const, mainLocation: "London", websiteDomain: "barclays.com" },
  { name: "Deutsche Bank", type: "Bank" as const, mainLocation: "Frankfurt", websiteDomain: "db.com" },
  { name: "BNP Paribas", type: "Bank" as const, mainLocation: "Paris", websiteDomain: "bnpparibas.com" },
  { name: "UBS", type: "Bank" as const, mainLocation: "Zurich", websiteDomain: "ubs.com" },
  { name: "Societe Generale", type: "Bank" as const, mainLocation: "Paris", websiteDomain: "societegenerale.com" },
  { name: "Lazard", type: "Bank" as const, mainLocation: "New York", websiteDomain: "lazard.com" },
  { name: "Rothschild & Co", type: "Bank" as const, mainLocation: "Paris", websiteDomain: "rothschildandco.com" },

  // Hedge Funds
  { name: "Bridgewater Associates", type: "HedgeFund" as const, mainLocation: "Westport", websiteDomain: "bridgewater.com" },
  { name: "Man Group", type: "HedgeFund" as const, mainLocation: "London", websiteDomain: "man.com" },
  { name: "Citadel", type: "HedgeFund" as const, mainLocation: "Chicago", websiteDomain: "citadel.com" },
  { name: "Millennium Management", type: "HedgeFund" as const, mainLocation: "New York", websiteDomain: "mlp.com" },
  { name: "Two Sigma", type: "HedgeFund" as const, mainLocation: "New York", websiteDomain: "twosigma.com" },
  { name: "Capula Investment Management", type: "HedgeFund" as const, mainLocation: "London", websiteDomain: "capula.com" },
  { name: "Brevan Howard", type: "HedgeFund" as const, mainLocation: "London", websiteDomain: "brevanhoward.com" },
  { name: "Winton Group", type: "HedgeFund" as const, mainLocation: "London", websiteDomain: "winton.com" },

  // Asset Managers
  { name: "BlackRock", type: "AssetManager" as const, mainLocation: "New York", websiteDomain: "blackrock.com" },
  { name: "Amundi", type: "AssetManager" as const, mainLocation: "Paris", websiteDomain: "amundi.com" },
  { name: "Schroders", type: "AssetManager" as const, mainLocation: "London", websiteDomain: "schroders.com" },
  { name: "Fidelity Investments", type: "AssetManager" as const, mainLocation: "Boston", websiteDomain: "fidelity.com" },
  { name: "Vanguard", type: "AssetManager" as const, mainLocation: "Malvern", websiteDomain: "vanguard.com" },

  // Private Equity
  { name: "Blackstone", type: "PrivateEquity" as const, mainLocation: "New York", websiteDomain: "blackstone.com" },
  { name: "KKR", type: "PrivateEquity" as const, mainLocation: "New York", websiteDomain: "kkr.com" },
  { name: "Carlyle Group", type: "PrivateEquity" as const, mainLocation: "Washington DC", websiteDomain: "carlyle.com" },
  { name: "Ardian", type: "PrivateEquity" as const, mainLocation: "Paris", websiteDomain: "ardian.com" },
  { name: "CVC Capital Partners", type: "PrivateEquity" as const, mainLocation: "Luxembourg", websiteDomain: "cvc.com" },

  // Prop Shops
  { name: "Jane Street", type: "PropShop" as const, mainLocation: "New York", websiteDomain: "janestreet.com" },
  { name: "Optiver", type: "PropShop" as const, mainLocation: "Amsterdam", websiteDomain: "optiver.com" },
  { name: "Flow Traders", type: "PropShop" as const, mainLocation: "Amsterdam", websiteDomain: "flowtraders.com" },
  { name: "IMC Trading", type: "PropShop" as const, mainLocation: "Amsterdam", websiteDomain: "imc.com" },

  // Recruiters
  { name: "Selby Jennings", type: "Recruiter" as const, mainLocation: "London", websiteDomain: "selbyjennings.com" },
  { name: "Dartmouth Partners", type: "Recruiter" as const, mainLocation: "London", websiteDomain: "dartmouthpartners.com" },
  { name: "Options Group", type: "Recruiter" as const, mainLocation: "New York", websiteDomain: "optionsgroup.com" },
  { name: "Robert Half", type: "Recruiter" as const, mainLocation: "Menlo Park", websiteDomain: "roberthalf.com" },
];

async function main() {
  // 1. Ensure user exists
  const email = process.env.SEED_USER_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_USER_PASSWORD ?? "changeme";

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await hash(password, 10);
    user = await prisma.user.create({
      data: { email, passwordHash, name: "User" },
    });
    console.log("Created user:", email);
  } else {
    console.log("User already exists:", email);
  }

  // 2. Seed companies (skip duplicates by name)
  let created = 0;
  let skipped = 0;
  for (const c of COMPANIES) {
    const existing = await prisma.company.findFirst({
      where: { userId: user.id, name: c.name },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.company.create({
      data: {
        userId: user.id,
        name: c.name,
        type: c.type,
        mainLocation: c.mainLocation,
        websiteDomain: c.websiteDomain,
      },
    });
    created++;
  }
  console.log(`Companies: ${created} created, ${skipped} skipped (already exist)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
