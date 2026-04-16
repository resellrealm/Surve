import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Prompt for biometric auth (Face ID / Touch ID / device credential) before a
 * sensitive action. Returns true if the device has no biometrics enrolled or
 * the user authenticated successfully. Returns false if they cancelled or
 * the check failed — caller decides whether to block the action.
 */
export async function requireBiometric(
  reason: string
): Promise<{ ok: boolean; skipped: boolean }> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { ok: true, skipped: true };
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { ok: true, skipped: true };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return { ok: result.success, skipped: false };
}
