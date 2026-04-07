import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createMMKV } from 'react-native-mmkv';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Colors } from '../constants/theme';
import { ToastProvider } from '../components/ui/Toast';
import { Onboarding } from '../components/ui/Onboarding';
import type { User, Session } from '../types';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

const storage = createMMKV({ id: 'surve-app' });
const ONBOARDING_KEY = 'onboarding_complete';

function mapSession(session: SupabaseSession | null): Session | null {
  if (!session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? 0,
    user: mapUser(session.user)!,
  };
}

function mapUser(supaUser: SupabaseSession['user'] | undefined | null): User | null {
  if (!supaUser) return null;
  return {
    id: supaUser.id,
    email: supaUser.email ?? '',
    full_name: (supaUser.user_metadata?.full_name as string) ?? null,
    avatar_url: (supaUser.user_metadata?.avatar_url as string) ?? null,
    created_at: supaUser.created_at ?? '',
    updated_at: supaUser.updated_at ?? '',
  };
}

export default function RootLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const { setSession, setUser, setAuthLoading, session } = useStore();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding has been completed
    const onboardingDone = storage.getBoolean(ONBOARDING_KEY) ?? false;
    if (!onboardingDone) {
      setShowOnboarding(true);
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(mapSession(session));
      setUser(mapUser(session?.user ?? null));
      setAuthLoading(false);
      setReady(true);
    }).catch((err) => {
      console.error('Failed to get session:', err);
      setAuthLoading(false);
      setReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(mapSession(session));
      setUser(mapUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = () => {
    storage.set(ONBOARDING_KEY, true);
    setShowOnboarding(false);
  };

  if (!ready) return null;

  // Show onboarding after auth is ready but before the app, only if user is logged in
  // If not logged in, they'll see auth first, then onboarding after login
  if (showOnboarding && session) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Onboarding onComplete={handleOnboardingComplete} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
              name="(survey)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="friends"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="history"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
