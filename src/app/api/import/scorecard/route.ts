import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

// Cortex scorecard CSV export columns (flexible mapping)
type CortexScorecardRow = Record<string, string>;

function col(row: CortexScorecardRow, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.toLowerCase()
    );
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return "";
}

function parseFloat2(val: string): number | null {
  const n = parseFloat(val.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseInt2(val: string): number | null {
  const n = parseInt(val.replace(/[^0-9-]/g, ""), 10);
  return isNaN(n) ? null : n;
}

function parseWeek(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const { data } = Papa.parse<CortexScorecardRow>(text, { header: true, skipEmptyLines: true });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      const transporterId =
        col(row, "Transporter ID", "TransporterID", "Employee ID", "EmployeeID") ||
        col(row, "Associate ID", "AssociateID");

      if (!transporterId) continue;

      const weekStr = col(row, "Week", "Week Of", "Week of", "WeekOf", "Date", "Period");
      const weekOf = parseWeek(weekStr);
      if (!weekOf) {
        errors.push(`Row ${transporterId}: invalid or missing week date "${weekStr}"`);
        continue;
      }

      const driver = await prisma.driver.findUnique({ where: { employeeId: transporterId } });
      if (!driver) {
        errors.push(`Row ${transporterId}: driver not found — import roster first`);
        continue;
      }

      const overallScore =
        col(row, "Overall Score", "Overall", "Score", "Tier", "Performance Tier") || null;
      const fico = parseFloat2(col(row, "FICO", "FICO Score", "Fico"));
      const seatbelt = parseFloat2(col(row, "Seatbelt", "Seatbelt %", "Seatbelt Rate", "SeatBelt"));
      const distraction = parseFloat2(col(row, "Distraction", "Distraction %", "Distraction Rate", "Phone Distraction"));
      const speeding = parseFloat2(col(row, "Speeding", "Speeding %", "Speeding Rate", "Speed"));
      const deliveryCompletion = parseFloat2(
        col(row, "Delivery Completion", "Delivery Completion Rate", "DCR", "Completion Rate", "DeliveryCompletion")
      );
      const photoOnDelivery = parseFloat2(
        col(row, "Photo on Delivery", "POD", "Photo On Delivery", "PhotoOnDelivery", "Photo Compliance")
      );
      const dnr = parseInt2(col(row, "DNR", "Do Not Restock", "DoNotRestock"));
      const podOpportunities = parseInt2(col(row, "POD Opportunities", "PODOpportunities", "Pod Opportunities"));

      const existing = await prisma.scorecard.findUnique({
        where: { driverId_weekOf: { driverId: driver.id, weekOf } },
      });

      const scoreData = {
        overallScore,
        fico,
        seatbelt,
        distraction,
        speeding,
        deliveryCompletion,
        photoOnDelivery,
        dnr,
        podOpportunities,
      };

      if (existing) {
        await prisma.scorecard.update({
          where: { id: existing.id },
          data: scoreData,
        });
        updated++;
      } else {
        await prisma.scorecard.create({
          data: { driverId: driver.id, weekOf, ...scoreData },
        });
        created++;
      }
    } catch (e) {
      errors.push(`Row error: ${e}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
