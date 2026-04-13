import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const vehicleSchema = z.object({
  vehicleId: z.string().min(1),
  vin: z.string().optional().nullable(),
  licensePlate: z.string().optional().nullable(),
  make: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  subModel: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  operationalStatus: z.string().optional().nullable(),
  serviceType: z.string().optional().nullable(),
  serviceTier: z.string().optional().nullable(),
  ownershipType: z.string().optional().nullable(),
  vehicleProvider: z.string().optional().nullable(),
  vehicleRegistrationType: z.string().optional().nullable(),
  ownershipStartDate: z.string().optional().nullable(),
  ownershipEndDate: z.string().optional().nullable(),
  registrationExpiryDate: z.string().optional().nullable(),
  registeredState: z.string().optional().nullable(),
  stationCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { vehicleId: "asc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ownershipStartDate, ownershipEndDate, registrationExpiryDate, ...rest } = parsed.data;

  const vehicle = await prisma.vehicle.create({
    data: {
      ...rest,
      ownershipStartDate: ownershipStartDate ? new Date(ownershipStartDate) : null,
      ownershipEndDate: ownershipEndDate ? new Date(ownershipEndDate) : null,
      registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : null,
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
