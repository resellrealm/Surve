import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,

} from 'react-native-reanimated';
import {
  ChevronDown,
  CreditCard,
  RotateCcw,
  User,
  Calendar,
  Bug,
  MoreHorizontal,
  Mail,
  MessageSquare,
  CheckCircle,
  Search,
  Shield,
  HelpCircle,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import {
  Typography,
  Spacing,
  BorderRadius,
  Springs,
} from '../../constants/theme';

type Category = 'payment' | 'refund' | 'account' | 'booking' | 'bug' | 'other';

const CATEGORIES: {
  key: Category;
  label: string;
  Icon: typeof CreditCard;
}[] = [
  { key: 'payment', label: 'Payments', Icon: CreditCard },
  { key: 'refund', label: 'Refunds', Icon: RotateCcw },
  { key: 'account', label: 'Account', Icon: User },
  { key: 'booking', label: 'Bookings', Icon: Calendar },
  { key: 'bug', label: 'Bug report', Icon: Bug },
  { key: 'other', label: 'Other', Icon: MoreHorizontal },
];

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  Icon: typeof CreditCard;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Payments & Billing',
    Icon: CreditCard,
    items: [
      {
        q: 'How does escrow work?',
        a: 'Your payment is held by Stripe until both sides approve the deliverable. If the creator submits proof and neither party disputes, funds auto-release to the creator 72 hours later. If you raise a dispute, the funds stay held until it is resolved.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are issued to Stripe within seconds. They land back on your card in 5–10 business days depending on your bank. You will get a notification once the transfer settles.',
      },
      {
        q: 'When can I request a refund?',
        a: 'Business users can refund any booking before the content is approved — pending, accepted, in progress, awaiting proof, or disputed. Once you approve the proof and pay the creator, refunds go through dispute resolution instead.',
      },
      {
        q: 'Why does the creator need Stripe Connect?',
        a: 'Creators get paid directly from your payment through Stripe Connect. They need to verify their identity with Stripe once — takes about 2 minutes — before they can receive payouts.',
      },
      {
        q: 'What is the platform fee?',
        a: 'Surve charges a 5% platform fee on each booking. This is calculated on the listing price and shown on the checkout screen before you confirm payment.',
      },
    ],
  },
  {
    title: 'Bookings & Creators',
    Icon: Calendar,
    items: [
      {
        q: 'What happens if a creator never delivers?',
        a: 'If the deadline passes without proof being submitted, you can cancel and refund the booking from the booking detail screen — funds return to your card automatically.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'You can cancel any booking that has not been completed. Pending and accepted bookings can be cancelled with a full refund. In-progress bookings may be subject to partial refund depending on the work already done.',
      },
      {
        q: 'How do I approve or dispute a deliverable?',
        a: 'When a creator submits proof, you will see it on the booking detail screen. Tap "Approve" to release payment, or "Dispute" to flag an issue. Disputed bookings enter mediation and funds remain in escrow.',
      },
      {
        q: 'How do I find the right creator?',
        a: 'Use the Search tab to filter creators by platform (TikTok, Instagram), follower count, engagement rate, content niche, and location. You can also save searches to revisit later.',
      },
    ],
  },
  {
    title: 'Account & Security',
    Icon: Shield,
    items: [
      {
        q: 'Is two-factor authentication required?',
        a: 'It is optional but strongly recommended for both sides. Enable it from Account → Two-factor authentication with any TOTP app (Google Authenticator, Authy, 1Password).',
      },
      {
        q: 'How do I delete my account?',
        a: 'Account → Privacy & Data → Delete account. This is permanent — all your listings, bookings in pending states, and profile data are removed. Completed bookings stay on record for accounting/compliance.',
      },
      {
        q: 'How do I change my email or password?',
        a: 'Go to Profile → Account to update your email or password. Email changes require verification of the new address. Password changes require your current password.',
      },
      {
        q: 'Is my data secure?',
        a: 'All data is encrypted in transit (TLS) and at rest. Payment information is handled by Stripe and never stored on our servers. We follow industry-standard security practices and conduct regular audits.',
      },
    ],
  },
  {
    title: 'General',
    Icon: HelpCircle,
    items: [
      {
        q: 'How do I switch between Creator and Business mode?',
        a: 'Currently, your role is set during onboarding and cannot be changed. If you need both roles, create a separate account for each. Multi-role support is coming soon.',
      },
      {
        q: 'How do notifications work?',
        a: 'You receive push notifications for booking updates, new messages, and payment events. Customize which notifications you receive in Profile → Preferences → Notifications.',
      },
      {
        q: 'What platforms do creators connect?',
        a: 'Creators can connect their TikTok and Instagram accounts to showcase their reach and engagement metrics. This helps businesses find the right creator for their campaign.',
      },
    ],
  },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [category, setCategory] = useState<Category | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set([0])
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
      ),
    })).filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const totalResults = useMemo(
    () => filteredSections.reduce((sum, s) => sum + s.items.length, 0),
    [filteredSections]
  );

  const canSubmit = useMemo(
    () =>
      category !== null &&
      subject.trim().length > 0 &&
      message.trim().length > 10 &&
      !submitting,
    [category, subject, message, submitting]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user || !category) return;
    haptics.confirm();
    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      user_email: user.email,
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      haptics.error();
      toast.error(`Could not send: ${error.message || 'Please try again.'}`);
      return;
    }
    haptics.success();
    setSubmitted(true);
  }, [canSubmit, category, haptics, message, subject, user]);

  const toggleFaq = useCallback(
    (key: string) => {
      haptics.select();
      setOpenFaq((prev) => (prev === key ? null : key));
    },
    [haptics]
  );

  const toggleSection = useCallback(
    (index: number) => {
      haptics.tap();
      setOpenSections((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [haptics]
  );

  const emailSupport = useCallback(() => {
    haptics.tap();
    Linking.openURL('mailto:support@surve.app?subject=Surve%20Support');
  }, [haptics]);

  const clearSearch = useCallback(() => {
    haptics.tap();
    setSearchQuery('');
  }, [haptics]);

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Help & Support" />
        <View style={styles.centered}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <CheckCircle size={72} color={colors.success} strokeWidth={1.5} />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(100)}
            style={[styles.successTitle, { color: colors.text }]}
          >
            We're on it
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(200)}
            style={[styles.successBody, { color: colors.textSecondary }]}
          >
            Your ticket is in. We'll reply within 24 hours to {user?.email}.
          </Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Help & Support" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.huge,
          gap: Spacing.xl,
        }}
      >
        {/* Search */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={18} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search help articles…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              accessibilityLabel="Search help articles"
            />
            {searchQuery.length > 0 && (
              <PressableScale
                onPress={clearSearch}
                scaleValue={0.9}
                hitSlop={8}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={16} color={colors.textTertiary} strokeWidth={2} />
              </PressableScale>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text
              style={[styles.searchResultCount, { color: colors.textSecondary }]}
            >
              {totalResults} {totalResults === 1 ? 'result' : 'results'} found
            </Text>
          )}
        </Animated.View>

        {/* FAQ Sections */}
        {filteredSections.length > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(400).delay(50)}
            style={{ gap: Spacing.md }}
          >
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              FREQUENTLY ASKED
            </Text>
            {filteredSections.map((section, sectionIndex) => {
              const actualIndex = FAQ_SECTIONS.indexOf(
                FAQ_SECTIONS.find((s) => s.title === section.title)!
              );
              const isOpen = searchQuery.length > 0 || openSections.has(actualIndex);
              return (
                <Card key={section.title} padding={0}>
                  <SectionHeader
                    title={section.title}
                    Icon={section.Icon}
                    open={isOpen}
                    count={section.items.length}
                    onToggle={() => toggleSection(actualIndex)}
                  />
                  {isOpen &&
                    section.items.map((item, itemIndex) => {
                      const faqKey = `${section.title}-${itemIndex}`;
                      return (
                        <FaqRow
                          key={faqKey}
                          q={item.q}
                          a={item.a}
                          open={openFaq === faqKey}
                          onToggle={() => toggleFaq(faqKey)}
                          isLast={itemIndex === section.items.length - 1}
                          query={searchQuery}
                        />
                      );
                    })}
                </Card>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.emptyState}
          >
            <HelpCircle size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No results found
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Try a different search term or send us a message below.
            </Text>
          </Animated.View>
        )}

        {/* Contact form */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={{ gap: Spacing.md }}
        >
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            STILL STUCK? CONTACT US
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Topic</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <PressableScale
                  key={c.key}
                  onPress={() => {
                    haptics.tap();
                    setCategory(c.key);
                  }}
                  scaleValue={0.93}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label} topic`}
                  accessibilityState={{ selected: active }}
                >
                  <c.Icon
                    size={16}
                    color={active ? colors.onPrimary : colors.text}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? colors.onPrimary : colors.text },
                    ]}
                  >
                    {c.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <Card style={{ gap: Spacing.sm }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              placeholderTextColor={colors.textTertiary}
              maxLength={120}
              accessibilityLabel="Support ticket subject"
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Message
            </Text>
            <TextInput
              value={message}
              onChangeText={(t) => t.length <= 2000 && setMessage(t)}
              placeholder="Tell us what's happening. Include screenshots via email if relevant."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              accessibilityLabel="Support ticket message"
              accessibilityHint="Describe your issue in detail, up to 2000 characters"
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            />
            <Text
              style={[
                styles.charCounter,
                {
                  color:
                    message.length >= 2000
                      ? colors.error
                      : colors.textTertiary,
                },
              ]}
            >
              {message.length}/2000
            </Text>
          </Card>

          <Button
            title={submitting ? 'Sending…' : 'Send ticket'}
            onPress={handleSubmit}
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            icon={
              <MessageSquare
                size={18}
                color={colors.onPrimary}
                strokeWidth={2}
              />
            }
            accessibilityLabel="Send support ticket"
            accessibilityHint="Submits your support request to the Surve team"
          />

          <PressableScale onPress={emailSupport} style={styles.emailLink} scaleValue={0.96} accessibilityRole="link" accessibilityLabel="Email support at support@surve.app">
            <Mail size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.emailLinkText, { color: colors.textSecondary }]}>
              Prefer email? support@surve.app
            </Text>
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({
  title,
  Icon,
  open,
  count,
  onToggle,
}: {
  title: string;
  Icon: typeof CreditCard;
  open: boolean;
  count: number;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const rotation = useSharedValue(open ? 1 : 0);

  React.useEffect(() => {
    rotation.value = withSpring(open ? 1 : 0, Springs.snappy);
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <PressableScale onPress={onToggle} style={styles.sectionHeaderRow} accessibilityRole="button" accessibilityLabel={`${title} section, ${count} items`} accessibilityState={{ expanded: open }}>
      <View
        style={[
          styles.sectionIconWrap,
          { backgroundColor: colors.activeLight },
        ]}
      >
        <Icon size={16} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
        {title}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
        {count}
      </Text>
      <Animated.View style={chevronStyle}>
        <ChevronDown size={18} color={colors.textTertiary} strokeWidth={2} />
      </Animated.View>
    </PressableScale>
  );
}

function FaqRow({
  q,
  a,
  open,
  onToggle,
  isLast,
  query,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  isLast: boolean;
  query: string;
}) {
  const { colors } = useTheme();
  const rotation = useSharedValue(open ? 1 : 0);

  React.useEffect(() => {
    rotation.value = withSpring(open ? 1 : 0, Springs.snappy);
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <View>
      <PressableScale onPress={onToggle} style={styles.faqHeader} accessibilityRole="button" accessibilityLabel={q} accessibilityState={{ expanded: open }}>
        <Text style={[styles.faqQuestion, { color: colors.text }]}>
          {highlightText(q, query, colors.primary)}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={16} color={colors.textTertiary} strokeWidth={2} />
        </Animated.View>
      </PressableScale>
      {open && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={styles.faqBody}
        >
          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
            {highlightText(a, query, colors.primary)}
          </Text>
        </Animated.View>
      )}
      {!isLast && (
        <View
          style={[
            styles.faqSeparator,
            { backgroundColor: colors.borderLight },
          ]}
        />
      )}
    </View>
  );
}

function highlightText(
  text: string,
  query: string,
  highlightColor: string
): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text key={i} style={{ color: highlightColor, fontWeight: '700' }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </>
  );
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  successTitle: { ...Typography.title1, textAlign: 'center' },
  successBody: { ...Typography.body, textAlign: 'center' },
  sectionLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minHeight: 44,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? Spacing.xs : 0,
  },
  clearButton: {
    padding: Spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultCount: {
    ...Typography.footnote,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    ...Typography.headline,
    flex: 1,
  },
  sectionCount: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headline,
  },
  emptyBody: {
    ...Typography.footnote,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  fieldLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
  },
  categoryChipText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  inputMultiline: {
    minHeight: 140,
  },
  charCounter: {
    ...Typography.caption1,
    textAlign: 'right',
  },
  emailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  emailLinkText: {
    ...Typography.footnote,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingLeft: Spacing.lg + Spacing.md,
    minHeight: 44,
  },
  faqQuestion: {
    ...Typography.subheadline,
    fontWeight: '600',
    flex: 1,
  },
  faqBody: {
    paddingHorizontal: Spacing.md,
    paddingLeft: Spacing.lg + Spacing.md,
    paddingBottom: Spacing.md,
  },
  faqAnswer: {
    ...Typography.footnote,
    lineHeight: 20,
  },
  faqSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + Spacing.md,
  },
});
