import { Tabs, Redirect } from 'expo-router';
import { useStore } from '../../lib/store';
import { CustomTabBar } from '../../components/ui/TabBar';

export default function TabLayout() {
  const { session } = useStore();

  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="sports" options={{ title: 'Discover' }} />
      <Tabs.Screen name="responses" options={{ title: 'Responses' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
