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
      'This Business Agreement ("Agreement") is a supplement to the Surve Terms of Service and governs your use of the platform as a business listing creator-collaboration opportunities. By completing business onboarding, you agree to these additional terms.',
  },
  {
    heading: '2. Eligibility',
    body:
      'You must represent a legitimate hospitality, food-service, or lifestyle business. You may be asked to provide a business license, registration document, or other proof of operation during onboarding or at any time thereafter. Businesses that cannot verify their legitimacy may be suspended pending review.',
  },
  {
    heading: '3. Advertiser Responsibility',
    body:
      'Listings you create must accurately describe the collaboration opportunity, compensation, content requirements, and timeline. You must not post misleading listings, misrepresent the nature of the work, or bait creators with terms you do not intend to honor. All listings are subject to review and may be removed if they violate these terms or our Community Guidelines.',
  },
  {
    heading: '4. FTC Disclosure Requirements',
    body:
      'Content created through Surve bookings constitutes a material connection between you and the creator. Both parties are responsible for ensuring compliance with the Federal Trade Commission\u2019s endorsement guidelines and any applicable local advertising regulations. Creators should clearly disclose the sponsored nature of the content. As a business, you must not instruct creators to hide or omit required disclosures.',
  },
  {
    heading: '5. Payment Authorization and Escrow',
    body:
      'When you accept a creator\u2019s application, you authorize Surve to charge your saved payment method for the booking amount. Funds are held in escrow by our payment processor (Stripe) until the booking is completed or a dispute is resolved. You will not be charged until you accept an application and confirm a booking.',
  },
  {
    heading: '6. Proof Review and Approval',
    body:
      'After a creator submits proof of delivery, you have 72 hours to review the content and either approve or dispute the booking. If you take no action within 72 hours, the booking is automatically approved and funds are released to the creator. Review content promptly to ensure it meets the agreed specifications.',
  },
  {
    heading: '7. Refund Eligibility',
    body:
      'Refunds are available only through the dispute resolution process. You may raise a dispute if the creator fails to deliver content, delivers content that materially differs from what was agreed, or violates the listing terms. Refund decisions are made by Surve\u2019s review team based on evidence from both parties. Partial refunds may be issued when appropriate. Refunds are not available for subjective dissatisfaction with content that meets the stated requirements.',
  },
  {
    heading: '8. Indemnification',
    body:
      'You agree to indemnify and hold harmless Surve, Inc., its officers, employees, and agents from any claims arising out of: (a) your listings and their content; (b) your use of creator-produced content; (c) your interactions with creators; (d) any violation of advertising regulations or FTC guidelines in connection with content produced through the platform.',
  },
  {
    heading: '9. Content Usage Rights',
    body:
      'Upon booking completion, you receive a non-exclusive, worldwide, royalty-free license to use the delivered content for your marketing and promotional purposes. This license does not grant exclusivity unless separately agreed in writing with the creator. You may not sublicense, resell, or claim ownership of the creator\u2019s content.',
  },
  {
    heading: '10. Prohibited Conduct',
    body:
      'You may not: (a) request personal contact information from creators outside the platform to circumvent Surve\u2019s payment system; (b) post fake or discriminatory listings; (c) withhold approval of satisfactory work to avoid payment; (d) harass or threaten creators; or (e) use the platform to collect personal data for purposes unrelated to the booking.',
  },
  {
    heading: '11. Account Termination',
    body:
      'Surve may suspend or terminate your business account for violations of this Agreement or the Terms of Service. Upon termination, any active bookings will be handled according to our dispute resolution process. Escrowed funds for unresolved bookings will be returned to you unless a dispute is resolved in the creator\u2019s favor.',
  },
  {
    heading: '12. Contact',
    body:
      'Questions about this Business Agreement can be sent to business@surve.app. Surve, Inc. is headquartered in San Francisco, California.',
  },
];

export default function BusinessTermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Business Agreement" />

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
          This agreement outlines the terms specific to businesses using the
          Surve platform to post collaboration listings and work with creators.
          It supplements our general Terms of Service.
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
