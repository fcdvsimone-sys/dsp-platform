import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { driverId, scorecardId } = await req.json();
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  // Fetch driver info
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { firstName: true, lastName: true, employeeId: true, hireDate: true },
  });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  // Fetch the scorecard to generate coaching for (specific or latest)
  const scorecard = await prisma.scorecard.findFirst({
    where: scorecardId ? { id: scorecardId, driverId } : { driverId },
    orderBy: { weekOf: "desc" },
  });
  if (!scorecard) return NextResponse.json({ error: "No scorecard found for this driver" }, { status: 404 });

  // Fetch prior coaching count (to determine escalation level)
  const priorCoachingCount = await prisma.coaching.count({
    where: { driverId, category: "scorecard" },
  });

  // Fetch last 4 weeks of scorecards for trend context
  const recentScorecards = await prisma.scorecard.findMany({
    where: { driverId },
    orderBy: { weekOf: "desc" },
    take: 4,
    select: {
      weekOf: true,
      overallStanding: true,
      overallScore: true,
      dcr: true,
      pod: true,
      speedingRate: true,
      seatbeltRate: true,
      distractionRate: true,
      signalViolationRate: true,
      followingDistanceRate: true,
      cdfDpmo: true,
    },
  });

  // Determine coaching type based on standing + history
  const standing = scorecard.overallStanding ?? "Unknown";
  let suggestedType = "verbal";
  if (standing === "Below Standard") {
    suggestedType = priorCoachingCount >= 2 ? "final" : priorCoachingCount >= 1 ? "written" : "verbal";
  } else if (standing === "Bronze") {
    suggestedType = priorCoachingCount >= 1 ? "written" : "verbal";
  } else {
    suggestedType = "verbal";
  }

  // Build metric flags for the prompt
  const flags: string[] = [];
  if (scorecard.dcr !== null && scorecard.dcr < 98) flags.push(`DCR at ${scorecard.dcr}% (target ≥ 98%)`);
  if (scorecard.pod !== null && scorecard.pod < 95) flags.push(`POD at ${scorecard.pod}% (target ≥ 95%)`);
  if (scorecard.speedingRate !== null && scorecard.speedingRate > 0.1) flags.push(`Speeding rate ${scorecard.speedingRate.toFixed(2)} per trip (target ≤ 0.1)`);
  if (scorecard.seatbeltRate !== null && scorecard.seatbeltRate > 0.05) flags.push(`Seatbelt-off rate ${scorecard.seatbeltRate.toFixed(2)} per trip (target ≤ 0.05)`);
  if (scorecard.distractionRate !== null && scorecard.distractionRate > 0.1) flags.push(`Distraction rate ${scorecard.distractionRate.toFixed(2)} per trip (target ≤ 0.1)`);
  if (scorecard.signalViolationRate !== null && scorecard.signalViolationRate > 0.05) flags.push(`Signal violation rate ${scorecard.signalViolationRate.toFixed(2)} per trip (target ≤ 0.05)`);
  if (scorecard.followingDistanceRate !== null && scorecard.followingDistanceRate > 0.1) flags.push(`Following distance rate ${scorecard.followingDistanceRate.toFixed(2)} per trip (target ≤ 0.1)`);
  if (scorecard.cdfDpmo !== null && scorecard.cdfDpmo > 1000) flags.push(`CDF DPMO at ${scorecard.cdfDpmo.toLocaleString()} (target < 1000)`);

  const weekStr = scorecard.weekOf.toISOString().split("T")[0];
  const trendSummary = recentScorecards
    .map((s) => `Week of ${s.weekOf.toISOString().split("T")[0]}: ${s.overallStanding ?? "Unknown"} (Score: ${s.overallScore ?? "N/A"})`)
    .join("\n");

  const prompt = `You are an Amazon Delivery Service Partner (DSP) operations manager writing a professional coaching session note for a driver.

Driver: ${driver.firstName} ${driver.lastName} (${driver.employeeId})
Week of Performance: ${weekStr}
Overall Standing: ${standing}
Overall Score: ${scorecard.overallScore ?? "N/A"}
Prior Scorecard Coaching Sessions: ${priorCoachingCount}
Suggested Coaching Type: ${suggestedType}

Metrics that need attention:
${flags.length > 0 ? flags.map((f) => `- ${f}`).join("\n") : "- General standing below expectations"}

Recent performance trend (last 4 weeks):
${trendSummary}

Write a professional coaching note with two clearly labeled sections:

1. **Description**: 2-3 paragraphs. Describe the performance issue factually and professionally. Reference the specific week, the standing tier, and mention the problematic metrics. Note whether performance is declining, fluctuating, or has been consistently below standard. Keep the tone constructive but clear about expectations.

2. **Action Plan**: A numbered list of 4-6 specific, actionable steps the driver must take to improve. Include specific targets, timeline (e.g., "by next week's scorecard"), and any resources or tools available. End with a statement about the consequences of continued non-compliance.

Format the response as JSON with keys "description" and "actionPlan". Do not include markdown code fences.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let parsed: { description: string; actionPlan: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If Claude didn't return pure JSON, extract from fences or use raw
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { description: raw, actionPlan: "" };
    }

    return NextResponse.json({
      description: parsed.description ?? "",
      actionPlan: parsed.actionPlan ?? "",
      suggestedType,
      standing,
      weekOf: weekStr,
    });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Failed to generate coaching note" }, { status: 500 });
  }
}
