import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { LanguageButton } from '../../components/LanguageButton';
import { useT } from '../../lib/i18n';
import { C } from '../../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) =>
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? on : off} size={23} color={color as string} />;
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
      <Tabs.Screen name="index" options={{ title: t('tab.feed'), headerTitle: 'Ruko Zara', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="new" options={{ title: t('tab.new'), headerTitle: t('tab.new'), tabBarIcon: icon('add-circle', 'add-circle-outline') }} />
      <Tabs.Screen name="mine" options={{ title: t('tab.mine'), headerTitle: t('tab.mine'), tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
