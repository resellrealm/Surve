import { useEffect, useCallback, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text, StyleSheet, Platform, AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { AlertTriangle, X } from 'lucide-react-native';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { initSentry, setSentryUser, addNavigationBreadcrumb } from '../lib/sentry';
import { logError } from '../lib/logger';

initSentry();
import { useHaptics } from '../hooks/useHaptics';
import { Colors, Typography, Spacing, BorderRadius, Springs } from '../constants/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { ToastContainer } from '../components/ui/Toast';
import { PushBanner } from '../components/ui/PushBanner';
import { PressableScale } from '../components/ui/PressableScale';
import { MilestoneProvider } from '../hooks/useMilestones';

SplashScreen.preventAutoHideAsync();

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LOGO_REVEAL_DURATION = 600;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const {
    setUser,
    setSession,
    setAuthLoading,
    setInitialized,
    fetchListings,
    fetchBookings,
    fetchConversations,
    user,
    initialized,
    lastActivityAt,
    touchActivity,
    logout,
  } = useStore();

  useEffect(() => {
    // Restore session on mount
    const restoreSession = async () => {
      setAuthLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Fetch user profile from our users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            const appUser = {
              id: userData.id,
              email: userData.email ?? session.user.email ?? '',
              full_name: userData.full_name,
              username: userData.username ?? null,
              bio: userData.bio ?? null,
              location: userData.location ?? null,
              avatar_url: userData.avatar_url,
              role: userData.role as 'creator' | 'business',
              onboarding_completed_at: userData.onboarding_completed_at ?? null,
              email_verified_at: userData.email_verified_at ?? null,
              phone: userData.phone ?? null,
              phone_verified_at: userData.phone_verified_at ?? null,
              accepted_terms_at: userData.accepted_terms_at ?? null,
              terms_version: userData.terms_version ?? null,
              milestones: userData.milestones ?? {},
              created_at: userData.created_at,
              updated_at: userData.updated_at,
            };
            setUser(appUser);
            setSentryUser({ id: appUser.id, email: appUser.email });
            setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at ?? 0,
              user: appUser,
            });
          }
        }
      } catch (e) {
        logError('Session restore error', e);
      } finally {
        setAuthLoading(false);
        setInitialized(true);
      }
    };

    restoreSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setSession(null);
          setSentryUser(null);
          return;
        }

        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            const appUser = {
              id: userData.id,
              email: userData.email ?? session.user.email ?? '',
              full_name: userData.full_name,
              username: userData.username ?? null,
              bio: userData.bio ?? null,
              location: userData.location ?? null,
              avatar_url: userData.avatar_url,
              role: userData.role as 'creator' | 'business',
              onboarding_completed_at: userData.onboarding_completed_at ?? null,
              email_verified_at: userData.email_verified_at ?? null,
              phone: userData.phone ?? null,
              phone_verified_at: userData.phone_verified_at ?? null,
              accepted_terms_at: userData.accepted_terms_at ?? null,
              terms_version: userData.terms_version ?? null,
              milestones: userData.milestones ?? {},
              created_at: userData.created_at,
              updated_at: userData.updated_at,
            };
            setUser(appUser);
            setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at ?? 0,
              user: appUser,
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setAuthLoading, setInitialized]);

  const router = useRouter();
  const segments = useSegments();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Onboarding redirect gate
  useEffect(() => {
    if (!initialized || !user) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user.onboarding_completed_at && !inAuthGroup && !inOnboarding) {
      addNavigationBreadcrumb(`/onboarding/${user.role}`, 'redirect', { reason: 'onboarding_incomplete' });
      router.replace(`/onboarding/${user.role}` as any);
    }
  }, [initialized, user, segments, router]);

  // Fetch data when user is available
  useEffect(() => {
    if (user && initialized) {
      fetchListings();
      fetchBookings();
      fetchConversations();
    }
  }, [user?.id, initialized, fetchListings, fetchBookings, fetchConversations]);

  // Badge count: increment on receive, clear on foreground
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(async () => {
      const current = await Notifications.getBadgeCountAsync();
      await Notifications.setBadgeCountAsync(current + 1);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Notifications.setBadgeCountAsync(0);
      }
    });

    return () => {
      receivedSub.remove();
      appStateSub.remove();
    };
  }, []);

  // Session timeout: auto-logout after 30 minutes of inactivity
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!user) return;

    const checkTimeout = () => {
      const idle = Date.now() - useStore.getState().lastActivityAt;
      if (idle >= SESSION_TIMEOUT_MS) {
        addNavigationBreadcrumb('/auth/login', 'timeout', { idle_ms: idle });
        logout();
        router.replace('/auth/login' as any);
      }
    };

    const interval = setInterval(checkTimeout, 60_000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkTimeout();
        touchActivity();
      }
      appStateRef.current = nextState;
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [user, logout, touchActivity, router]);

  // Track navigation changes via Sentry breadcrumbs
  const prevSegmentsRef = useRef<string[]>([]);
  useEffect(() => {
    const route = '/' + segments.join('/');
    const prev = '/' + prevSegmentsRef.current.join('/');
    if (route !== prev) {
      addNavigationBreadcrumb(route, 'user', { from: prev });
      prevSegmentsRef.current = [...segments];
    }
  }, [segments]);

  // Touch activity on every navigation change
  useEffect(() => {
    if (user) touchActivity();
  }, [segments, user, touchActivity]);

  // Route when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      Notifications.setBadgeCountAsync(0);
      const data = resp.notification.request.content.data as
        | { path?: string; booking_id?: string; conversation_id?: string }
        | undefined;
      if (!data) return;
      if (data.path) {
        addNavigationBreadcrumb(data.path, 'push_notification');
        router.push(data.path as never);
      } else if (data.conversation_id) {
        addNavigationBreadcrumb(`/(chat)/${data.conversation_id}`, 'push_notification');
        router.push(`/(chat)/${data.conversation_id}`);
      } else if (data.booking_id) {
        addNavigationBreadcrumb(`/(booking)/${data.booking_id}`, 'push_notification');
        router.push(`/(booking)/${data.booking_id}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  // Deep link handler: surve://booking/:id, surve://creator/:id, etc.
  const handleDeepLink = useCallback(
    (url: string) => {
      const parsed = Linking.parse(url);
      const pathSegments = parsed.path?.split('/').filter(Boolean) ?? [];
      if (pathSegments.length < 2) return;

      const [resource, id] = pathSegments;
      const routeMap: Record<string, string> = {
        booking: '/(booking)/',
        creator: '/(creator)/',
        listing: '/(listing)/',
        chat: '/(chat)/',
        review: '/(review)/',
      };

      const prefix = routeMap[resource];
      if (prefix && id) {
        addNavigationBreadcrumb(`${prefix}${id}`, 'deeplink', { resource, url });
        router.push(`${prefix}${id}` as never);
      }
    },
    [router],
  );

  useEffect(() => {
    // Handle link that launched the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle links while the app is open (warm)
    const sub = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => sub.remove();
  }, [handleDeepLink]);

  // Register push token if permission already granted (banner in home screen handles the ask)
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
        });
      }
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await supabase.from('users').update({ expo_push_token: token }).eq('id', user.id);
    })();
  }, [user?.id]);

  const [logoRevealDone, setLogoRevealDone] = useState(false);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const finishReveal = useCallback(() => {
    setLogoRevealDone(true);
  }, []);

  useEffect(() => {
    if (!initialized || !fontsLoaded) return;

    SplashScreen.hideAsync().then(() => {
      logoOpacity.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
      logoScale.value = withSpring(1, { damping: 18, stiffness: 260, mass: 0.8 });

      const fadeOutDelay = setTimeout(() => {
        overlayOpacity.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) }, () => {
          runOnJS(finishReveal)();
        });
      }, LOGO_REVEAL_DURATION - 250);

      return () => clearTimeout(fadeOutDelay);
    });
  }, [initialized, fontsLoaded]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!initialized || !fontsLoaded) return null;

  const showEmailBanner =
    user &&
    !user.email_verified_at &&
    !bannerDismissed &&
    new Date(user.created_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;

  return (
    <ErrorBoundary>
    <StripeProvider publishableKey={STRIPE_KEY}>
    <MilestoneProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
      {showEmailBanner && (
        <EmailVerificationBanner
          colors={colors}
          onDismiss={() => setBannerDismissed(true)}
          onVerify={() => router.push('/auth/verify-email' as any)}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="(listing)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(creator)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(chat)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(booking)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(review)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="legal"
          options={{ headerShown: false }}
        />
      </Stack>
      <ToastContainer />
      <PushBanner />
      {!logoRevealDone && (
        <Animated.View style={[splashStyles.overlay, overlayAnimatedStyle]} pointerEvents="none">
          <Animated.View style={logoAnimatedStyle}>
            <Image
              source={require('../../assets/logo.png')}
              style={splashStyles.logo}
              contentFit="contain"
              accessibilityRole="image"
              accessibilityLabel="Surve logo"
            />
          </Animated.View>
        </Animated.View>
      )}
    </GestureHandlerRootView>
    </MilestoneProvider>
    </StripeProvider>
    </ErrorBoundary>
  );
}

function EmailVerificationBanner({
  colors,
  onDismiss,
  onVerify,
}: {
  colors: typeof Colors.light | typeof Colors.dark;
  onDismiss: () => void;
  onVerify: () => void;
}) {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  return (
    <View
      style={[
        bannerStyles.container,
        {
          backgroundColor: colors.warningLight,
          borderBottomColor: colors.warning,
          paddingTop: insets.top + Spacing.lg,
        },
      ]}
    >
      <View style={bannerStyles.content}>
        <AlertTriangle size={18} color={colors.warning} strokeWidth={2} />
        <PressableScale scaleValue={0.98} onPress={() => { haptics.confirm(); onVerify(); }} style={bannerStyles.textContainer} accessibilityRole="button" accessibilityLabel="Verify your email" accessibilityHint="Tap to verify your email address">
          <Text style={[bannerStyles.text, { color: colors.text }]}>
            Verify your email
          </Text>
          <Text style={[bannerStyles.subtext, { color: colors.textSecondary }]}>
            Tap to verify your email address
          </Text>
        </PressableScale>
        <PressableScale scaleValue={0.9} onPress={() => { haptics.tap(); onDismiss(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss email verification banner">
          <X size={18} color={colors.textTertiary} strokeWidth={2} />
        </PressableScale>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111d4a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logo: {
    width: 120,
    height: 120,
  },
});

const bannerStyles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  subtext: {
    ...Typography.caption1,
  },
});
