import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ONBOARDING_INTRO_SEEN_KEY } from './onboarding-intro';

export default function AuthIndex() {
  const [checked, setChecked] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_INTRO_SEEN_KEY).then((val) => {
      setSeen(val === '1');
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111d4a' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!seen) {
    return <Redirect href="/auth/onboarding-intro" />;
  }

  return <Redirect href="/auth/login" />;
}
