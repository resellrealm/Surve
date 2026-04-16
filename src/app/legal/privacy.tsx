import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

const EFFECTIVE_DATE = 'April 14, 2026';
const VERSION = 'v1.0.0';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. Information We Collect',
    body:
      'We collect the information you give us when you sign up and use Surve, including your email address, full name, profile photos, social media handles (TikTok, Instagram, YouTube), publicly reported follower and engagement counts, and the city or region you operate in. For businesses, we collect venue details, contact information, and business documents where required. When you book or receive a payout, our payment processor Stripe collects and stores your payment method details and tax identifiers on our behalf \u2014 Surve never sees your full card number. We also automatically collect device information (model, operating system, app version, language, time zone), IP address, and usage analytics (screens viewed, features used, crashes) so we can keep the app working and improve it.',
  },
  {
    heading: '2. How We Use Your Information',
    body:
      'We use your information to operate the service, match creators with relevant businesses, verify identity and prevent fraud, process payments and payouts, send booking and account notifications, respond to support requests, and keep the community safe. With your explicit consent, we may send marketing emails or push notifications about new features, opportunities, or promotions \u2014 you can opt out at any time from Settings or by using the unsubscribe link in any email. We never sell your personal information.',
  },
  {
    heading: '3. Third Parties We Share Data With',
    body:
      'Surve relies on a small set of trusted service providers to run the platform. Supabase hosts our database, authentication, and media storage. Stripe processes payments and payouts and handles related compliance (KYC, 1099 tax forms in the US). Resend sends transactional and marketing emails on our behalf. PostHog collects anonymized product analytics so we can understand how features are used. Sentry receives crash and error reports to help us diagnose and fix bugs. Each provider only receives the minimum data needed to do its job and is contractually bound to protect your information. We do not share your data with advertisers or data brokers.',
  },
  {
    heading: '4. Data Retention',
    body:
      'We keep your account data for as long as your account is active. When you delete your account from Settings, your profile, messages, and personal content are permanently purged from our systems within 30 days. Transaction and payout records are retained for 7 years to comply with tax, accounting, and anti-money-laundering obligations \u2014 these records are stored in a restricted archive and are not used for any other purpose. Anonymized analytics may be retained indefinitely in aggregated form.',
  },
  {
    heading: '5. Your Rights',
    body:
      'You have the right to access the personal information we hold about you, correct anything that is inaccurate, request deletion of your data, and export a copy of your data in a machine-readable format. If you are in the EU, UK, or California, you also have the right to object to certain processing, restrict how we use your data, and opt out of the \u201csale\u201d or \u201csharing\u201d of personal information \u2014 though Surve does not sell personal information. You can exercise any of these rights from Settings > Account, or by emailing privacy@surve.app. We will respond within 30 days.',
  },
  {
    heading: '6. Cookies and Tracking',
    body:
      'The Surve mobile app does not use browser cookies. We use a device-level anonymous identifier to measure product analytics and a persistent login token so you do not have to sign in every time you open the app. Our email messages may contain a pixel that tells us whether the message was opened \u2014 you can disable remote image loading in your email client to block this. We do not use cross-app advertising trackers.',
  },
  {
    heading: '7. Children\u2019s Privacy',
    body:
      'Surve is not intended for anyone under the age of 13, and we do not knowingly collect personal information from children. Users in the United States must be at least 18 to create an account. If you believe a child has provided us with personal information, please contact privacy@surve.app and we will delete it promptly.',
  },
  {
    heading: '8. International Data Transfers',
    body:
      'Surve is operated from the United States, and your information may be processed in the US and in other countries where our service providers operate. When we transfer personal data out of the EU, UK, or other regions with data-protection laws, we rely on Standard Contractual Clauses or equivalent legal mechanisms to ensure your data continues to receive an adequate level of protection.',
  },
  {
    heading: '9. Security',
    body:
      'We protect your data with TLS encryption in transit, encryption at rest, strict access controls, and regular security reviews. Payment card data is handled entirely by Stripe on PCI-DSS certified infrastructure. No system is perfectly secure, so we also ask that you choose a strong, unique password and enable two-factor authentication in Settings > Account.',
  },
  {
    heading: '10. Changes to This Policy',
    body:
      'We may update this Privacy Policy from time to time. If we make material changes \u2014 for example, collecting a new category of data or adding a new processor \u2014 we will notify you through the app or by email before the changes take effect. The version and effective date at the top of this document always indicate the current revision.',
  },
  {
    heading: '11. Contact',
    body:
      'Questions, requests, or complaints about this Privacy Policy can be sent to privacy@surve.app. If you are in the EU or UK, you also have the right to lodge a complaint with your local data-protection authority.',
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Privacy Policy" />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.huge,
          gap: Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.metaCard,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
            Version
          </Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>{VERSION}</Text>
          <View style={{ height: Spacing.sm }} />
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
            Effective date
          </Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>
            {EFFECTIVE_DATE}
          </Text>
        </View>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          This Privacy Policy explains what information Surve, Inc.
          (&ldquo;Surve&rdquo;, &ldquo;we&rdquo;) collects, how we use it, and
          the choices you have. We wrote it in plain English and designed it to
          meet the requirements of the EU GDPR and the California CCPA/CPRA.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.heading} style={{ gap: Spacing.sm }}>
            <Text style={[styles.heading, { color: colors.text }]} accessibilityRole="header">
              {section.heading}
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              {section.body}
            </Text>
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          &copy; 2026 Surve, Inc. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metaCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  metaLabel: {
    ...Typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    ...Typography.headline,
    marginTop: Spacing.xxs,
  },
  intro: {
    ...Typography.body,
  },
  heading: {
    ...Typography.headline,
  },
  body: {
    ...Typography.body,
  },
  footer: {
    ...Typography.footnote,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
