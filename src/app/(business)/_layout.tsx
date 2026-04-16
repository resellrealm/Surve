import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function BusinessLayout() {
  const { colors } = useTheme();
  return (
    <ErrorBoundary homeRoute="/(tabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="[id]" />
        <Stack.Screen name="applicants" />
      </Stack>
    </ErrorBoundary>
  );
}
