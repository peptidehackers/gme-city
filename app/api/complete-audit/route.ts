import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

// POST /api/complete-audit
// Runs all 4 audits and sends comprehensive email report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
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

      // Citation Coverage
      fetch(`${req.nextUrl.origin}/api/citation-coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          address: `${street}, ${city}, ${zip}`,
          phone,
          website
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
    const reportHTML = generateCompleteReport({
      businessName,
      email,
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
        subject: `Your Complete Local SEO Audit - ${businessName}`,
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

// Generate comprehensive HTML report matching site branding
function generateCompleteReport(data: {
  businessName: string;
  email: string;
  seoData: any;
  citationData: any;
  keywordData: any;
}) {
  const { businessName, seoData, citationData, keywordData } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Local SEO Audit - ${businessName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #ffffff;">

  <!-- Email Container -->
  <div style="max-width: 650px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 48px 32px; border-radius: 20px; margin-bottom: 32px; text-align: center;">
      <h1 style="color: white; margin: 0 0 12px 0; font-size: 36px; font-weight: 800; line-height: 1.2;">Complete Local SEO Audit</h1>
      <p style="color: rgba(255,255,255,0.95); margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">${businessName}</p>
      <div style="background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 12px; display: inline-block; backdrop-filter: blur(10px);">
        <span style="color: white; font-size: 15px; font-weight: 600;">✓ 3 Comprehensive Audits • $500 Value</span>
      </div>
    </div>

    <!-- Intro Text -->
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6;">
        Below are the complete results from your local SEO audit. Each section shows exactly where you stand and what actions will move the needle for your business.
      </p>
    </div>

    <!-- 1. SEO Snapshot -->
    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="font-size: 28px;">🔍</span>
        </div>
        <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">SEO Snapshot</h2>
      </div>

      <!-- Scores Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 24px; border-radius: 16px; text-align: center;">
          <div style="font-size: 14px; color: rgba(255,255,255,0.6); text-transform: uppercase; font-weight: 600; margin-bottom: 12px; letter-spacing: 0.5px;">Local SEO</div>
          <div style="font-size: 56px; font-weight: 900; color: #10b981; line-height: 1;">${seoData?.local?.score || 0}</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 8px;">out of 100</div>
        </div>
        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 24px; border-radius: 16px; text-align: center;">
          <div style="font-size: 14px; color: rgba(255,255,255,0.6); text-transform: uppercase; font-weight: 600; margin-bottom: 12px; letter-spacing: 0.5px;">On-Site SEO</div>
          <div style="font-size: 56px; font-weight: 900; color: #10b981; line-height: 1;">${seoData?.onsite?.score || 0}</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 8px;">out of 100</div>
        </div>
      </div>

      ${seoData?.local?.insights && seoData.local.insights.length > 0 ? `
        <!-- Key Issues -->
        <div style="background: rgba(239,68,68,0.1); border-left: 4px solid #ef4444; border-radius: 12px; padding: 20px; margin-top: 20px;">
          <div style="font-weight: 700; color: #ef4444; margin-bottom: 12px; font-size: 15px;">🚨 Critical Issues Found:</div>
          ${seoData.local.insights.slice(0, 3).map((insight: string) => `
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6; margin: 8px 0; padding-left: 12px;">• ${insight}</div>
          `).join('')}
        </div>
      ` : `
        <div style="background: rgba(16,185,129,0.1); border-left: 4px solid #10b981; border-radius: 12px; padding: 20px;">
          <div style="color: #10b981; font-size: 15px;">✓ No major SEO issues detected</div>
        </div>
      `}
    </div>

    <!-- 2. Citation Coverage -->
    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="font-size: 28px;">📍</span>
        </div>
        <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">Citation Coverage</h2>
      </div>

      <div style="text-align: center; padding: 32px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); border-radius: 16px; margin-bottom: 20px;">
        <div style="font-size: 72px; font-weight: 900; color: #8b5cf6; line-height: 1;">
          ${citationData?.coverage || 0}<span style="font-size: 36px; color: rgba(255,255,255,0.4);">%</span>
        </div>
        <div style="color: rgba(255,255,255,0.6); margin-top: 12px; font-size: 16px;">of major directories</div>
      </div>

      ${citationData?.found && citationData.found.length > 0 ? `
        <div style="background: rgba(16,185,129,0.1); border-left: 4px solid #10b981; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 12px; font-size: 15px;">✓ Found On:</div>
          ${citationData.found.slice(0, 5).map((dir: string) => `
            <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 6px 0; padding-left: 12px;">• ${dir}</div>
          `).join('')}
        </div>
      ` : ''}

      ${citationData?.missing && citationData.missing.length > 0 ? `
        <div style="background: rgba(251,191,36,0.1); border-left: 4px solid #fbbf24; border-radius: 12px; padding: 20px;">
          <div style="font-weight: 700; color: #fbbf24; margin-bottom: 12px; font-size: 15px;">⚠ Missing From:</div>
          ${citationData.missing.slice(0, 5).map((dir: string) => `
            <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 6px 0; padding-left: 12px;">• ${dir}</div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <!-- 3. Keyword Opportunities -->
    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; margin-bottom: 32px;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="font-size: 28px;">🎯</span>
        </div>
        <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">Keyword Opportunities</h2>
      </div>

      <div style="text-align: center; padding: 32px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; margin-bottom: 20px;">
        <div style="font-size: 72px; font-weight: 900; color: #f59e0b; line-height: 1;">${keywordData?.keywords?.length || 0}</div>
        <div style="color: rgba(255,255,255,0.6); margin-top: 12px; font-size: 16px;">high-value keywords found</div>
      </div>

      ${keywordData?.keywords && keywordData.keywords.length > 0 ? `
        <div style="margin-top: 24px;">
          <div style="font-weight: 700; color: #ffffff; margin-bottom: 16px; font-size: 16px;">Top Opportunities:</div>
          ${keywordData.keywords.slice(0, 5).map((kw: any) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.15); border-radius: 12px; margin-bottom: 10px;">
              <span style="color: #ffffff; font-weight: 600; font-size: 15px;">${kw.keyword}</span>
              <span style="color: #f59e0b; font-size: 14px; font-weight: 600; white-space: nowrap; margin-left: 16px;">${kw.volume?.toLocaleString() || 0} searches/mo</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="background: rgba(239,68,68,0.1); border-left: 4px solid #ef4444; border-radius: 12px; padding: 20px;">
          <div style="color: rgba(255,255,255,0.8); font-size: 14px;">No keyword data available. This may be due to API limitations or the website being new.</div>
        </div>
      `}
    </div>

    <!-- CTA Section -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 48px 32px; border-radius: 20px; text-align: center; margin-bottom: 32px;">
      <h2 style="color: white; margin: 0 0 16px 0; font-size: 32px; font-weight: 800;">Ready to Dominate Local Search?</h2>
      <p style="color: rgba(255,255,255,0.95); margin: 0 0 32px 0; font-size: 17px; line-height: 1.6;">We'll show you exactly how to fix these issues and get your business ranking #1 in Google Maps.</p>
      <a href="https://www.gmb.city" style="display: inline-block; background: white; color: #059669; padding: 18px 40px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 8px 20px rgba(0,0,0,0.2);">
        Book Your Strategy Call →
      </a>
      <div style="margin-top: 24px; color: rgba(255,255,255,0.85); font-size: 14px;">
        📞 (424) 283-2608 • 📧 info@gmbcity.com
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; padding: 24px 0;">
      <p style="margin: 0 0 8px 0;">This audit was generated by <strong style="color: rgba(255,255,255,0.7);">GMB City</strong></p>
      <p style="margin: 0 0 16px 0;">2029 Century Park E Suite 430, Los Angeles, CA 90067</p>
      <p style="margin: 0;">© ${new Date().getFullYear()} GMB City. All rights reserved.</p>
    </div>

  </div>

</body>
</html>
  `;
}
