const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { neonConfig, Pool } = require("@neondatabase/serverless");
const ws = require("ws");
const XLSX = require("xlsx");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const filePath = path.resolve(__dirname, "../../Downloads/VehiclesData.xlsx");
  console.log(`Reading: ${filePath}`);

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`Found ${rows.length} vehicles`);

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const row of rows) {
    const vehicleId = String(row.vehicleName ?? "").trim();
    if (!vehicleId) continue;

    try {
      const rawStatus = String(row.status ?? "").trim().toLowerCase();
      const status = rawStatus === "inactive" ? "inactive" : "active";
      const year = row.year ? parseInt(String(row.year), 10) : null;

      const data = {
        vin:                     String(row.vin ?? "").trim() || null,
        licensePlate:            String(row.licensePlateNumber ?? "").trim() || null,
        make:                    String(row.make ?? "").trim() || null,
        model:                   String(row.model ?? "").trim() || null,
        subModel:                String(row.subModel ?? "").trim() || null,
        year:                    year && !isNaN(year) ? year : null,
        status,
        operationalStatus:       String(row.operationalStatus ?? "").trim() || null,
        serviceType:             String(row.serviceType ?? "").trim() || null,
        serviceTier:             String(row.serviceTier ?? "").trim() || null,
        ownershipType:           String(row.ownershipType ?? "").trim() || null,
        vehicleProvider:         String(row.vehicleProvider ?? "").trim() || null,
        vehicleRegistrationType: String(row.vehicleRegistrationType ?? "").trim() || null,
        ownershipStartDate:      parseDate(row.ownershipStartDate),
        ownershipEndDate:        parseDate(row.ownershipEndDate),
        registrationExpiryDate:  parseDate(row.registrationExpiryDate),
        registeredState:         String(row.registeredState ?? "").trim() || null,
        stationCode:             String(row.stationCode ?? "").trim() || null,
        notes:                   null,
      };

      const existing = await prisma.vehicle.findUnique({ where: { vehicleId } });
      if (existing) {
        await prisma.vehicle.update({ where: { vehicleId }, data });
        updated++;
      } else {
        await prisma.vehicle.create({ data: { vehicleId, ...data } });
        created++;
      }
    } catch (e) {
      errors.push(`${vehicleId}: ${e}`);
    }
  }

  console.log(`\nDone! Created: ${created} | Updated: ${updated}`);
  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.error(" -", e));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
