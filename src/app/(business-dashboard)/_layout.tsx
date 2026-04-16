import { Stack } from 'expo-router';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function BusinessDashboardLayout() {
  return (
    <ErrorBoundary homeRoute="/(tabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ErrorBoundary>
  );
}
