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
    heading: '1. Overview',
    body:
      'This Creator Agreement ("Agreement") is a supplement to the Surve Terms of Service and governs your use of the platform as a content creator. By completing creator onboarding, you agree to these additional terms.',
  },
  {
    heading: '2. Eligibility',
    body:
      'You must be at least 18 years old, have an active social media presence on at least one supported platform (currently Instagram and TikTok), and maintain accurate follower counts and engagement metrics in your profile. Misrepresenting your audience size or engagement rate is grounds for immediate account termination.',
  },
  {
    heading: '3. How Bookings Work',
    body:
      'When a business accepts your application, a booking is created and the business\u2019s payment is held in escrow by our payment processor. You are expected to create the agreed-upon content within the timeframe specified in the listing. Once you submit proof of delivery (a live URL and optional screenshots), the business has 72 hours to approve or dispute the work. If they take no action, the booking is automatically approved.',
  },
  {
    heading: '4. Payouts via Stripe Connect',
    body:
      'To receive payouts, you must complete Stripe Connect onboarding and maintain a connected account in good standing. Payouts are initiated when a booking is marked complete and are subject to standard Stripe processing times (typically 2\u20137 business days). Surve does not hold funds directly; all payments flow through Stripe\u2019s regulated infrastructure.',
  },
  {
    heading: '5. Platform Fee',
    body:
      'Surve charges a 5% platform fee on each completed booking, deducted from the payout amount before it reaches your Stripe Connect account. The fee covers platform operation, payment processing facilitation, dispute resolution, and customer support. The fee rate may change with 30 days\u2019 notice.',
  },
  {
    heading: '6. Tax Responsibility',
    body:
      'You are solely responsible for reporting and paying all taxes on income earned through Surve. In the United States, if you earn $600 or more in a calendar year, Stripe may issue a 1099-K form. Surve does not provide tax advice. Consult a qualified tax professional for guidance on your specific situation.',
  },
  {
    heading: '7. Content Ownership and License',
    body:
      'You retain full ownership of all content you create. By delivering content through a Surve booking, you grant the associated business a non-exclusive, worldwide, royalty-free license to use, display, and share that content for their marketing and promotional purposes. This license survives the completion of the booking unless a separate written agreement specifies otherwise. You may continue to use the content on your own channels.',
  },
  {
    heading: '8. Non-Exclusivity',
    body:
      'Unless a listing explicitly requires exclusivity and you accept those terms before applying, you are free to work with competing businesses and other platforms. If a listing includes an exclusivity clause, it will be clearly stated in the listing description and booking confirmation.',
  },
  {
    heading: '9. Delivery Obligations',
    body:
      'You must deliver content that meets the specifications described in the listing (platform, content type, approximate length, key messaging). Failure to deliver as agreed may result in a dispute, refund to the business, and a negative review on your profile. Repeated failures to deliver may lead to account suspension.',
  },
  {
    heading: '10. Cancellations',
    body:
      'You may withdraw an application before it is accepted at no cost. After a booking is created, cancelling without mutual agreement may result in a cancellation fee and impact your reliability score. If you need to cancel due to an emergency, contact the business through in-app messaging as soon as possible and reach out to support@surve.app.',
  },
  {
    heading: '11. Prohibited Conduct',
    body:
      'You may not: (a) accept payment outside of Surve for work introduced through the platform; (b) use fake accounts, bots, or purchased followers to inflate your metrics; (c) deliver content that infringes on third-party intellectual property; (d) harass or threaten businesses; or (e) submit fabricated proof of delivery.',
  },
  {
    heading: '12. Account Termination',
    body:
      'Surve may suspend or terminate your creator account for violations of this Agreement or the Terms of Service. Upon termination, pending payouts for completed bookings will still be processed. Any bookings in progress at the time of termination will be handled according to our dispute resolution process.',
  },
  {
    heading: '13. Contact',
    body:
      'Questions about this Creator Agreement can be sent to creators@surve.app. Surve, Inc. is headquartered in San Francisco, California.',
  },
];

export default function CreatorTermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Creator Agreement" />

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
          This agreement outlines the terms specific to creators using the Surve
          platform. It supplements our general Terms of Service and should be
          read alongside them.
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
