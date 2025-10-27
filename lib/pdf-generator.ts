import { render } from '@react-email/components';
import { CompleteAuditEmail } from '../emails/complete-audit';

export interface AuditPDFData {
  businessName: string;
  seoData?: any;
  citationData?: any;
  keywordData?: any;
}

/**
 * Generates a PDF from the CompleteAuditEmail template
 * @param data - Audit data to populate the email template
 * @returns PDF as a Buffer
 */
export async function generateAuditPDF(data: AuditPDFData): Promise<Buffer> {
  // Render the React Email component to HTML
  const emailHtml = await render(
    CompleteAuditEmail({
      businessName: data.businessName,
      seoData: data.seoData,
      citationData: data.citationData,
      keywordData: data.keywordData,
    }),
    {
      pretty: false,
    }
  );

  // Dynamically import based on environment
  let browser;

  // Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    // Use puppeteer-core with @sparticuz/chromium for serverless
    const puppeteerCore = await import('puppeteer-core');
    const chromium = await import('@sparticuz/chromium');

    browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  } else {
    // Use regular puppeteer for local development
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  try {
    const page = await browser.newPage();

    // Set the HTML content
    await page.setContent(emailHtml, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
