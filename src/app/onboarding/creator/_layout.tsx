import { Stack } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';

export default function CreatorOnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="socials" />
      <Stack.Screen name="followers" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="stripe-connect" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
