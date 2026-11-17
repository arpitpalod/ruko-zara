import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { LanguageButton } from '../../components/LanguageButton';
import { useT } from '../../lib/i18n';
import { C } from '../../lib/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  const { t } = useT();
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
        headerRight: () => <LanguageButton />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.feed'), headerTitle: 'Ruko Zara ✋', tabBarIcon: icon('🏛️') }} />
      <Tabs.Screen name="new" options={{ title: t('tab.new'), headerTitle: t('tab.new'), tabBarIcon: icon('✍️') }} />
      <Tabs.Screen name="mine" options={{ title: t('tab.mine'), headerTitle: t('tab.mine'), tabBarIcon: icon('👛') }} />
    </Tabs>
  );
}
