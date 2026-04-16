import { Stack } from 'expo-router';
import { WizardProvider } from './_context';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function BusinessOnboardingLayout() {
  return (
    <ErrorBoundary homeRoute="/(tabs)">
      <WizardProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </WizardProvider>
    </ErrorBoundary>
  );
}
