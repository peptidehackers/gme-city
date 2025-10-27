import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
  Link,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface CompleteAuditEmailProps {
  businessName?: string;
  seoData?: any;
  citationData?: any;
  keywordData?: any;
}

export const CompleteAuditEmail = ({
  businessName = 'Your Business',
  seoData,
  citationData,
  keywordData,
}: CompleteAuditEmailProps) => {
  // Calculate scores
  const localScore = seoData?.local?.score || 0;
  const onsiteScore = seoData?.onsite?.score || 0;
  const avgScore = Math.round((localScore + onsiteScore) / 2);

  // Get grade with enhanced color scheme
  const getGrade = (score: number) => {
    if (score >= 90) return { letter: 'A', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', label: 'Excellent', textColor: '#065f46' };
    if (score >= 80) return { letter: 'B', color: '#34d399', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', label: 'Good', textColor: '#047857' };
    if (score >= 70) return { letter: 'C', color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', label: 'Fair', textColor: '#92400e' };
    if (score >= 60) return { letter: 'D', color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', label: 'Needs Work', textColor: '#7c2d12' };
    return { letter: 'F', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', label: 'Critical', textColor: '#7f1d1d' };
  };

  const grade = getGrade(avgScore);
  const criticalIssues = seoData?.local?.insights?.length || 0;
  const totalIssues = criticalIssues;
  const quickWins = keywordData?.keywords?.length || 0;

  // GBP Data
  const hasGBP = citationData?.hasGBP || false;
  const gbpData = citationData?.gbpData;
  const gbpRating = gbpData?.rating || 0;
  const gbpReviews = gbpData?.reviewCount || 0;
  const gbpPhotos = gbpData?.photoCount || 0;

  // Date formatting
  const reportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>Your complete local SEO audit results for {businessName} - {grade.label} grade with {criticalIssues} critical issues found</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Minimal Header with Logo */}
          <Section style={styles.headerSection}>
            <Img
              src="https://raw.githubusercontent.com/peptidehackers/gme-city/main/public/gmb-city-logo-email.png"
              width="300"
              height="133"
              alt="GMB City"
              style={styles.logo}
            />
          </Section>

          {/* Hero Section with Grade Badge */}
          <Section style={styles.heroSection}>
            <Text style={styles.heroLabel}>FREE LIMITED SEO AUDIT</Text>
            <Heading as="h1" style={styles.heroTitle}>{businessName}</Heading>
            <Text style={styles.heroDate}>{reportDate}</Text>

            {/* Large Grade Badge */}
            <Section style={styles.gradeBadgeContainer}>
              <Section style={{...styles.gradeBadgeCircle, backgroundColor: grade.color}}>
                <Text style={styles.gradeLetter}>{grade.letter}</Text>
              </Section>
              <Section style={styles.gradeDetails}>
                <Text style={styles.gradeLabel}>{grade.label.toUpperCase()}</Text>
                <Text style={styles.gradeScore}>{avgScore} / 100</Text>
              </Section>
            </Section>

            {/* Executive Summary */}
            <Section style={styles.executiveSummary}>
              <Text style={styles.summaryTitle}>Executive Summary</Text>
              <Text style={styles.summaryText}>
                {avgScore >= 80
                  ? `Your local SEO foundation is strong with an overall score of ${avgScore}/100. We've identified ${quickWins} keyword opportunities to help you dominate local search results.`
                  : avgScore >= 60
                  ? `Your local SEO needs improvement. We found ${totalIssues} critical issues that are preventing you from ranking on page 1. The good news? These are fixable, and we've identified ${quickWins} keyword opportunities.`
                  : `Your local SEO needs immediate attention. With ${totalIssues} critical issues, you're invisible to potential customers. But don't worry - we've mapped out exactly what needs to be fixed.`
                }
              </Text>
            </Section>
          </Section>

          {/* Key Metrics Dashboard - 4 Column Grid */}
          <Section style={styles.metricsSection}>
            <Heading as="h2" style={styles.sectionTitle}>Performance Dashboard</Heading>
            <Row>
              <Column style={styles.metricCardWrapper}>
                <Section style={styles.metricCard}>
                  <Text style={styles.metricValue}>{avgScore}</Text>
                  <Text style={styles.metricLabel}>Overall Score</Text>
                  <Section style={styles.progressBarContainer}>
                    <Section style={{...styles.progressBarFill, width: `${avgScore}%`, backgroundColor: grade.color}} />
                  </Section>
                </Section>
              </Column>
              <Column style={{width: '20px'}} />
              <Column style={styles.metricCardWrapper}>
                <Section style={styles.metricCard}>
                  <Text style={totalIssues > 0 ? styles.metricValueDanger : styles.metricValueSuccess}>{totalIssues}</Text>
                  <Text style={styles.metricLabel}>Critical Issues</Text>
                  <Text style={totalIssues > 0 ? styles.metricSubtextDanger : styles.metricSubtextSuccess}>
                    {totalIssues > 0 ? 'Needs attention' : 'All clear'}
                  </Text>
                </Section>
              </Column>
            </Row>
            <Row style={{marginTop: '16px'}}>
              <Column style={styles.metricCardWrapper}>
                <Section style={styles.metricCard}>
                  <Text style={hasGBP ? styles.metricValueSuccess : styles.metricValueDanger}>
                    {hasGBP ? '✓' : '✗'}
                  </Text>
                  <Text style={styles.metricLabel}>GBP Status</Text>
                  <Text style={hasGBP ? styles.metricSubtextSuccess : styles.metricSubtextDanger}>
                    {hasGBP ? 'Active' : 'Missing'}
                  </Text>
                </Section>
              </Column>
              <Column style={{width: '20px'}} />
              <Column style={styles.metricCardWrapper}>
                <Section style={styles.metricCard}>
                  <Text style={styles.metricValueWarning}>{quickWins}</Text>
                  <Text style={styles.metricLabel}>Quick Wins</Text>
                  <Text style={styles.metricSubtextWarning}>Keyword opportunities</Text>
                </Section>
              </Column>
            </Row>
          </Section>

          <Hr style={styles.sectionDivider} />

          {/* SEO Snapshot - Enhanced Card Design */}
          <Section style={styles.contentSection}>
            <Heading as="h2" style={styles.sectionTitle}>SEO Snapshot</Heading>
            <Text style={styles.sectionDescription}>
              Your technical SEO performance across local and on-site factors
            </Text>

            <Row style={{marginTop: '24px'}}>
              {/* Local SEO Card */}
              <Column style={styles.scoreColumnWrapper}>
                <Section style={styles.scoreCard}>
                  <Text style={styles.scoreIcon}>📍</Text>
                  <Text style={styles.scoreCardTitle}>Local SEO</Text>
                  <Text style={styles.scoreNumber}>{localScore}</Text>
                  <Text style={styles.scoreSubtext}>out of 100</Text>
                  <Section style={styles.scoreProgressBar}>
                    <Section style={{...styles.scoreProgressFill, width: `${localScore}%`, backgroundColor: localScore >= 70 ? '#10b981' : localScore >= 50 ? '#f59e0b' : '#ef4444'}} />
                  </Section>
                </Section>
              </Column>
              <Column style={{width: '24px'}} />
              {/* On-Site SEO Card */}
              <Column style={styles.scoreColumnWrapper}>
                <Section style={styles.scoreCard}>
                  <Text style={styles.scoreIcon}>🌐</Text>
                  <Text style={styles.scoreCardTitle}>On-Site SEO</Text>
                  <Text style={styles.scoreNumber}>{onsiteScore}</Text>
                  <Text style={styles.scoreSubtext}>out of 100</Text>
                  <Section style={styles.scoreProgressBar}>
                    <Section style={{...styles.scoreProgressFill, width: `${onsiteScore}%`, backgroundColor: onsiteScore >= 70 ? '#10b981' : onsiteScore >= 50 ? '#f59e0b' : '#ef4444'}} />
                  </Section>
                </Section>
              </Column>
            </Row>

            {/* Critical Issues Alert */}
            {seoData?.local?.insights && seoData.local.insights.length > 0 && (
              <Section style={styles.alertCard}>
                <Section style={styles.alertHeader}>
                  <Text style={styles.alertIcon}>⚠️</Text>
                  <Text style={styles.alertTitle}>Critical Issues Found</Text>
                </Section>
                {seoData.local.insights.slice(0, 3).map((insight: string, i: number) => (
                  <Section key={i} style={styles.alertItem}>
                    <Text style={styles.alertBullet}>•</Text>
                    <Text style={styles.alertText}>{insight}</Text>
                  </Section>
                ))}
                {seoData.local.insights.length > 3 && (
                  <Text style={styles.alertMore}>+ {seoData.local.insights.length - 3} more issues</Text>
                )}
              </Section>
            )}
          </Section>

          <Hr style={styles.sectionDivider} />

          {/* Citation Coverage Checker */}
          <Section style={styles.contentSection}>
            <Heading as="h2" style={styles.sectionTitle}>Citation Coverage Checker</Heading>
            <Text style={styles.sectionDescription}>
              Your business presence across critical local directories
            </Text>

            {/* GBP Status - Premium Card */}
            <Section style={hasGBP ? styles.gbpActiveCard : styles.gbpMissingCard}>
              <Section style={styles.gbpHeader}>
                <Text style={styles.gbpBadge}>{hasGBP ? '✓' : '✗'}</Text>
                <Section style={styles.gbpHeaderText}>
                  <Text style={styles.gbpTitle}>Google Business Profile</Text>
                  <Text style={hasGBP ? styles.gbpStatusActive : styles.gbpStatusMissing}>
                    {hasGBP ? 'Active & Verified' : 'Not Found'}
                  </Text>
                </Section>
              </Section>

              {hasGBP && gbpData && (
                <Row style={{marginTop: '20px'}}>
                  <Column style={styles.gbpStatColumn}>
                    <Text style={styles.gbpStatValue}>⭐ {gbpRating.toFixed(1)}</Text>
                    <Text style={styles.gbpStatLabel}>Rating</Text>
                  </Column>
                  <Column style={styles.gbpStatColumn}>
                    <Text style={styles.gbpStatValue}>{gbpReviews}</Text>
                    <Text style={styles.gbpStatLabel}>Reviews</Text>
                  </Column>
                  <Column style={styles.gbpStatColumn}>
                    <Text style={styles.gbpStatValue}>{gbpPhotos || 'N/A'}</Text>
                    <Text style={styles.gbpStatLabel}>Photos</Text>
                  </Column>
                </Row>
              )}
            </Section>

            {/* Locked Citations - Premium Teaser */}
            <Section style={styles.lockedSection}>
              <Text style={styles.lockIconLarge}>🔒</Text>
              <Text style={styles.lockedTitle}>Full Citation Audit</Text>
              <Text style={styles.lockedBadge}>PREMIUM</Text>
              <Text style={styles.lockedDescription}>
                Get your business listed on 20+ high-authority directories
              </Text>
              <Button href="https://calendly.com/peptidehackers-info/30min" style={styles.unlockButton}>
                Unlock Full Report →
              </Button>
            </Section>
          </Section>

          <Hr style={styles.sectionDivider} />

          {/* Keyword Opportunities */}
          <Section style={styles.contentSection}>
            <Heading as="h2" style={styles.sectionTitle}>Keyword Opportunities</Heading>
            <Text style={styles.sectionDescription}>
              High-value keywords your competitors are ranking for
            </Text>

            <Section style={styles.keywordHero}>
              <Text style={styles.keywordHeroNumber}>{keywordData?.keywords?.length || 0}</Text>
              <Text style={styles.keywordHeroLabel}>High-Value Keywords Found</Text>
              <Text style={styles.keywordHeroSubtext}>
                {keywordData?.keywords?.length > 0
                  ? 'These keywords have high search volume and low competition'
                  : 'Run a keyword analysis to find opportunities'}
              </Text>
            </Section>

            {keywordData?.keywords && keywordData.keywords.length > 0 && (
              <Section style={{marginTop: '24px'}}>
                {keywordData.keywords.slice(0, 5).map((kw: any, i: number) => (
                  <Section key={i} style={styles.keywordRow}>
                    <Section style={styles.keywordMain}>
                      <Text style={styles.keywordRank}>#{i + 1}</Text>
                      <Text style={styles.keywordText}>{kw.keyword}</Text>
                    </Section>
                    <Section style={styles.keywordMeta}>
                      <Text style={styles.keywordVolume}>{kw.volume?.toLocaleString() || '0'}</Text>
                      <Text style={styles.keywordVolumeLabel}>searches/mo</Text>
                    </Section>
                  </Section>
                ))}
              </Section>
            )}
          </Section>

          <Hr style={styles.sectionDivider} />

          {/* Google Business Profile Audit */}
          <Section style={styles.contentSection}>
            <Heading as="h2" style={styles.sectionTitle}>Google Business Profile Audit</Heading>
            <Text style={styles.sectionDescription}>
              Detailed analysis of your Google Business Profile performance
            </Text>

            {hasGBP && gbpData ? (
              <>
                {/* Strengths */}
                {citationData.positives && citationData.positives.length > 0 && (
                  <Section style={styles.strengthsSection}>
                    <Section style={styles.strengthsHeader}>
                      <Text style={styles.strengthsIcon}>✓</Text>
                      <Text style={styles.strengthsTitle}>What You're Doing Right</Text>
                    </Section>
                    {citationData.positives.slice(0, 4).map((item: string, i: number) => (
                      <Section key={i} style={styles.strengthItem}>
                        <Text style={styles.strengthBullet}>●</Text>
                        <Text style={styles.strengthText}>{item}</Text>
                      </Section>
                    ))}
                  </Section>
                )}

                {/* Opportunities */}
                {citationData.improvements && citationData.improvements.length > 0 && (
                  <Section style={styles.opportunitiesSection}>
                    <Section style={styles.opportunitiesHeader}>
                      <Text style={styles.opportunitiesIcon}>⚡</Text>
                      <Text style={styles.opportunitiesTitle}>Quick Wins to Implement</Text>
                    </Section>
                    {citationData.improvements.slice(0, 4).map((item: string, i: number) => (
                      <Section key={i} style={styles.opportunityItem}>
                        <Text style={styles.opportunityBullet}>●</Text>
                        <Text style={styles.opportunityText}>{item}</Text>
                      </Section>
                    ))}
                  </Section>
                )}
              </>
            ) : (
              <Section style={styles.noGbpSection}>
                <Text style={styles.noGbpIcon}>🚫</Text>
                <Heading as="h3" style={styles.noGbpTitle}>No Google Business Profile Found</Heading>
                <Text style={styles.noGbpText}>
                  Without a Google Business Profile, you're invisible in local search.
                  This is the #1 priority for getting found by customers near you.
                </Text>
                <Section style={styles.noGbpActions}>
                  <Text style={styles.noGbpActionTitle}>Next Steps:</Text>
                  <Text style={styles.noGbpActionItem}>1. Claim your Google Business Profile</Text>
                  <Text style={styles.noGbpActionItem}>2. Verify your business location</Text>
                  <Text style={styles.noGbpActionItem}>3. Complete all profile sections</Text>
                </Section>
              </Section>
            )}
          </Section>

          {/* Premium CTA Section - Completely Redesigned */}
          <Section style={styles.ctaOuterWrapper}>
            <Section style={styles.ctaSection}>
              {/* Logo */}
              <Section style={styles.ctaLogoWrapper}>
                <Img
                  src="https://raw.githubusercontent.com/peptidehackers/gme-city/main/public/gmb-city-logo-email.png"
                  width="240"
                  height="107"
                  alt="GMB City"
                  style={styles.ctaLogo}
                />
              </Section>

              {/* CTA Badge */}
              <Section style={styles.ctaBadgeWrapper}>
                <Text style={styles.ctaBadge}>🎯 FREE STRATEGY SESSION</Text>
              </Section>

              <Heading as="h2" style={styles.ctaHeading}>
                Ready to Dominate?
              </Heading>

              <Text style={styles.ctaSubheading}>
                Get a Personalized Action Plan (Worth $500) — Absolutely Free
              </Text>

              <Text style={styles.ctaDescription}>
                Our SEO experts will analyze your audit results and show you exactly how to:
              </Text>

              {/* Benefits List */}
              <Section style={styles.ctaBenefitsList}>
                <Text style={styles.ctaBenefitText}>✓ Fix critical issues killing your rankings</Text>
                <Text style={styles.ctaBenefitText}>✓ Outrank your competitors in 30-60 days</Text>
                <Text style={styles.ctaBenefitText}>✓ Generate more leads without spending on ads</Text>
              </Section>

              {/* Main CTA Button */}
              <Section style={styles.ctaButtonWrapper}>
                <Button href="https://calendly.com/peptidehackers-info/30min" style={styles.ctaButton}>
                  Book My Free Strategy Call →
                </Button>
              </Section>

              {/* Trust Indicators */}
              <Section style={styles.ctaTrustIndicators}>
                <Text style={styles.ctaTrustText}>⏰ Only 3 Spots Left This Week • 💳 No Credit Card Required • ⚡ 15 Minutes</Text>
              </Section>

              {/* Social Proof */}
              <Section style={styles.ctaSocialProof}>
                <Text style={styles.ctaSocialProofText}>
                  <strong>Join 500+ businesses</strong> who've dominated local search with our strategies
                </Text>
              </Section>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Img
              src="https://raw.githubusercontent.com/peptidehackers/gme-city/main/public/gmb-city-logo-email.png"
              width="100"
              height="44"
              alt="GMB City"
              style={styles.footerLogo}
            />
            <Text style={styles.footerTitle}>GMB City</Text>
            <Text style={styles.footerAddress}>
              2029 Century Park E Suite 430<br />
              Los Angeles, CA 90067
            </Text>
            <Text style={styles.footerContact}>
              <Link href="tel:+14245995312" style={styles.footerLink}>(424) 599-5312</Link>
              {' • '}
              <Link href="mailto:info@gmbcity.com" style={styles.footerLink}>info@gmbcity.com</Link>
            </Text>
            <Hr style={styles.footerDivider} />
            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} GMB City. All rights reserved.
            </Text>
            <Text style={styles.footerUnsubscribe}>
              <Link href="https://www.gmb.city/unsubscribe" style={styles.unsubscribeLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default CompleteAuditEmail;

// ============================================
// STYLES - Luxury Professional Design System
// ============================================

const styles = {
  // Base Styles - Dark theme
  body: {
    backgroundColor: '#000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
    lineHeight: '1.6',
  },

  container: {
    backgroundColor: '#0a0a0a',
    margin: '40px auto',
    maxWidth: '600px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },

  // Header Section
  headerSection: {
    backgroundColor: '#1a1a1a',
    padding: '32px 32px 24px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #27272a',
  },

  logo: {
    display: 'block',
    margin: '0 auto',
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#1a1a1a',
    padding: '40px 40px 48px',
    textAlign: 'center' as const,
  },

  heroLabel: {
    color: '#10b981',
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },

  heroTitle: {
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    letterSpacing: '-0.5px',
    textAlign: 'center' as const,
  },

  heroDate: {
    color: '#71717a',
    fontSize: '14px',
    fontWeight: '500',
    margin: '0 0 32px 0',
    textAlign: 'center' as const,
  },

  // Grade Badge - Hero Element
  gradeBadgeContainer: {
    backgroundColor: '#18181b',
    borderRadius: '100px',
    padding: '20px 40px',
    margin: '0 auto 32px auto',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    textAlign: 'center' as const,
    maxWidth: '400px',
  },

  gradeBadgeCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    margin: '0 auto 16px auto',
    textAlign: 'center' as const,
  },

  gradeLetter: {
    fontSize: '56px',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '100px',
    margin: '0',
    display: 'block',
    textAlign: 'center' as const,
  },

  gradeDetails: {
    textAlign: 'center' as const,
  },

  gradeLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.2px',
    margin: '0 0 6px 0',
    textAlign: 'center' as const,
  },

  gradeScore: {
    fontSize: '32px',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1',
    margin: '0',
    textAlign: 'center' as const,
  },

  // Executive Summary
  executiveSummary: {
    backgroundColor: '#09090b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    padding: '24px 28px',
    textAlign: 'center' as const,
    maxWidth: '540px',
    margin: '0 auto',
  },

  summaryTitle: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },

  summaryText: {
    color: '#a1a1aa',
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0',
    textAlign: 'center' as const,
  },

  // Metrics Section - Dashboard Style
  metricsSection: {
    padding: '40px 40px 32px',
    backgroundColor: '#09090b',
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px',
  },

  sectionDescription: {
    color: '#71717a',
    fontSize: '14px',
    margin: '0 0 0 0',
    lineHeight: '1.5',
  },

  metricCardWrapper: {
    width: '250px',
  },

  metricCard: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center' as const,
    minHeight: '120px',
  },

  metricValue: {
    fontSize: '40px',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },

  metricValueSuccess: {
    fontSize: '40px',
    fontWeight: '900',
    color: '#10b981',
    lineHeight: '1',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },

  metricValueDanger: {
    fontSize: '40px',
    fontWeight: '900',
    color: '#ef4444',
    lineHeight: '1',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },

  metricValueWarning: {
    fontSize: '40px',
    fontWeight: '900',
    color: '#f59e0b',
    lineHeight: '1',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },

  metricLabel: {
    color: '#71717a',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },

  metricSubtextSuccess: {
    color: '#059669',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    margin: '0',
    textAlign: 'center' as const,
  },

  metricSubtextDanger: {
    color: '#dc2626',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    margin: '0',
    textAlign: 'center' as const,
  },

  metricSubtextWarning: {
    color: '#d97706',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    margin: '0',
    textAlign: 'center' as const,
  },

  progressBarContainer: {
    backgroundColor: '#3f3f46',
    borderRadius: '4px',
    height: '6px',
    overflow: 'hidden',
    marginTop: '4px',
  },

  progressBarFill: {
    height: '6px',
    borderRadius: '4px',
  },

  // Content Sections
  contentSection: {
    padding: '40px 40px',
  },

  sectionDivider: {
    borderColor: '#27272a',
    borderWidth: '1px',
    margin: '0',
  },

  // Score Cards
  scoreColumnWrapper: {
    width: '50%',
  },

  scoreCard: {
    backgroundColor: '#18181b',
    border: '2px solid #3f3f46',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center' as const,
  },

  scoreIcon: {
    fontSize: '24px',
    margin: '0 0 8px 0',
    display: 'block',
    textAlign: 'center' as const,
  },

  scoreCardTitle: {
    color: '#d4d4d8',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
  },

  scoreNumber: {
    fontSize: '56px',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1',
    margin: '0 0 4px 0',
    textAlign: 'center' as const,
  },

  scoreSubtext: {
    color: '#52525b',
    fontSize: '13px',
    fontWeight: '500',
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
  },

  scoreProgressBar: {
    backgroundColor: '#27272a',
    borderRadius: '6px',
    height: '8px',
    overflow: 'hidden',
  },

  scoreProgressFill: {
    height: '8px',
    borderRadius: '6px',
  },

  // Alert Card
  alertCard: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderLeft: '4px solid #ef4444',
    borderRadius: '12px',
    padding: '20px 24px',
    marginTop: '24px',
  },

  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  alertIcon: {
    fontSize: '18px',
    margin: '0',
  },

  alertTitle: {
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
  },

  alertItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },

  alertBullet: {
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
    lineHeight: '1.5',
  },

  alertText: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
    flex: '1',
  },

  alertMore: {
    color: '#fca5a5',
    fontSize: '13px',
    fontWeight: '600',
    fontStyle: 'italic' as const,
    margin: '8px 0 0 0',
  },

  // GBP Cards
  gbpActiveCard: {
    backgroundColor: '#18181b',
    border: '2px solid #10b981',
    borderRadius: '16px',
    padding: '28px',
    marginTop: '24px',
  },

  gbpMissingCard: {
    backgroundColor: '#18181b',
    border: '2px solid #ef4444',
    borderRadius: '16px',
    padding: '28px',
    marginTop: '24px',
  },

  gbpHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  gbpBadge: {
    fontSize: '40px',
    margin: '0',
  },

  gbpHeaderText: {
    flex: '1',
  },

  gbpTitle: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },

  gbpStatusActive: {
    color: '#10b981',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0',
  },

  gbpStatusMissing: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0',
  },

  gbpStatColumn: {
    width: '33.33%',
    textAlign: 'center' as const,
  },

  gbpStatValue: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 4px 0',
    textAlign: 'center' as const,
  },

  gbpStatLabel: {
    color: '#71717a',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    margin: '0',
    textAlign: 'center' as const,
  },

  // Locked Section - Minimal
  lockedSection: {
    backgroundColor: '#18181b',
    border: '2px dashed #52525b',
    borderRadius: '12px',
    padding: '20px 24px',
    marginTop: '20px',
    textAlign: 'center' as const,
  },

  lockIconLarge: {
    fontSize: '28px',
    opacity: 0.4,
    margin: '0 0 8px 0',
    display: 'block',
    textAlign: 'center' as const,
  },

  lockedTitle: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 0 6px 0',
    display: 'block',
    textAlign: 'center' as const,
  },

  lockedBadge: {
    display: 'inline-block',
    backgroundColor: '#f59e0b',
    color: '#000000',
    fontSize: '9px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
  },

  lockedDescription: {
    color: '#a1a1aa',
    fontSize: '13px',
    margin: '0 0 16px 0',
    display: 'block',
    textAlign: 'center' as const,
  },

  unlockButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    padding: '10px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block',
    border: 'none',
  },

  // Keyword Section
  keywordHero: {
    backgroundColor: '#18181b',
    border: '2px solid #f59e0b',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center' as const,
    marginTop: '24px',
  },

  keywordHeroNumber: {
    fontSize: '64px',
    fontWeight: '900',
    color: '#f59e0b',
    lineHeight: '1',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },

  keywordHeroLabel: {
    color: '#fbbf24',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
  },

  keywordHeroSubtext: {
    color: '#a1a1aa',
    fontSize: '13px',
    margin: '0',
    textAlign: 'center' as const,
  },

  keywordRow: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  keywordMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1',
  },

  keywordRank: {
    backgroundColor: '#27272a',
    color: '#a1a1aa',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '6px',
    margin: '0',
  },

  keywordText: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0',
  },

  keywordMeta: {
    textAlign: 'right' as const,
  },

  keywordVolume: {
    color: '#fbbf24',
    fontSize: '16px',
    fontWeight: '800',
    margin: '0',
  },

  keywordVolumeLabel: {
    color: '#71717a',
    fontSize: '11px',
    margin: '0',
  },

  // Strengths Section
  strengthsSection: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderLeft: '4px solid #10b981',
    borderRadius: '12px',
    padding: '20px 24px',
    marginTop: '24px',
  },

  strengthsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  strengthsIcon: {
    fontSize: '18px',
    margin: '0',
  },

  strengthsTitle: {
    color: '#10b981',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
  },

  strengthItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },

  strengthBullet: {
    color: '#10b981',
    fontSize: '12px',
    margin: '4px 0 0 0',
  },

  strengthText: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
    flex: '1',
  },

  // Opportunities Section
  opportunitiesSection: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderLeft: '4px solid #f59e0b',
    borderRadius: '12px',
    padding: '20px 24px',
    marginTop: '16px',
  },

  opportunitiesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  opportunitiesIcon: {
    fontSize: '18px',
    margin: '0',
  },

  opportunitiesTitle: {
    color: '#fbbf24',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
  },

  opportunityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },

  opportunityBullet: {
    color: '#f59e0b',
    fontSize: '12px',
    margin: '4px 0 0 0',
  },

  opportunityText: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
    flex: '1',
  },

  // No GBP Section
  noGbpSection: {
    backgroundColor: '#18181b',
    border: '2px solid #ef4444',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center' as const,
    marginTop: '24px',
  },

  noGbpIcon: {
    fontSize: '56px',
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
  },

  noGbpTitle: {
    color: '#ef4444',
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
  },

  noGbpText: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
    textAlign: 'center' as const,
  },

  noGbpActions: {
    backgroundColor: '#09090b',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'left' as const,
  },

  noGbpActionTitle: {
    color: '#fca5a5',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
  },

  noGbpActionItem: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.7',
    margin: '0 0 8px 0',
  },

  // CTA Section - Premium Redesign
  ctaOuterWrapper: {
    padding: '48px 40px',
    margin: '40px 0 0 0',
    backgroundColor: '#18181b',
  },

  ctaSection: {
    backgroundColor: '#18181b',
    borderRadius: '20px',
    padding: '48px 40px',
    textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
    border: '3px solid #10b981',
  },

  ctaLogoWrapper: {
    marginBottom: '20px',
  },

  ctaLogo: {
    display: 'block',
    margin: '0 auto',
  },

  ctaBadgeWrapper: {
    marginBottom: '20px',
  },

  ctaBadge: {
    display: 'inline-block',
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.2px',
    padding: '8px 20px',
    borderRadius: '100px',
    margin: '0',
  },

  ctaHeading: {
    color: '#ffffff',
    fontSize: '36px',
    fontWeight: '900',
    margin: '0 0 16px 0',
    lineHeight: '1.1',
    letterSpacing: '-0.5px',
    textAlign: 'center' as const,
  },

  ctaSubheading: {
    color: '#047857',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 24px 0',
    lineHeight: '1.4',
    textAlign: 'center' as const,
  },

  ctaDescription: {
    color: '#a1a1aa',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 20px 0',
    textAlign: 'center' as const,
  },

  ctaBenefitsList: {
    marginBottom: '32px',
    textAlign: 'center' as const,
  },

  ctaBenefitText: {
    color: '#d4d4d8',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
    lineHeight: '1.5',
  },

  ctaButtonWrapper: {
    marginBottom: '24px',
  },

  ctaButton: {
    backgroundColor: '#10b981',
    backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '800',
    padding: '20px 48px',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'inline-block',
    border: 'none',
    boxShadow: '0 12px 40px rgba(16, 185, 129, 0.4)',
    textTransform: 'none' as const,
  },

  ctaTrustIndicators: {
    marginBottom: '20px',
    textAlign: 'center' as const,
  },

  ctaTrustText: {
    color: '#71717a',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0',
    textAlign: 'center' as const,
  },

  ctaSocialProof: {
    backgroundColor: '#09090b',
    border: '1px solid #3f3f46',
    borderRadius: '10px',
    padding: '16px 20px',
  },

  ctaSocialProofText: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
    textAlign: 'center' as const,
  },

  // Footer
  footer: {
    backgroundColor: '#09090b',
    padding: '40px 40px 32px',
    textAlign: 'center' as const,
  },

  footerLogo: {
    display: 'block',
    margin: '0 auto 12px',
  },

  footerTitle: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 0 12px 0',
  },

  footerAddress: {
    color: '#71717a',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0 0 8px 0',
  },

  footerContact: {
    color: '#71717a',
    fontSize: '13px',
    margin: '0 0 20px 0',
  },

  footerLink: {
    color: '#10b981',
    textDecoration: 'none',
    fontWeight: '600',
  },

  footerDivider: {
    borderColor: '#3f3f46',
    borderWidth: '1px',
    margin: '20px 0',
  },

  footerCopyright: {
    color: '#52525b',
    fontSize: '12px',
    margin: '0 0 8px 0',
  },

  footerUnsubscribe: {
    color: '#52525b',
    fontSize: '11px',
    margin: '0',
  },

  unsubscribeLink: {
    color: '#52525b',
    textDecoration: 'underline',
  },
};
