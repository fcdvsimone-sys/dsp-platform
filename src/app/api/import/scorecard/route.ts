import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CortexRow = Record<string, string>;

// Parse "2026-W13" → Monday of that ISO week (UTC)
function parseISOWeek(weekStr: string): Date | null {
  const match = weekStr.trim().match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7; // Mon=1 … Sun=7
  const monday1 = new Date(Date.UTC(year, 0, 4 - dow + 1));
  return new Date(Date.UTC(
    monday1.getUTCFullYear(),
    monday1.getUTCMonth(),
    monday1.getUTCDate() + (week - 1) * 7
  ));
}

function f(row: CortexRow, key: string): string {
  return (row[key] ?? "").trim();
}

function pFloat(val: string): number | null {
  const cleaned = val.replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function pInt(val: string): number | null {
  const cleaned = val.replace(/[^0-9-]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

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
      const transporterId = f(row, "Transporter ID");
      if (!transporterId) continue;

      const weekStr = f(row, "Week");
      const weekOf = parseISOWeek(weekStr);
      if (!weekOf) {
        errors.push(`${transporterId}: invalid week "${weekStr}"`);
        continue;
      }

      const driver = await prisma.driver.findUnique({ where: { employeeId: transporterId } });
      if (!driver) {
        errors.push(`${transporterId} (${f(row, "Delivery Associate ")}): driver not found — import roster first`);
        continue;
      }

      const scoreData = {
        overallStanding:       f(row, "Overall Standing") || null,
        overallScore:          pFloat(f(row, "Overall Score")),

        // Safety rates (per trip)
        speedingRate:          pFloat(f(row, "Speeding Event Rate (per trip)")),
        seatbeltRate:          pFloat(f(row, "Seatbelt-Off Rate (per trip)")),
        distractionRate:       pFloat(f(row, "Distractions Rate (per trip)")),
        signalViolationRate:   pFloat(f(row, "Sign/ Signal Violations Rate (per trip)")),
        followingDistanceRate: pFloat(f(row, "Following Distance Rate (per trip)")),

        // Delivery metrics
        cdfDpmo:               pInt(f(row, "CDF DPMO")),
        ced:                   pFloat(f(row, "CED")),
        dcr:                   pFloat(f(row, "DCR")),   // "99.9%" → 99.9
        dsb:                   pFloat(f(row, "DSB")),
        pod:                   pFloat(f(row, "POD")),   // "100.0%" → 100.0
        psb:                   pFloat(f(row, "PSB")),
        packagesDelivered:     pInt(f(row, "Packages Delivered")),

        fico:                  pFloat(f(row, "FICO Score")),
      };

      const existing = await prisma.scorecard.findUnique({
        where: { driverId_weekOf: { driverId: driver.id, weekOf } },
      });

      if (existing) {
        await prisma.scorecard.update({ where: { id: existing.id }, data: scoreData });
        updated++;
      } else {
        await prisma.scorecard.create({ data: { driverId: driver.id, weekOf, ...scoreData } });
        created++;
      }
    } catch (e) {
      errors.push(`Row error: ${e}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
