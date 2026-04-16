import { Stack } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';

export default function BusinessOnboardingLayout() {
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
      <Stack.Screen name="hours" />
      <Stack.Screen name="details" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
