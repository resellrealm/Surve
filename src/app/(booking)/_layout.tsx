import { Stack } from 'expo-router';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function BookingLayout() {
  return (
    <ErrorBoundary homeRoute="/(tabs)/bookings">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </ErrorBoundary>
  );
}
