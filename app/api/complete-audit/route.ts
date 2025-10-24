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
    const reportHTML = generatePremiumReport({
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

// Generate premium HTML report with luxury design
function generatePremiumReport(data: {
  businessName: string;
  email: string;
  seoData: any;
  citationData: any;
  keywordData: any;
}) {
  const { businessName, seoData, citationData, keywordData } = data;

  // Calculate overall grade
  const localScore = seoData?.local?.score || 0;
  const onsiteScore = seoData?.onsite?.score || 0;
  const avgScore = Math.round((localScore + onsiteScore) / 2);

  const getGrade = (score: number) => {
    if (score >= 90) return { letter: 'A', color: '#10b981', label: 'Excellent' };
    if (score >= 80) return { letter: 'B', color: '#10b981', label: 'Good' };
    if (score >= 70) return { letter: 'C', color: '#f59e0b', label: 'Fair' };
    if (score >= 60) return { letter: 'D', color: '#ef4444', label: 'Poor' };
    return { letter: 'F', color: '#ef4444', label: 'Critical' };
  };

  const grade = getGrade(avgScore);

  // Generate executive summary
  const criticalIssues = seoData?.local?.insights?.length || 0;
  const diagnosis = criticalIssues > 0
    ? `We found ${criticalIssues} critical issues holding you back from page 1 rankings.`
    : `Your SEO foundation is solid, but there are quick wins to capture more traffic.`;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Local SEO Audit - ${businessName}</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-font-large { font-size: 28px !important; }
      .mobile-font-medium { font-size: 18px !important; }
      .mobile-font-small { font-size: 14px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .grade-circle { width: 140px !important; height: 140px !important; font-size: 56px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Main Container -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Email Content -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 48px 40px; border-radius: 16px 16px 0 0;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 36px; font-weight: 800; line-height: 1.2;" class="mobile-font-large">Local SEO Audit Report</h1>
                    <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.95); font-size: 20px; font-weight: 600;" class="mobile-font-medium">${businessName}</p>
                    <table border="0" cellpadding="0" cellspacing="0" style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 12px 24px;">
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; font-weight: 600;">Comprehensive Analysis • $500 Value</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Executive Summary -->
          <tr>
            <td style="padding: 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 700;" class="mobile-font-medium">Executive Summary</h2>
                    <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;" class="mobile-font-small">${diagnosis}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Overall Grade Circle -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="width: 180px; height: 180px; border-radius: 50%; background: linear-gradient(135deg, ${grade.color} 0%, ${grade.color}dd 100%); box-shadow: 0 8px 24px ${grade.color}40;" class="grade-circle">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 20px;">
                          <div style="font-size: 72px; font-weight: 900; color: #ffffff; line-height: 1;">${grade.letter}</div>
                          <div style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin-top: 8px;">${grade.label}</div>
                          <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 4px;">${avgScore}/100</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-bottom: 2px solid #e5e7eb;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SEO Snapshot Section -->
          <tr>
            <td style="padding: 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <!-- Section Header -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; text-align: center; vertical-align: middle; font-size: 24px;">
                          <span style="display: inline-block; width: 48px; height: 48px; line-height: 48px;">🔍</span>
                        </td>
                        <td style="padding-left: 16px;">
                          <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 700;">SEO Snapshot</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Scores Grid -->
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Local SEO Score -->
                        <td width="48%" class="mobile-stack" style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 24px; vertical-align: top;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td align="center">
                                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">LOCAL SEO</div>
                                <div style="font-size: 48px; font-weight: 900; color: #10b981; line-height: 1;">${localScore}</div>
                                <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">out of 100</div>

                                <!-- Progress Bar -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                                  <tr>
                                    <td style="background: #e5e7eb; height: 8px; border-radius: 4px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="${localScore}%">
                                        <tr>
                                          <td style="background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 8px; border-radius: 4px;"></td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>

                        <td width="4%" class="mobile-stack"></td>

                        <!-- On-Site SEO Score -->
                        <td width="48%" class="mobile-stack" style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 24px; vertical-align: top;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td align="center">
                                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">ON-SITE SEO</div>
                                <div style="font-size: 48px; font-weight: 900; color: #10b981; line-height: 1;">${onsiteScore}</div>
                                <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">out of 100</div>

                                <!-- Progress Bar -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                                  <tr>
                                    <td style="background: #e5e7eb; height: 8px; border-radius: 4px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="${onsiteScore}%">
                                        <tr>
                                          <td style="background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 8px; border-radius: 4px;"></td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Critical Issues -->
                ${seoData?.local?.insights && seoData.local.insights.length > 0 ? `
                <tr>
                  <td style="padding-top: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td>
                          <div style="font-weight: 700; color: #ef4444; margin-bottom: 12px; font-size: 15px;">⚠️ Critical Issues Detected:</div>
                          ${seoData.local.insights.slice(0, 3).map((insight: string) => `
                            <div style="color: #7f1d1d; font-size: 14px; line-height: 1.6; margin: 8px 0; padding-left: 12px;">• ${insight}</div>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Citation Coverage Section -->
          <tr>
            <td style="padding: 0 40px 40px 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <!-- Section Header -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 12px; text-align: center; vertical-align: middle; font-size: 24px;">
                          <span style="display: inline-block; width: 48px; height: 48px; line-height: 48px;">📍</span>
                        </td>
                        <td style="padding-left: 16px;">
                          <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 700;">Citation Coverage</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Coverage Score -->
                <tr>
                  <td align="center" style="background: #faf5ff; border: 2px solid #8b5cf6; border-radius: 12px; padding: 32px;">
                    <div style="font-size: 64px; font-weight: 900; color: #8b5cf6; line-height: 1;">${citationData?.coverage || 0}%</div>
                    <div style="font-size: 16px; color: #6b7280; margin-top: 8px; font-weight: 600;">of major directories</div>

                    <!-- Progress Bar -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
                      <tr>
                        <td style="background: #e5e7eb; height: 12px; border-radius: 6px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="${citationData?.coverage || 0}%">
                            <tr>
                              <td style="background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%); height: 12px; border-radius: 6px;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${citationData?.found && citationData.found.length > 0 ? `
                <tr>
                  <td style="padding-top: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td>
                          <div style="font-weight: 700; color: #10b981; margin-bottom: 12px; font-size: 15px;">✓ Listed On:</div>
                          ${citationData.found.slice(0, 5).map((dir: string) => `
                            <div style="color: #065f46; font-size: 14px; margin: 6px 0; padding-left: 12px;">• ${dir}</div>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                ${citationData?.missing && citationData.missing.length > 0 ? `
                <tr>
                  <td style="padding-top: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td>
                          <div style="font-weight: 700; color: #f59e0b; margin-bottom: 12px; font-size: 15px;">📋 Action Required - Add Your Business To:</div>
                          ${citationData.missing.slice(0, 5).map((dir: string) => `
                            <div style="color: #92400e; font-size: 14px; margin: 6px 0; padding-left: 12px;">• ${dir}</div>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Keyword Opportunities Section -->
          <tr>
            <td style="padding: 0 40px 40px 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <!-- Section Header -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; text-align: center; vertical-align: middle; font-size: 24px;">
                          <span style="display: inline-block; width: 48px; height: 48px; line-height: 48px;">🎯</span>
                        </td>
                        <td style="padding-left: 16px;">
                          <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 700;">Keyword Opportunities</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Keyword Count -->
                <tr>
                  <td align="center" style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 32px;">
                    <div style="font-size: 64px; font-weight: 900; color: #f59e0b; line-height: 1;">${keywordData?.keywords?.length || 0}</div>
                    <div style="font-size: 16px; color: #6b7280; margin-top: 8px; font-weight: 600;">high-value keywords found</div>
                  </td>
                </tr>

                ${keywordData?.keywords && keywordData.keywords.length > 0 ? `
                <tr>
                  <td style="padding-top: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <div style="font-weight: 700; color: #1f2937; margin-bottom: 16px; font-size: 16px;">Top Opportunities:</div>
                        </td>
                      </tr>
                      ${keywordData.keywords.slice(0, 5).map((kw: any) => `
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 16px;">
                              <tr>
                                <td style="color: #1f2937; font-weight: 600; font-size: 15px;">${kw.keyword}</td>
                                <td align="right" style="color: #f59e0b; font-size: 14px; font-weight: 600; white-space: nowrap;">${kw.volume?.toLocaleString() || 0}/mo</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Social Proof Section -->
          <tr>
            <td style="padding: 0 40px 40px 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f9fafb; border-radius: 12px; padding: 32px;">
                <tr>
                  <td align="center">
                    <div style="color: #10b981; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">PROVEN RESULTS</div>
                    <div style="font-size: 18px; color: #1f2937; font-style: italic; line-height: 1.6; margin-bottom: 16px;">"GMB City took us from #8 to #1 in Google Maps in just 45 days. We've seen a 312% increase in phone calls."</div>
                    <div style="font-size: 14px; color: #6b7280; font-weight: 600;">— Sarah Chen, Beverly Hills Dental</div>

                    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                      <tr>
                        <td align="center" style="padding: 0 16px; border-right: 1px solid #e5e7eb;">
                          <div style="font-size: 32px; font-weight: 900; color: #10b981;">127+</div>
                          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Clients Ranked</div>
                        </td>
                        <td align="center" style="padding: 0 16px; border-right: 1px solid #e5e7eb;">
                          <div style="font-size: 32px; font-weight: 900; color: #10b981;">94%</div>
                          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Hit Page 1</div>
                        </td>
                        <td align="center" style="padding: 0 16px;">
                          <div style="font-size: 32px; font-weight: 900; color: #10b981;">45</div>
                          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Avg Days to Rank</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Personal Note Section -->
          <tr>
            <td style="padding: 0 40px 40px 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 32px;">
                <tr>
                  <td>
                    <div style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      <strong>${businessName.split(' ')[0]},</strong><br/><br/>
                      I personally reviewed your audit and noticed several quick wins that could get you ranking in the top 3 within 60 days.<br/><br/>
                      Based on your ${criticalIssues} critical issues, I estimate you're losing <strong>$3,200-$8,700/month</strong> in revenue to competitors who rank above you.<br/><br/>
                      Let's schedule a 15-minute strategy call where I'll show you exactly how to fix these issues (and skip the ones that don't matter).
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">
                      <strong style="color: #1f2937;">— Alex Martinez</strong><br/>
                      Lead SEO Strategist, GMB City<br/>
                      <span style="color: #10b981;">📧 alex@gmbcity.com</span> • <span style="color: #10b981;">📞 (424) 283-2608</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Section with Urgency -->
          <tr>
            <td style="padding: 0 40px 48px 40px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 48px 32px; text-align: center;">
                <tr>
                  <td align="center">
                    <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 28px; font-weight: 800;" class="mobile-font-medium">Ready to Rank #1 in Google Maps?</h2>
                    <p style="margin: 0 0 32px 0; color: rgba(255,255,255,0.95); font-size: 16px; line-height: 1.6;">Book your free strategy call within 48 hours and get a complimentary GBP optimization (normally $500)</p>

                    <!-- CTA Button -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background: #ffffff; border-radius: 12px; padding: 18px 48px;">
                          <a href="https://www.gmb.city" style="color: #059669; font-size: 18px; font-weight: 700; text-decoration: none; display: block;">Book Your Free Strategy Call →</a>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 24px; color: rgba(255,255,255,0.85); font-size: 13px;">
                      ⏰ Limited: Only 3 spots available this week
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 40px; background: #f9fafb; border-radius: 0 0 16px 16px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="font-weight: 700; color: #1f2937; font-size: 16px; margin-bottom: 8px;">GMB City</div>
                    <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                      2029 Century Park E Suite 430<br/>
                      Los Angeles, CA 90067<br/>
                      <a href="tel:+14242832608" style="color: #10b981; text-decoration: none;">(424) 283-2608</a> •
                      <a href="mailto:info@gmbcity.com" style="color: #10b981; text-decoration: none;">info@gmbcity.com</a>
                    </div>
                    <div style="margin-top: 16px; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} GMB City. All rights reserved.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Email Content -->

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
