import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LanguageButton } from '../components/LanguageButton';
import { LanguageProvider, useT } from '../lib/i18n';
import { SessionProvider } from '../lib/session';
import { C } from '../lib/theme';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Nav />
      </SessionProvider>
    </LanguageProvider>
  );
}

function Nav() {
  const { t } = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.bg },
        headerRight: () => <LanguageButton />,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="request/[id]" options={{ title: t('title.request') }} />
      <Stack.Screen name="login" options={{ title: t('title.login'), presentation: 'modal' }} />
    </Stack>
  );
}
