import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CortexRow = {
  "Name and ID": string;
  TransporterID: string;
  Position: string;
  Qualifications: string;
  "ID expiration": string;
  "Personal Phone Number": string;
  "Work Phone Number": string;
  Email: string;
  Status: string;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const { data } = Papa.parse<CortexRow>(text, { header: true, skipEmptyLines: true });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      const transporterId = row.TransporterID?.trim();
      if (!transporterId) continue;

      const fullName = row["Name and ID"]?.trim() ?? "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ") || "—";

      const status = row.Status?.trim().toLowerCase() === "active" ? "active" : "inactive";
      const idExpiration = row["ID expiration"]?.trim()
        ? new Date(row["ID expiration"].trim())
        : null;

      const existing = await prisma.driver.findUnique({ where: { employeeId: transporterId } });

      if (existing) {
        await prisma.driver.update({
          where: { employeeId: transporterId },
          data: {
            firstName,
            lastName,
            phone: row["Personal Phone Number"]?.trim() || null,
            workPhone: row["Work Phone Number"]?.trim() || null,
            email: row.Email?.trim() || null,
            qualifications: row.Qualifications?.trim() || null,
            idExpiration,
            status,
          },
        });
        updated++;
      } else {
        await prisma.driver.create({
          data: {
            employeeId: transporterId,
            firstName,
            lastName,
            phone: row["Personal Phone Number"]?.trim() || null,
            workPhone: row["Work Phone Number"]?.trim() || null,
            email: row.Email?.trim() || null,
            qualifications: row.Qualifications?.trim() || null,
            idExpiration,
            status,
          },
        });
        created++;
      }
    } catch (e) {
      errors.push(`Row ${row.TransporterID}: ${e}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
