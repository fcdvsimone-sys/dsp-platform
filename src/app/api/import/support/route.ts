import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type Row = {
  "Contact Date": string;
  "Transporter ID": string;
  "DSP CODE": string;
  "DSP NAME": string;
  "Month": string;
  "Contact Reason": string;
  "Driver Intent": string;
  "Total Contact Time (secs)": string;
  "DNR Ind.": string;
  "Successful Delivery Ind.": string;
  "# Successful Packages": string;
  "# Failed Packages": string;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const { data, errors } = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });

  if (errors.length > 0) {
    return NextResponse.json({ error: "CSV parse error", details: errors[0].message }, { status: 400 });
  }

  // Build a lookup map of transporterId → driverId
  const transIds = [...new Set(data.map((r) => r["Transporter ID"]).filter(Boolean))];
  const drivers = await prisma.driver.findMany({
    where: { employeeId: { in: transIds } },
    select: { id: true, employeeId: true },
  });
  const driverMap = new Map(drivers.map((d) => [d.employeeId, d.id]));

  let imported = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const row of data) {
    const transporterId = row["Transporter ID"]?.trim();
    const contactDateRaw = row["Contact Date"]?.trim();
    if (!transporterId || !contactDateRaw) { skipped++; continue; }

    const contactDate = new Date(contactDateRaw);
    if (isNaN(contactDate.getTime())) { skipped++; continue; }

    const driverId = driverMap.get(transporterId) ?? null;
    if (!driverId) unmatched++;

    const totalSecs = parseInt(row["Total Contact Time (secs)"] ?? "0") || 0;
    const successPkgs = parseInt(row["# Successful Packages"] ?? "0") || 0;
    const failedPkgs = parseInt(row["# Failed Packages"] ?? "0") || 0;
    const dnr = row["DNR Ind."]?.trim().toUpperCase() === "Y";

    try {
      await prisma.supportTicket.upsert({
        where: { transporterId_contactDate: { transporterId, contactDate } },
        update: {
          driverId,
          month: row["Month"]?.trim() || "",
          contactReason: row["Contact Reason"]?.trim() || null,
          driverIntent: row["Driver Intent"]?.trim() || null,
          totalContactTimeSecs: totalSecs,
          dnrInd: dnr,
          successfulDeliveryInd: row["Successful Delivery Ind."]?.trim() || null,
          successfulPackages: successPkgs,
          failedPackages: failedPkgs,
        },
        create: {
          transporterId,
          driverId,
          contactDate,
          month: row["Month"]?.trim() || "",
          contactReason: row["Contact Reason"]?.trim() || null,
          driverIntent: row["Driver Intent"]?.trim() || null,
          totalContactTimeSecs: totalSecs,
          dnrInd: dnr,
          successfulDeliveryInd: row["Successful Delivery Ind."]?.trim() || null,
          successfulPackages: successPkgs,
          failedPackages: failedPkgs,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, unmatched });
}
