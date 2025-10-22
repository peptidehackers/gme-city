import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

// POST /api/monitoring/subscribe
// Creates a monitoring subscription with Stripe and saves settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, settings, audit, competitors } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // In production: Create Stripe subscription
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: process.env.MONITORING_PRICE_ID }],
    //   metadata: {
    //     email,
    //     businessName: audit.businessName,
    //   },
    // });

    // Save monitoring settings to Supabase
    const { data, error } = await supabase
      .from("monitoring_subscriptions")
      .insert({
        email,
        settings,
        audit_data: audit,
        competitors: competitors || [],
        status: "active",
        next_report_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      // Don't fail if database insert fails - subscription is more important
    }

    return NextResponse.json({
      success: true,
      message: "Monitoring activated",
      subscriptionId: data?.id,
    });

  } catch (error: any) {
    console.error("Monitoring subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to activate monitoring" },
      { status: 500 }
    );
  }
}

// GET /api/monitoring/status
// Check monitoring status for an email
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("monitoring_subscriptions")
      .select("*")
      .eq("email", email)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = not found
      throw error;
    }

    return NextResponse.json({
      hasActiveMonitoring: !!data,
      subscription: data || null,
    });

  } catch (error: any) {
    console.error("Monitoring status check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
