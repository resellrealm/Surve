import { Stack } from 'expo-router';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function CreatorOnboardingLayout() {
  return (
    <ErrorBoundary homeRoute="/(tabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </ErrorBoundary>
  );
}
