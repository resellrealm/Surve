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
    heading: '1. Eligibility',
    body:
      'You must be at least 18 years old to create an account or use Surve. By signing up, you represent that you are of legal age and have the authority to enter into this agreement. If you are using Surve on behalf of a business, you represent that you are authorized to bind that business to these Terms.',
  },
  {
    heading: '2. Your Account',
    body:
      'You are responsible for safeguarding your login credentials and for all activity that occurs under your account. Keep your information accurate and up to date. Notify us immediately if you suspect unauthorized access. Surve, Inc. is not liable for losses caused by someone else using your account with or without your permission.',
  },
  {
    heading: '3. Accepted Use',
    body:
      'Surve connects social media creators with hotels, restaurants, bars, and resorts for collaborative bookings. You agree to use the platform only for lawful purposes, to communicate respectfully, to honor bookings you accept, and to deliver the content or experience you commit to. Misrepresenting your audience, fabricating metrics, or using bots to inflate engagement is strictly prohibited.',
  },
  {
    heading: '4. Payments, Escrow, and Platform Fee',
    body:
      'Surve charges a 5% platform fee on each completed booking, deducted from the payout to the creator. Business payments are held in escrow by our payment processor until the booking is marked complete or the dispute window closes. Payouts are released to creators within a standard processing window after completion. All prices are shown in the currency indicated at checkout; taxes may apply based on your jurisdiction.',
  },
  {
    heading: '5. Disputes and Refunds',
    body:
      'If a booking does not occur as agreed, either party may open a dispute within 7 days of the scheduled booking date. Surve will review submitted evidence — messages, content deliverables, and attendance confirmations — and make a good-faith determination. Refunds may be issued in full or in part. Disputes raised outside the 7-day window will generally not be eligible for refund. Surve, Inc. is not a party to the underlying agreement between creator and business and acts only as a neutral facilitator.',
  },
  {
    heading: '6. Content Ownership and License',
    body:
      'Creators retain full ownership of the content they produce. By delivering content through a Surve booking, the creator grants the associated business a non-exclusive, worldwide, royalty-free license to use, display, and share that content for the business\u2019s marketing and promotional purposes, unless a separate written agreement specifies different terms. Creators are responsible for ensuring they have the rights to any music, footage, or likenesses included in their content.',
  },
  {
    heading: '7. Prohibited Conduct',
    body:
      'You may not: (a) harass, threaten, or discriminate against other users; (b) post false, misleading, or defamatory content; (c) circumvent the platform fee by taking transactions off-platform after being introduced through Surve; (d) attempt to access other users\u2019 accounts, data, or payment information; (e) use the service to promote illegal products or activities; or (f) scrape, reverse engineer, or interfere with the platform\u2019s operation.',
  },
  {
    heading: '8. Termination',
    body:
      'We may suspend or terminate your account at any time if you violate these Terms, abuse the platform, or place other users at risk. You may close your account at any time from Settings. Pending bookings and payouts at the time of termination will be resolved according to our standard dispute and payout policies.',
  },
  {
    heading: '9. Limitation of Liability',
    body:
      'To the fullest extent permitted by law, Surve, Inc. is not liable for indirect, incidental, consequential, or punitive damages, or for lost profits, data, or goodwill arising from your use of the service. Our total liability for any claim related to the service is limited to the greater of the fees Surve collected from you in the 12 months before the claim or one hundred U.S. dollars ($100).',
  },
  {
    heading: '10. Indemnification',
    body:
      'You agree to indemnify and hold harmless Surve, Inc., its officers, employees, and agents from any claims, damages, liabilities, and expenses (including reasonable attorneys\u2019 fees) arising out of your use of the service, your content, your interactions with other users, or your violation of these Terms or applicable law.',
  },
  {
    heading: '11. Governing Law',
    body:
      'These Terms are governed by the laws of the State of California, without regard to its conflict of laws provisions. Any dispute that cannot be resolved informally will be brought exclusively in the state or federal courts located in San Francisco County, California, and you consent to personal jurisdiction there.',
  },
  {
    heading: '12. Changes to These Terms',
    body:
      'We may update these Terms from time to time. If we make material changes, we will notify you through the app or by email before the changes take effect. Continued use of Surve after an update constitutes acceptance of the revised Terms. The version identifier and effective date at the top of this document indicate the current revision.',
  },
  {
    heading: '13. Contact',
    body:
      'Questions about these Terms can be sent to legal@surve.app. Surve, Inc. is headquartered in San Francisco, California.',
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Terms of Service" />

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
          Welcome to Surve. These Terms of Service (&ldquo;Terms&rdquo;) govern
          your use of the Surve platform operated by Surve, Inc. Please read
          them carefully. By creating an account or using the service, you
          agree to be bound by these Terms.
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
