import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '../../lib/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.sub,
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: C.line },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Chaupal', headerTitle: 'Ruko Zara ✋', tabBarIcon: icon('🏛️') }} />
      <Tabs.Screen name="new" options={{ title: 'Nayi Arzi', headerTitle: 'Nayi Arzi', tabBarIcon: icon('✍️') }} />
      <Tabs.Screen name="mine" options={{ title: 'Meri Arzi', headerTitle: 'Meri Arzi', tabBarIcon: icon('👛') }} />
    </Tabs>
  );
}
