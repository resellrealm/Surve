import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          gestureEnabled: false,
        }}
      />
    </ErrorBoundary>
  );
}
