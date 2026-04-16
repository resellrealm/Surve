import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PermissionKind = 'notifications' | 'camera' | 'photo-library';

const STORE_PREFIX = 'surve_perm_prime_';

function storeKey(kind: PermissionKind) {
  return `${STORE_PREFIX}${kind}`;
}

async function isAlreadyGranted(kind: PermissionKind): Promise<boolean> {
  switch (kind) {
    case 'notifications': {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    }
    case 'camera': {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      return status === 'granted';
    }
    case 'photo-library': {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  }
}

async function requestNative(kind: PermissionKind): Promise<boolean> {
  switch (kind) {
    case 'notifications': {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    }
    case 'camera': {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    case 'photo-library': {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  }
}

export function usePermissionPrime(kind: PermissionKind) {
  const [visible, setVisible] = useState(false);
  const [onGrantRef, setOnGrantRef] = useState<{ cb: (() => void) | null }>({ cb: null });

  const show = useCallback(
    (onGrant?: () => void) => {
      setOnGrantRef({ cb: onGrant ?? null });
      setVisible(true);
    },
    [],
  );

  const dismiss = useCallback(async () => {
    setVisible(false);
    setOnGrantRef({ cb: null });
    await SecureStore.setItemAsync(storeKey(kind), 'declined');
  }, [kind]);

  const confirm = useCallback(async () => {
    setVisible(false);
    const granted = await requestNative(kind);
    if (granted) {
      onGrantRef.cb?.();
    }
    setOnGrantRef({ cb: null });
    return granted;
  }, [kind, onGrantRef]);

  const prime = useCallback(
    async (onGrant: () => void): Promise<void> => {
      const granted = await isAlreadyGranted(kind);
      if (granted) {
        onGrant();
        return;
      }
      if (Platform.OS === 'android') {
        const result = await requestNative(kind);
        if (result) onGrant();
        return;
      }
      const declined = await SecureStore.getItemAsync(storeKey(kind));
      if (declined) {
        const result = await requestNative(kind);
        if (result) onGrant();
        return;
      }
      show(onGrant);
    },
    [kind, show],
  );

  return { visible, prime, confirm, dismiss };
}
