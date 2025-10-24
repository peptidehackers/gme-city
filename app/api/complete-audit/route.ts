import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { generatePremiumEmailHTML } from "./email-template";

// POST /api/complete-audit
// Runs all 4 audits and sends comprehensive email report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      businessName,
      website,
      street,
      city,
      zip,
      category,
      consent
    } = body;

    // Extract state from city (if provided as "City, State" or use default "CA")
    const state = city.includes(',') ? city.split(',')[1].trim() : 'CA';

    // Validation
    if (!email || !phone || !businessName || !website || !city || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { error: "Consent required to process audit" },
        { status: 400 }
      );
    }

    // 1. Save lead to database
    let leadId: string | null = null;
    try {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert({
          email,
          phone,
          business_name: businessName,
          website,
          street,
          city,
          zip,
          category,
          status: 'new',
          source: 'complete_audit',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (leadError) {
        console.error("Lead save error:", leadError);
      } else {
        leadId = leadData.id;
      }
    } catch (e) {
      console.error("Lead save failed:", e);
    }

    // 2. Run all 4 audits in parallel
    console.log("Starting audits for:", businessName);
    const [seoResult, citationResult, keywordResult] = await Promise.allSettled([
      // SEO Snapshot
      fetch(`${req.nextUrl.origin}/api/seo-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          website,
          address: street,
          city,
          zip,
          phone,
          category,
          email
        })
      }).then(r => r.json()).catch(err => {
        console.error("SEO Score API error:", err);
        return null;
      }),

      // Citation Coverage (GBP Check)
      fetch(`${req.nextUrl.origin}/api/citation-coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          address: street,
          city: city,
          state: state,
          zip: zip,
          phone: phone,
          category: category
        })
      }).then(r => r.json()).catch(err => {
        console.error("Citation Coverage API error:", err);
        return null;
      }),

      // Keyword Opportunities
      fetch(`${req.nextUrl.origin}/api/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website,
          category,
          city
        })
      }).then(r => r.json()).catch(err => {
        console.error("Keywords API error:", err);
        return null;
      })
    ]);

    // Extract results
    const seoData = seoResult.status === 'fulfilled' ? seoResult.value : null;
    const citationData = citationResult.status === 'fulfilled' ? citationResult.value : null;
    const keywordData = keywordResult.status === 'fulfilled' ? keywordResult.value : null;

    console.log("Audit results:", {
      seo: seoData ? "✓" : "✗",
      citation: citationData ? "✓" : "✗",
      keywords: keywordData ? "✓" : "✗"
    });

    // 3. Generate comprehensive HTML report
    const reportHTML = generatePremiumEmailHTML({
      businessName,
      seoData,
      citationData,
      keywordData
    });

    // 4. Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'GMB City Reports <reports@gmb.city>',
        to: email,
        subject: `${businessName}: Your Local SEO Audit Results (Action Required)`,
        html: reportHTML,
      });

      console.log(`✅ Complete audit report sent to: ${email}`);
    } else {
      console.log(`⚠️ RESEND_API_KEY not configured - Report would be sent to: ${email}`);
    }

    // 5. Save complete audit record
    if (leadId) {
      try {
        await supabase.from('complete_audits').insert({
          lead_id: leadId,
          seo_local_score: seoData?.local?.score || 0,
          seo_onsite_score: seoData?.onsite?.score || 0,
          citation_coverage: citationData?.coverage || 0,
          keyword_count: keywordData?.keywords?.length || 0,
          report_sent: true,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error("Audit record save failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Complete audit sent successfully",
      email,
      // In dev mode, return preview
      ...(process.env.NODE_ENV === 'development' && { previewHTML: reportHTML })
    });

  } catch (error: any) {
    console.error("Complete audit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate complete audit" },
      { status: 500 }
    );
  }
}

