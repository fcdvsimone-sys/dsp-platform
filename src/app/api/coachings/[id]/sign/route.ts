import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { signatureUrl } = body;

  if (!signatureUrl) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 });
  }

  const coaching = await prisma.coaching.update({
    where: { id },
    data: { signatureUrl, signedAt: new Date() },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, status: true },
      },
    },
  });

  return NextResponse.json(coaching);
}
