import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CaptchaHost } from '../components/CaptchaHost';
import { AllRequestsButton } from '../components/AllRequestsButton';
import { LanguageButton } from '../components/LanguageButton';
import { arrivedOn } from '../lib/entry';
import { Logo, LogoFontReady, useLoadLogoFont } from '../components/Logo';
import { LanguageProvider, useT } from '../lib/i18n';
import { SessionProvider } from '../lib/session';
import { M, T } from '../lib/theme';

// Opening a shared link (/request/<id>) puts the feed underneath, so there's always a back button to it.
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const logoFont = useLoadLogoFont(); // never blocks: the name uses the system font until it's in
  return (
    <LogoFontReady.Provider value={logoFont}>
    <LanguageProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Nav />
      </SessionProvider>
      <CaptchaHost />
    </LanguageProvider>
    </LogoFontReady.Provider>
  );
}

function Nav() {
  const { t } = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: M.surface },
        headerTintColor: M.onSurface,
        headerTitleStyle: T.titleLarge,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: M.surface },
        headerRight: () => <LanguageButton />,
        headerTitle: () => <Logo size={20} />, // the logo on every page; `title` still names the browser tab
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="request/[id]"
        options={({ route }) =>
          arrivedOn(String((route.params as { id?: string } | undefined)?.id ?? ''))
            ? { title: t('title.request'), headerTitle: () => null, headerLeft: () => <AllRequestsButton /> } // shared link: the card below carries the logo
            : { title: t('title.request') }
        }
      />
      <Stack.Screen name="login" options={{ title: t('title.login'), presentation: 'modal' }} />
      <Stack.Screen name="hidden" options={{ title: t('title.hidden') }} />
    </Stack>
  );
}
