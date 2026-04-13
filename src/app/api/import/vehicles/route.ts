import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type VehicleRow = {
  // Amazon XLSX columns
  vin?: string;
  vehicleName?: string;
  licensePlateNumber?: string;
  make?: string;
  model?: string;
  subModel?: string;
  year?: string | number;
  status?: string;
  operationalStatus?: string;
  serviceType?: string;
  serviceTier?: string;
  type?: string;           // Amazon XLSX uses "type" for ownership description
  ownershipType?: string;
  vehicleProvider?: string;
  vehicleRegistrationType?: string;
  ownershipStartDate?: string;
  ownershipEndDate?: string;
  registrationExpiryDate?: string;
  registeredState?: string;
  stationCode?: string;
  // Generic CSV fallback columns
  VehicleID?: string;
  VIN?: string;
  LicensePlate?: string;
  Make?: string;
  Model?: string;
  Year?: string;
  Status?: string;
  OperationalStatus?: string;
  OwnershipType?: string;
  OwnershipStartDate?: string;
  OwnershipEndDate?: string;
  RegistrationExpiryDate?: string;
  RegisteredState?: string;
  ServiceType?: string;
  ServiceTier?: string;
  VehicleProvider?: string;
  StationCode?: string;
  Notes?: string;
};

function parseDate(val: string | undefined | null): Date | null {
  if (!val || String(val).trim() === "") return null;
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(val: string | undefined): string {
  const s = val?.trim().toLowerCase() ?? "";
  if (s === "inactive") return "inactive";
  return "active"; // ACTIVE or anything else → active
}

function mapRow(row: VehicleRow) {
  // Amazon XLSX format uses camelCase headers
  const isAmazonFormat = "vehicleName" in row || "operationalStatus" in row;

  if (isAmazonFormat) {
    return {
      vehicleId: String(row.vehicleName ?? "").trim(),
      vin: row.vin?.trim() || null,
      licensePlate: row.licensePlateNumber?.trim() || null,
      make: row.make?.trim() || null,
      model: row.model?.trim() || null,
      subModel: row.subModel?.trim() || null,
      year: row.year ? parseInt(String(row.year), 10) : null,
      status: normalizeStatus(row.status),
      operationalStatus: row.operationalStatus?.trim() || null,
      serviceType: row.serviceType?.trim() || null,
      serviceTier: row.serviceTier?.trim() || null,
      ownershipType: row.ownershipType?.trim() || null,
      vehicleProvider: row.vehicleProvider?.trim() || null,
      vehicleRegistrationType: row.vehicleRegistrationType?.trim() || null,
      ownershipStartDate: parseDate(row.ownershipStartDate),
      ownershipEndDate: parseDate(row.ownershipEndDate),
      registrationExpiryDate: parseDate(row.registrationExpiryDate),
      registeredState: row.registeredState?.trim() || null,
      stationCode: row.stationCode?.trim() || null,
      notes: null,
    };
  }

  // Generic CSV format
  return {
    vehicleId: String(row.VehicleID ?? "").trim(),
    vin: row.VIN?.trim() || null,
    licensePlate: row.LicensePlate?.trim() || null,
    make: row.Make?.trim() || null,
    model: row.Model?.trim() || null,
    subModel: null,
    year: row.Year ? parseInt(row.Year, 10) : null,
    status: normalizeStatus(row.Status),
    operationalStatus: row.OperationalStatus?.trim() || null,
    serviceType: row.ServiceType?.trim() || null,
    serviceTier: row.ServiceTier?.trim() || null,
    ownershipType: row.OwnershipType?.trim() || null,
    vehicleProvider: row.VehicleProvider?.trim() || null,
    vehicleRegistrationType: null,
    ownershipStartDate: parseDate(row.OwnershipStartDate),
    ownershipEndDate: parseDate(row.OwnershipEndDate),
    registrationExpiryDate: parseDate(row.RegistrationExpiryDate),
    registeredState: row.RegisteredState?.trim() || null,
    stationCode: row.StationCode?.trim() || null,
    notes: row.Notes?.trim() || null,
  };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let rows: VehicleRow[] = [];

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<VehicleRow>(sheet, { defval: "" });
  } else if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const { data } = Papa.parse<VehicleRow>(text, { header: true, skipEmptyLines: true });
    rows = data;
  } else {
    return NextResponse.json({ error: "Unsupported file type. Upload .xlsx or .csv" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const mapped = mapRow(row);
      if (!mapped.vehicleId) continue;

      // year NaN guard
      if (mapped.year !== null && isNaN(mapped.year)) mapped.year = null;

      const existing = await prisma.vehicle.findUnique({ where: { vehicleId: mapped.vehicleId } });

      if (existing) {
        await prisma.vehicle.update({ where: { vehicleId: mapped.vehicleId }, data: mapped });
        updated++;
      } else {
        await prisma.vehicle.create({ data: mapped });
        created++;
      }
    } catch (e) {
      const id = (row as VehicleRow).vehicleName ?? (row as VehicleRow).VehicleID ?? "unknown";
      errors.push(`Row ${id}: ${e}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
