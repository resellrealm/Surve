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
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
