import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaptchaHost } from '../components/CaptchaHost';
import { LanguageButton } from '../components/LanguageButton';
import { LanguageProvider, useT } from '../lib/i18n';
import { SessionProvider } from '../lib/session';
import { C } from '../lib/theme';

// Opening a shared link (/request/<id>) puts the feed underneath, so there's always a back button to it.
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Nav />
      </SessionProvider>
      <CaptchaHost />
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
