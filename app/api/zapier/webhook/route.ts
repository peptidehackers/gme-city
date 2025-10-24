import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

// POST /api/zapier/webhook
// Send audit results to Zapier webhook (connects to CRM, Slack, email, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      audit,
      score,
      breakdown,
      tasks,
      zapierWebhookUrl,
      metadata,
    } = body;

    if (!zapierWebhookUrl) {
      return NextResponse.json(
        { error: "Zapier webhook URL required" },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!zapierWebhookUrl.startsWith("https://hooks.zapier.com/")) {
      return NextResponse.json(
        { error: "Invalid Zapier webhook URL" },
        { status: 400 }
      );
    }

    // Prepare payload for Zapier
    const zapierPayload = {
      // Audit data
      businessName: audit.businessName,
      city: audit.city,
      category: audit.primaryCategory,

      // Score and status
      score,
      scoreCategory: score >= 80 ? "Great" : score >= 60 ? "Good" : "Needs Work",
      breakdown,

      // Metrics
      reviewCount: audit.reviewCount,
      rating: audit.rating,
      photosLast30d: audit.photosLast30d,
      postsPerMonth: audit.postsPerMonth,

      // Checklist items
      hasWebsite: audit.hasWebsite,
      hasHours: audit.hasHours,
      hasServices: audit.hasServices,
      hasBookingLink: audit.hasBookingLink,
      hasQA: audit.hasQA,
      napConsistent: audit.napConsistent,
      hasDuplicate: audit.hasDuplicateListing,

      // Action items
      taskCount: tasks.length,
      highPriorityTasks: tasks.filter((t: any) => t.impact === "High").length,
      tasks: tasks.map((t: any) => ({
        title: t.title,
        why: t.why,
        impact: t.impact,
      })),

      // Top 3 action items as individual fields (easier for CRMs)
      task1: tasks[0]?.title || null,
      task2: tasks[1]?.title || null,
      task3: tasks[2]?.title || null,

      // Metadata
      auditDate: new Date().toISOString(),
      auditUrl: metadata?.auditUrl || null,
      contactEmail: metadata?.email || null,
      contactPhone: metadata?.phone || null,

      // Custom fields
      ...metadata?.customFields,
    };

    // Send to Zapier webhook
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zapierPayload),
    });

    if (!zapierResponse.ok) {
      const errorText = await zapierResponse.text();
      throw new Error(`Zapier webhook failed: ${zapierResponse.status} - ${errorText}`);
    }

    const zapierResult = await zapierResponse.json().catch(() => ({}));

    // Log webhook delivery to Supabase
    try {
      await supabase.from("webhook_logs").insert({
        webhook_url: zapierWebhookUrl,
        payload: zapierPayload,
        response_status: zapierResponse.status,
        business_name: audit.businessName,
        score,
      });
    } catch (dbError) {
      console.error("Failed to log webhook:", dbError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Audit sent to Zapier",
      zapierResponse: zapierResult,
    });

  } catch (error: any) {
    console.error("Zapier webhook error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to send to Zapier",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

// GET /api/zapier/webhook/test
// Test webhook connection
export async function GET(req: NextRequest) {
  try {
    const webhookUrl = req.nextUrl.searchParams.get("url");

    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL required" }, { status: 400 });
    }

    // Send test payload
    const testPayload = {
      test: true,
      message: "GMB City webhook test",
      timestamp: new Date().toISOString(),
      businessName: "Test Business",
      score: 75,
      scoreCategory: "Good",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? "Webhook test successful" : "Webhook test failed",
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
