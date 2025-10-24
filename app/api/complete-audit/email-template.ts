// Premium Email Template for Complete Audit Report
// Luxury, clear, concise design with card-based sections

export function generatePremiumEmailHTML(data: {
  businessName: string;
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
  const criticalIssues = seoData?.local?.insights?.length || 0;

  // GBP Data from citation checker
  const hasGBP = citationData?.hasGBP || false;
  const gbpData = citationData?.gbpData;
  const gbpRating = gbpData?.rating || 0;
  const gbpReviews = gbpData?.reviewCount || 0;

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
      .mobile-padding { padding: 24px !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 16px !important; }
      .mobile-hide { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 48px 20px;">

        <!-- Main Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="640" class="container" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">

          <!-- Header with Logo and Business Name -->
          <tr>
            <td style="padding: 48px 48px 32px 48px; background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Logo (Base64 encoded SVG will go here) -->
                    <div style="margin-bottom: 24px;">
                      <img src="https://www.gmb.city/gmb-city-logo.svg" alt="GMB City" width="200" height="100" style="display: block; margin: 0 auto;" />
                    </div>

                    <h1 style="margin: 0 0 8px 0; color: #111827; font-size: 32px; font-weight: 800; line-height: 1.2;">Local SEO Audit Report</h1>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 18px; font-weight: 600;">${businessName}</p>

                    <!-- Grade Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, ${grade.color} 0%, ${grade.color}dd 100%); border-radius: 60px; padding: 16px 32px; box-shadow: 0 4px 16px ${grade.color}40;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 12px;">
                                <div style="font-size: 36px; font-weight: 900; color: #ffffff; line-height: 1;">${grade.letter}</div>
                              </td>
                              <td style="border-left: 2px solid rgba(255,255,255,0.3); padding-left: 12px;">
                                <div style="font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.5px;">${grade.label}</div>
                                <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 2px;">${avgScore}/100</div>
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

          <!-- Executive Summary Card -->
          <tr>
            <td style="padding: 0 48px 32px 48px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px;">
                <tr>
                  <td>
                    <div style="color: #10b981; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">DIAGNOSIS</div>
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-weight: 500;">${criticalIssues > 0 ? `We found <strong style="color: #ef4444;">${criticalIssues} critical issues</strong> holding you back from page 1 rankings.` : 'Your SEO foundation is solid, but there are quick wins to capture more traffic.'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;" class="mobile-padding">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);"></div>
            </td>
          </tr>

          <!-- Section 1: SEO Snapshot -->
          <tr>
            <td style="padding: 32px 48px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 22px; font-weight: 700;">SEO Snapshot</h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Local SEO Card -->
                        <td width="48%" class="mobile-stack" style="vertical-align: top;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px;">
                            <tr>
                              <td align="center">
                                <div style="color: #047857; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Local SEO</div>
                                <div style="font-size: 48px; font-weight: 900; color: #059669; line-height: 1; margin-bottom: 4px;">${localScore}</div>
                                <div style="color: #6b7280; font-size: 13px; font-weight: 600;">out of 100</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="4%" class="mobile-hide"></td>
                        <!-- On-Site SEO Card -->
                        <td width="48%" class="mobile-stack" style="vertical-align: top;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px;">
                            <tr>
                              <td align="center">
                                <div style="color: #047857; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">On-Site SEO</div>
                                <div style="font-size: 48px; font-weight: 900; color: #059669; line-height: 1; margin-bottom: 4px;">${onsiteScore}</div>
                                <div style="color: #6b7280; font-size: 13px; font-weight: 600;">out of 100</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${seoData?.local?.insights && seoData.local.insights.length > 0 ? `
                <tr>
                  <td style="padding-top: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
                      <tr>
                        <td>
                          <div style="color: #dc2626; font-size: 13px; font-weight: 700; margin-bottom: 8px;">⚠️ Critical Issues:</div>
                          ${seoData.local.insights.slice(0, 3).map((insight: string) => `
                            <div style="color: #7f1d1d; font-size: 14px; line-height: 1.5; margin: 4px 0; padding-left: 12px;">• ${insight}</div>
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

          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;" class="mobile-padding">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);"></div>
            </td>
          </tr>

          <!-- Section 2: Citation Coverage Checker (GBP Only) -->
          <tr>
            <td style="padding: 32px 48px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 22px; font-weight: 700;">Citation Coverage Checker</h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <!-- GBP Status Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: ${hasGBP ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'}; border: 2px solid ${hasGBP ? '#10b981' : '#ef4444'}; border-radius: 12px; padding: 24px;">
                      <tr>
                        <td align="center">
                          <div style="font-size: 48px; margin-bottom: 8px;">${hasGBP ? '✅' : '❌'}</div>
                          <div style="color: ${hasGBP ? '#059669' : '#dc2626'}; font-size: 18px; font-weight: 700; margin-bottom: 4px;">Google Business Profile</div>
                          <div style="color: #6b7280; font-size: 14px; font-weight: 600;">${hasGBP ? 'Active & Found' : 'Not Found'}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Locked Other Citations -->
                <tr>
                  <td style="padding-top: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 12px; padding: 20px;">
                      <tr>
                        <td align="center">
                          <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.4;">🔒</div>
                          <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Full Citation Audit Locked</div>
                          <div style="color: #9ca3af; font-size: 13px; line-height: 1.5;">Yelp, Facebook, Apple Maps, Bing Places, Yellow Pages + 15 more directories</div>
                          <div style="margin-top: 12px;">
                            <a href="https://www.gmb.city" style="color: #10b981; font-size: 13px; font-weight: 600; text-decoration: none;">Unlock Comprehensive Audit →</a>
                          </div>
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
            <td style="padding: 0 48px;" class="mobile-padding">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);"></div>
            </td>
          </tr>

          <!-- Section 3: Keyword Opportunities -->
          <tr>
            <td style="padding: 32px 48px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 22px; font-weight: 700;">Keyword Opportunities</h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 24px;">
                      <tr>
                        <td align="center">
                          <div style="font-size: 56px; font-weight: 900; color: #d97706; line-height: 1; margin-bottom: 4px;">${keywordData?.keywords?.length || 0}</div>
                          <div style="color: #92400e; font-size: 14px; font-weight: 600;">high-value keywords found</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${keywordData?.keywords && keywordData.keywords.length > 0 ? `
                <tr>
                  <td style="padding-top: 16px;">
                    ${keywordData.keywords.slice(0, 5).map((kw: any) => `
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
                        <tr>
                          <td style="color: #111827; font-size: 15px; font-weight: 600;">${kw.keyword}</td>
                          <td align="right" style="color: #f59e0b; font-size: 14px; font-weight: 700; white-space: nowrap;">${kw.volume?.toLocaleString() || 0}/mo</td>
                        </tr>
                      </table>
                    `).join('')}
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;" class="mobile-padding">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);"></div>
            </td>
          </tr>

          <!-- Section 4: Google Business Profile Audit -->
          <tr>
            <td style="padding: 32px 48px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 22px; font-weight: 700;">Google Business Profile Audit</h2>
                  </td>
                </tr>
                ${hasGBP && gbpData ? `
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Rating Card -->
                        <td width="48%" class="mobile-stack" style="vertical-align: top;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px;">
                            <tr>
                              <td align="center">
                                <div style="color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Rating</div>
                                <div style="font-size: 48px; font-weight: 900; color: #d97706; line-height: 1; margin-bottom: 4px;">${gbpRating.toFixed(1)}</div>
                                <div style="color: #92400e; font-size: 13px; font-weight: 600;">⭐ out of 5.0</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="4%" class="mobile-hide"></td>
                        <!-- Reviews Card -->
                        <td width="48%" class="mobile-stack" style="vertical-align: top;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px;">
                            <tr>
                              <td align="center">
                                <div style="color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Reviews</div>
                                <div style="font-size: 48px; font-weight: 900; color: #d97706; line-height: 1; margin-bottom: 4px;">${gbpReviews}</div>
                                <div style="color: #92400e; font-size: 13px; font-weight: 600;">total reviews</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${citationData.positives && citationData.positives.length > 0 ? `
                <tr>
                  <td style="padding-top: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px;">
                      <tr>
                        <td>
                          <div style="color: #059669; font-size: 13px; font-weight: 700; margin-bottom: 8px;">✓ Strengths:</div>
                          ${citationData.positives.slice(0, 4).map((item: string) => `
                            <div style="color: #065f46; font-size: 14px; line-height: 1.5; margin: 4px 0; padding-left: 12px;">• ${item}</div>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
                ${citationData.improvements && citationData.improvements.length > 0 ? `
                <tr>
                  <td style="padding-top: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                      <tr>
                        <td>
                          <div style="color: #d97706; font-size: 13px; font-weight: 700; margin-bottom: 8px;">⚡ Opportunities:</div>
                          ${citationData.improvements.slice(0, 4).map((item: string) => `
                            <div style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 4px 0; padding-left: 12px;">• ${item}</div>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
                ` : `
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 24px;">
                      <tr>
                        <td align="center">
                          <div style="font-size: 48px; margin-bottom: 12px;">🚫</div>
                          <div style="color: #dc2626; font-size: 18px; font-weight: 700; margin-bottom: 8px;">No Google Business Profile Found</div>
                          <div style="color: #7f1d1d; font-size: 14px; line-height: 1.6;">You need a Google Business Profile to rank in local search. This is critical for your visibility.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `}
              </table>
            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td style="padding: 32px 48px 48px 48px;" class="mobile-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px; padding: 32px; text-align: center;">
                <tr>
                  <td align="center">
                    <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 800;">Ready to Fix These Issues?</h3>
                    <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">Book a free 15-minute strategy call. We'll show you exactly what to fix first.</p>

                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background: #ffffff; border-radius: 8px; padding: 14px 32px;">
                          <a href="https://www.gmb.city" style="color: #047857; font-size: 16px; font-weight: 700; text-decoration: none; display: block;">Book Your Free Call →</a>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; color: rgba(255,255,255,0.85); font-size: 12px;">⏰ Only 3 spots available this week</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px; background: #f9fafb; border-radius: 0 0 16px 16px;">
              <div style="color: #111827; font-size: 15px; font-weight: 700; margin-bottom: 8px;">GMB City</div>
              <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                2029 Century Park E Suite 430, Los Angeles, CA 90067<br/>
                <a href="tel:+14242832608" style="color: #10b981; text-decoration: none;">(424) 283-2608</a> •
                <a href="mailto:info@gmbcity.com" style="color: #10b981; text-decoration: none;">info@gmbcity.com</a>
              </div>
              <div style="margin-top: 12px; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} GMB City. All rights reserved.</div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
