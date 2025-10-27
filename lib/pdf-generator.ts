import { render } from '@react-email/components';
import puppeteer from 'puppeteer';
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

  // Launch headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

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
