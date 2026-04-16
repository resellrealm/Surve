import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding-intro" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="verify-email" />
      </Stack>
    </ErrorBoundary>
  );
}
