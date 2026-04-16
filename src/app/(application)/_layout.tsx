import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function ApplicationLayout() {
  const { colors } = useTheme();
  return (
    <ErrorBoundary homeRoute="/(tabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      >
        <Stack.Screen name="[listingId]" />
      </Stack>
    </ErrorBoundary>
  );
}
