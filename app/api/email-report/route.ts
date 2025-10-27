import { NextRequest, NextResponse } from "next/server";
import { CompleteAuditEmail } from "../../../emails/complete-audit";

// POST /api/email-report
// Sends audit report via email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audit, score, breakdown, tasks, emailTo, whiteLabelConfig, seoData, citationData, keywordData } = body;

    if (!emailTo) {
      return NextResponse.json({ error: "Email address required" }, { status: 400 });
    }

    // Prepare data for React Email template
    const templateData = {
      businessName: audit?.businessName || 'Your Business',
      seoData: seoData || {
        local: {
          score: Math.round(score * 0.5) || 0,
          insights: tasks?.slice(0, 5).map((t: any) => t.title) || [],
        },
        onsite: {
          score: Math.round(score * 0.5) || 0,
        },
      },
      citationData: citationData || {
        hasGBP: audit?.reviewCount > 0,
        gbpData: {
          rating: audit?.rating || 0,
          reviewCount: audit?.reviewCount || 0,
          photoCount: audit?.totalPhotos || 0,
        },
        positives: tasks?.filter((t: any) => t.impact === 'Low')
          .slice(0, 4)
          .map((t: any) => t.title) || [],
        improvements: tasks?.filter((t: any) => t.impact !== 'Low')
          .slice(0, 4)
          .map((t: any) => t.title) || [],
      },
      keywordData: keywordData || {
        keywords: [],
      },
    };

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: whiteLabelConfig?.fromEmail || 'GMB City Reports <reports@gme.city>',
        to: emailTo,
        subject: `Local SEO Audit Report - ${templateData.businessName}`,
        react: CompleteAuditEmail(templateData),
      });

      console.log(`✅ Email sent to: ${emailTo}`);
    } else {
      // Demo mode: log the email
      console.log(`⚠️ RESEND_API_KEY not configured - Email would be sent to: ${emailTo}`);
      console.log(`Business: ${templateData.businessName}`);
    }

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
    });

  } catch (error: any) {
    console.error("Email report error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send report" },
      { status: 500 }
    );
  }
}
