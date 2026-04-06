import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch coaching + driver phone
  const coaching = await prisma.coaching.findUnique({
    where: { id },
    include: {
      driver: {
        select: { firstName: true, lastName: true, phone: true, workPhone: true },
      },
    },
  });

  if (!coaching) return NextResponse.json({ error: "Coaching not found" }, { status: 404 });

  const phone = coaching.driver.phone || coaching.driver.workPhone;
  if (!phone) {
    return NextResponse.json(
      { error: "No phone number on file for this driver. Add one on their profile first." },
      { status: 400 }
    );
  }

  const typeLabels: Record<string, string> = {
    verbal: "Verbal Warning",
    written: "Written Warning",
    final: "Final Written Warning",
    termination: "Notice of Termination",
  };

  const typeLabel = typeLabels[coaching.type] ?? coaching.type;
  const firstName = coaching.driver.firstName;

  // Keep SMS concise — include type, brief description excerpt, and action plan summary
  const descExcerpt = coaching.description.slice(0, 200).trimEnd() + (coaching.description.length > 200 ? "..." : "");
  const actionSummary = coaching.actionPlan
    ? "\n\nAction Required:\n" + coaching.actionPlan.slice(0, 300).trimEnd() + (coaching.actionPlan.length > 300 ? "..." : "")
    : "";

  const body =
    `Hi ${firstName}, this is a notice from your DSP manager.\n\n` +
    `COACHING: ${typeLabel}\n\n` +
    `${descExcerpt}` +
    `${actionSummary}\n\n` +
    `Please see your manager to review and sign this document.`;

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return NextResponse.json({ ok: true, sentTo: phone });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Twilio error:", message);
    return NextResponse.json({ error: `SMS failed: ${message}` }, { status: 500 });
  }
}
