import { NextRequest, NextResponse } from "next/server";

// POST /api/email-report
// Sends audit report via email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audit, score, breakdown, tasks, emailTo, whiteLabelConfig } = body;

    if (!emailTo) {
      return NextResponse.json({ error: "Email address required" }, { status: 400 });
    }

    // Email template
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local SEO Audit Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${whiteLabelConfig?.brandColor || '#10b981'} 0%, #059669 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${whiteLabelConfig?.brandName || 'GMB City'}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Local SEO Audit Report</p>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; color: #111;">Overall Score</h2>
    <div style="font-size: 48px; font-weight: bold; color: ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'};">
      ${score}/100
    </div>
    <div style="margin-top: 10px; padding: 8px 12px; display: inline-block; border-radius: 6px; background: ${score >= 80 ? '#d1fae5' : score >= 60 ? '#fef3c7' : '#fee2e2'}; color: ${score >= 80 ? '#065f46' : score >= 60 ? '#92400e' : '#991b1b'};">
      ${score >= 80 ? 'Great performance!' : score >= 60 ? 'Room for improvement' : 'Needs immediate attention'}
    </div>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 15px 0; color: #111;">Business Information</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Business Name:</td>
        <td style="padding: 8px 0; font-weight: 600;">${audit.businessName || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">City:</td>
        <td style="padding: 8px 0; font-weight: 600;">${audit.city}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Category:</td>
        <td style="padding: 8px 0; font-weight: 600;">${audit.primaryCategory}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Reviews:</td>
        <td style="padding: 8px 0; font-weight: 600;">${audit.reviewCount} (${audit.rating.toFixed(1)}★)</td>
      </tr>
    </table>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 15px 0; color: #111;">Score Breakdown</h2>
    ${Object.entries(breakdown).map(([category, points]) => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-weight: 600;">${category}</span>
          <span style="color: #10b981; font-weight: 600;">${points}/100</span>
        </div>
        <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: ${whiteLabelConfig?.brandColor || '#10b981'}; height: 100%; width: ${points}%; transition: width 0.3s;"></div>
        </div>
      </div>
    `).join('')}
  </div>

  ${tasks.length > 0 ? `
  <div style="background: white; border: 1px solid #e5e7eb; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 15px 0; color: #111;">Priority Action Items</h2>
    ${tasks.map((task: any, idx: number) => `
      <div style="padding: 15px; margin-bottom: 12px; border-left: 4px solid ${task.impact === 'High' ? '#ef4444' : task.impact === 'Medium' ? '#f59e0b' : '#10b981'}; background: #f9fafb; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
          <strong style="color: #111;">${idx + 1}. ${task.title}</strong>
          <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${task.impact === 'High' ? '#fee2e2' : task.impact === 'Medium' ? '#fef3c7' : '#d1fae5'}; color: ${task.impact === 'High' ? '#991b1b' : task.impact === 'Medium' ? '#92400e' : '#065f46'};">
            ${task.impact}
          </span>
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${task.why}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-top: 30px; text-align: center;">
    <p style="margin: 0 0 10px 0; color: #6b7280;">Ready to improve your local SEO?</p>
    <a href="https://gme.city" style="display: inline-block; background: ${whiteLabelConfig?.brandColor || '#10b981'}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Book a Strategy Call
    </a>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>This report was generated by ${whiteLabelConfig?.brandName || 'GMB City'} Local SEO Audit Tool</p>
    <p>© ${new Date().getFullYear()} All rights reserved</p>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'GMB City Reports <reports@gme.city>', // Update this to your verified domain
        to: emailTo,
        subject: `Local SEO Audit Report - ${audit.businessName || 'Your Business'}`,
        html: emailHTML,
      });

      console.log(`✅ Email sent to: ${emailTo}`);
    } else {
      // Demo mode: log the email
      console.log(`⚠️ RESEND_API_KEY not configured - Email would be sent to: ${emailTo}`);
      console.log(`Business: ${audit.businessName}, Score: ${score}`);
    }

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
      // In dev mode, return the HTML for debugging
      ...(process.env.NODE_ENV === 'development' && { previewHTML: emailHTML })
    });

  } catch (error: any) {
    console.error("Email report error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send report" },
      { status: 500 }
    );
  }
}
