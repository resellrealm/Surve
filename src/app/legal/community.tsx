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
    heading: '1. Be Respectful',
    body:
      'Treat every creator, business owner, and Surve team member the way you would want to be treated. Harassment, hate speech, slurs, threats of violence, doxxing, and targeted intimidation have no place on Surve. Disagreements happen — keep them civil, keep them in DMs where appropriate, and never attack someone for who they are, where they come from, or who they love.',
  },
  {
    heading: '2. Authenticity Matters',
    body:
      'Surve is built on trust between creators and businesses. Do not purchase fake followers, run bot engagement, or misrepresent your audience size, reach, or demographics. Social counts shown on your profile must reflect real, organic metrics from your connected accounts. We audit suspicious accounts and reserve the right to verify any analytics before releasing payouts.',
  },
  {
    heading: '3. Safety First',
    body:
      'Do not use Surve to promote, arrange, or distribute illegal content or services. This includes drugs, weapons, counterfeit goods, unlicensed gambling, and any form of human exploitation. Adult or sexually explicit content is not permitted on the platform or in booking deliverables. If a booking request makes you uncomfortable or feels unsafe, decline it and report it to us immediately.',
  },
  {
    heading: '4. Honesty in Deals',
    body:
      'Creators: deliver the content you agreed to, on the timeline you agreed to, at the quality level your portfolio represents. Businesses: pay the agreed rate on time, provide the access or comp you promised, and do not add unreasonable demands after a booking is accepted. Renegotiate openly through in-app messages — never strong-arm the other party after the fact.',
  },
  {
    heading: '5. Respect Intellectual Property',
    body:
      'Only post content you created or have permission to use. Do not copy another creator\u2019s videos, photos, captions, or branding. Do not use music, footage, or likenesses you have not licensed. Businesses may only repost creator deliverables under the license granted by the booking agreement — do not reuse content outside that scope without written permission from the creator.',
  },
  {
    heading: '6. Disputes Stay In-App',
    body:
      'If something goes wrong with a booking, open a dispute through Surve\u2019s in-app resolution flow within 7 days. Our team reviews evidence from both sides and makes a fair determination. Do not take disputes to public social media, do not brigade or pile on the other party\u2019s accounts, and do not encourage your audience to harass someone you disagree with. Retaliation of that kind is itself a guideline violation.',
  },
  {
    heading: '7. Reporting Violations',
    body:
      'See something off? Use the Report option on any profile, listing, booking, or message. Tell us what happened, attach screenshots if you have them, and include booking IDs when relevant. Our Trust & Safety team reviews every report, usually within 48 hours. We will follow up with the reporter when appropriate and always keep your identity confidential from the reported party.',
  },
  {
    heading: '8. What Happens After a Report',
    body:
      'We investigate every report in good faith. That can mean reviewing messages, listing details, delivered content, and linked social accounts. If we need more information we will reach out through in-app messages or the email on file. While a serious report is under review, we may temporarily pause the involved accounts or hold disputed payouts in escrow to protect the community.',
  },
  {
    heading: '9. Consequences',
    body:
      'We apply consequences proportional to the violation. A first-time, minor issue typically results in a written warning and guidance on how to avoid repeating it. Repeated or moderate violations lead to a temporary suspension — usually 7 to 30 days — during which you cannot accept bookings, send messages, or receive payouts. Severe or repeated abuse, fraud, harassment, illegal activity, or safety violations result in a permanent ban, forfeiture of pending payouts held against active disputes, and, where applicable, referral to law enforcement.',
  },
  {
    heading: '10. Appeals',
    body:
      'If you believe we got it wrong, you can appeal any enforcement action once by emailing trust@surve.app within 14 days of the decision. Include your account email, the action taken, and anything new we should consider. A different reviewer handles every appeal, and we aim to respond within 10 business days.',
  },
  {
    heading: '11. Contact Trust & Safety',
    body:
      'Urgent safety concerns can be sent to trust@surve.app. For anything involving imminent harm, contact your local emergency services first, then let us know so we can support the investigation.',
  },
];

export default function CommunityGuidelinesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Community Guidelines" />

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
          Surve works because creators and businesses trust each other. These
          guidelines set the baseline for how we behave on the platform — what
          is expected, what is off-limits, and what happens when someone
          crosses the line. They apply to every profile, listing, message,
          booking, and deliverable on Surve.
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
