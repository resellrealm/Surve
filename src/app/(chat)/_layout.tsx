import { Stack } from 'expo-router';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function ChatLayout() {
  return (
    <ErrorBoundary homeRoute="/(tabs)/messages">
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
