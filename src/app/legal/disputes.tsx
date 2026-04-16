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
      'Surve holds every booking payment in escrow until the engagement is confirmed complete. This Refund & Dispute Resolution Policy explains how disagreements between creators and businesses are raised, reviewed, and resolved. It applies to every booking processed through the Surve platform and supplements our Terms of Service.',
  },
  {
    heading: '2. When You Can Open a Dispute',
    body:
      'Either party may open a dispute if the other side fails to fulfill the booking as agreed. Common reasons include: the creator did not attend the booking, the deliverables were not posted or fell short of what was agreed, the business denied the access or comp it promised, or the content quality materially differs from the creator\u2019s portfolio. Disputes must be opened within 7 days of the scheduled booking date.',
  },
  {
    heading: '3. How to Raise a Dispute',
    body:
      'Open the booking in the Bookings tab, tap "Report an issue," choose a reason, and submit a short written summary. Attach screenshots, links to posted content, delivery receipts, or any evidence that supports your claim. Once submitted, the booking is flagged and the funds stay locked in escrow until the case is resolved. Both parties are notified and can respond directly in the dispute thread.',
  },
  {
    heading: '4. The 72-Hour Response Window',
    body:
      'After a dispute is opened, the responding party has 72 hours to reply with their side of the story and any supporting evidence. If the responding party does not reply within 72 hours, the dispute auto-approves in favor of the party who opened it. Auto-approval releases the held funds according to the remedy requested — either a refund to the business or a payout to the creator — and the booking is closed.',
  },
  {
    heading: '5. Admin Review',
    body:
      'If both parties respond within 72 hours, the dispute moves to admin review. A Surve Trust & Safety specialist examines the booking timeline, in-app messages, delivered content, and any attached evidence. We may request additional information from either side; responses to those requests are due within 48 hours. Most admin reviews conclude within 5 business days of all evidence being collected.',
  },
  {
    heading: '6. Possible Outcomes',
    body:
      'After review, Surve will reach one of four decisions:\n\n(a) Release funds to the creator — the booking was delivered as agreed and the creator is paid in full, less the 5% platform fee.\n\n(b) Full refund to the business — the creator did not meet their obligations and the business is refunded in full, less any non-refundable processing costs disclosed at checkout.\n\n(c) Split resolution — the booking was partially delivered. Funds are divided proportionally between the creator and business based on the portion of the agreement actually fulfilled.\n\n(d) Cancellation with no penalty — the booking could not occur due to circumstances outside either party\u2019s control (for example, a verified emergency or venue closure). The business is refunded and no fault is recorded against the creator.',
  },
  {
    heading: '7. Chargebacks',
    body:
      'If a business initiates a chargeback through their card issuer instead of — or in addition to — using Surve\u2019s dispute flow, we will provide the issuer with the full booking record: agreement, messages, deliverables, and any prior Surve resolution. During a chargeback investigation the disputed amount is frozen. A chargeback filed after Surve has already ruled in the creator\u2019s favor may result in the business being suspended from the platform. Abusive chargeback behavior is grounds for permanent ban and referral to the card network.',
  },
  {
    heading: '8. Appeals',
    body:
      'Either party may appeal an admin decision once by emailing trust@surve.app within 14 days of the ruling. Appeals must include the booking ID and any new information that was not available during the original review. A different Trust & Safety specialist handles every appeal, and appeal decisions are final.',
  },
  {
    heading: '9. Good-Faith Participation',
    body:
      'We expect both parties to engage with the dispute process honestly. Fabricating evidence, coaching witnesses, taking a dispute to public social media to pressure the other party, or retaliating against a counterparty are all grounds for immediate suspension. Surve is a neutral facilitator — our goal is a fair outcome, not a winner.',
  },
  {
    heading: '10. Contact',
    body:
      'Questions about this policy can be sent to trust@surve.app. For urgent safety concerns, contact local emergency services first, then notify us so we can support the investigation.',
  },
];

export default function DisputesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Refund & Disputes" />

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
          This Refund & Dispute Resolution Policy describes how Surve handles
          disagreements between creators and businesses. Read it carefully — it
          controls what happens to your funds when a booking does not go as
          planned.
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
