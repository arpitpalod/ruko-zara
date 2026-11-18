import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { LanguageButton } from '../../components/LanguageButton';
import { TabIcon, type TabIconName } from '../../components/TabIcon';
import { useT } from '../../lib/i18n';
import { C } from '../../lib/theme';

const icon = (name: TabIconName) =>
  function Icon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <TabIcon name={name} focused={focused} color={color} />;
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
      <Tabs.Screen name="index" options={{ title: t('tab.feed'), headerTitle: 'Ruko Zara', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="new" options={{ title: t('tab.new'), headerTitle: t('tab.new'), tabBarIcon: icon('new') }} />
      <Tabs.Screen name="mine" options={{ title: t('tab.mine'), headerTitle: t('tab.mine'), tabBarIcon: icon('mine') }} />
    </Tabs>
  );
}
