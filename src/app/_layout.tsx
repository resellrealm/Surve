import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
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
              avatar_url: userData.avatar_url,
              role: userData.role as 'creator' | 'business',
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
      } catch (e) {
        console.error('Session restore error:', e);
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
              avatar_url: userData.avatar_url,
              role: userData.role as 'creator' | 'business',
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

  // Fetch data when user is available
  useEffect(() => {
    if (user && initialized) {
      fetchListings();
      fetchBookings();
      fetchConversations();
    }
  }, [user?.id, initialized, fetchListings, fetchBookings, fetchConversations]);

  if (!initialized) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
      </Stack>
    </GestureHandlerRootView>
  );
}
