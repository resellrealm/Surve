import { Stack } from 'expo-router';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function PaymentLayout() {
  return (
    <ErrorBoundary homeRoute="/(tabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </ErrorBoundary>
  );
}
