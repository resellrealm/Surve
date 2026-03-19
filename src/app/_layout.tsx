import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStore } from '../lib/store';
import { Colors } from '../constants/theme';
import {
  mockListings,
  mockBookings,
  mockConversations,
  mockBusinessConversations,
} from '../lib/mockData';

export default function RootLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const { setListings, setBookings, setConversations, user } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load mock data into store
    setListings(mockListings);
    setBookings(mockBookings);
    setConversations(
      user?.role === 'business' ? mockBusinessConversations : mockConversations
    );
    setReady(true);
  }, [setListings, setBookings, setConversations, user?.role]);

  if (!ready) return null;

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
