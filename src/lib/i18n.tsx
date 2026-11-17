import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C } from './theme';

/**
 * All app text lives here — one dictionary per language, same keys.
 * To change wording: edit the line in the right language and push; the apps update automatically.
 * TypeScript refuses to build if a language is missing a key.
 */

export type Lang = 'en' | 'hi' | 'hinglish';

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'hinglish', label: 'Hinglish' },
];

const en = {
  'tab.feed': 'Feed',
  'tab.new': 'New request',
  'tab.mine': 'My requests',
  'title.request': 'Request',
  'title.login': 'Login',

  'conn.error': "Couldn't connect: {err}",
  'conn.retry': 'Try again',

  'feed.tagline': 'Ask the crowd before you buy.',
  'feed.demo': 'Demo mode · data stays on this device',
  'feed.empty': 'No requests yet. Post the first one! ✍️',

  'card.you': ' (you)',
  'card.cheaper': '💡 Cheaper option: {alt}',
  'card.yes': 'Buy it 👍',
  'card.no': 'Skip it 👎',
  'card.skipped': "🎉 Didn't buy — saved {amt}",
  'card.bought': '🛍️ Bought it',
  'card.comments': '💬 {n} opinions',

  'time.now': 'now',
  'time.m': '{n}m',
  'time.h': '{n}h',
  'time.d': '{n}d',
  'time.leftH': '{n}h left',
  'time.leftM': '{n}m left',

  'verdict.tie': "It's a tie — your call",
  'verdict.none': 'No votes',
  'verdict.yes': 'Crowd says: Buy it ✅',
  'verdict.no': 'Crowd says: Skip it ❌',

  'cat.Gadgets': 'Gadgets',
  'cat.Fashion': 'Fashion',
  'cat.Khana': 'Food',
  'cat.Beauty': 'Beauty',
  'cat.Ghar': 'Home',
  'cat.Travel': 'Travel',
  'cat.Fun': 'Fun',
  'cat.Other': 'Other',

  'new.lead': 'The crowd decides within 24 hours. Be honest 😉',
  'new.item': 'What do you want to buy?',
  'new.itemPh': 'e.g. Noise-cancelling headphones',
  'new.price': 'Price (₹)',
  'new.category': 'Category',
  'new.reason': 'Why do you need it? (be honest)',
  'new.reasonPh': 'Need or want? What happened to the old one?',
  'new.reasonMin': 'At least 10 characters ({n}/10)',
  'new.alt': 'Considered a cheaper option? (optional)',
  'new.altPh': 'e.g. Second-hand, repair the old one',
  'new.submit': 'Send request 🙏',
  'common.sending': 'Sending…',

  'mine.saved': 'Saved so far',
  'mine.stats': '{handle} · {n} requests · held back {k} times',
  'mine.empty': "You haven't posted a request yet.",
  'mine.decideQ': 'What did you finally do?',
  'mine.skip': "Didn't buy 🎉",
  'mine.bought': 'Bought it 🛍️',
  'mine.verified': '✅ Verified: {email}',
  'mine.verify': 'Verify email (to vote and post)',
  'mine.language': 'Language',
  'mine.delete': 'Delete account',
  'mine.deleteConfirm': 'Sure? All your requests, votes and comments will be deleted forever.',
  'mine.deleteYes': 'Yes, delete',
  'mine.deleteNo': 'Cancel',

  'detail.notFound': 'This request was not found (it may have been removed).',
  'detail.report': '🚩 Report',
  'detail.reported': 'Reported ✓',
  'detail.block': '🚫 Block {handle}',
  'detail.comments': 'What people say ({n})',
  'detail.noComments': 'No opinions yet. Be the first.',
  'detail.reportShort': 'Report',
  'detail.blockShort': 'Block',
  'detail.placeholder': 'Share your opinion… (politely 🙏)',
  'detail.send': 'Send',

  'login.title': 'Verify your email first ✉️',
  'login.why': 'Verify your email once to vote, post or comment — so votes come from real people. Nobody sees your email.',
  'login.emailPh': 'you@email.com',
  'login.send': 'Send code',
  'login.sent': 'We sent a code to {email}. Check your spam folder too.',
  'login.demo': ' (Demo: 123456)',
  'login.existing': "This email is already registered — verifying logs you into that account. Activity on this device from before login won't move to it.",
  'login.codePh': 'Code',
  'login.verify': 'Verify',
  'login.checking': 'Checking…',
  'login.changeEmail': 'Change email',
  'login.resend': 'Resend code',

  'legal.consent': 'By continuing, you confirm you are 18 or older and agree to our',
  'legal.terms': 'Terms',
  'legal.privacy': 'Privacy Policy',
  'legal.contact': 'Complaints',
} as const;

export type Key = keyof typeof en;
type Dict = Record<Key, string>;

const hi: Dict = {
  'tab.feed': 'चौपाल',
  'tab.new': 'नई अर्ज़ी',
  'tab.mine': 'मेरी अर्ज़ियाँ',
  'title.request': 'अर्ज़ी',
  'title.login': 'लॉगिन',

  'conn.error': 'कनेक्ट नहीं हो पाया: {err}',
  'conn.retry': 'फिर से कोशिश करें',

  'feed.tagline': 'ख़रीदने से पहले, जनता से पूछें।',
  'feed.demo': 'डेमो मोड · डेटा सिर्फ़ इस डिवाइस पर है',
  'feed.empty': 'अभी कोई अर्ज़ी नहीं। पहली अर्ज़ी आप डालें! ✍️',

  'card.you': ' (आप)',
  'card.cheaper': '💡 सस्ता विकल्प: {alt}',
  'card.yes': 'ले लो 👍',
  'card.no': 'रहने दो 👎',
  'card.skipped': '🎉 नहीं ख़रीदा — {amt} बचे',
  'card.bought': '🛍️ ख़रीद लिया',
  'card.comments': '💬 {n} राय',

  'time.now': 'अभी',
  'time.m': '{n} मि.',
  'time.h': '{n} घं.',
  'time.d': '{n} दिन',
  'time.leftH': '{n} घंटे बाकी',
  'time.leftM': '{n} मिनट बाकी',

  'verdict.tie': 'बराबरी — फ़ैसला आपका',
  'verdict.none': 'कोई वोट नहीं',
  'verdict.yes': 'जनता: ले लो ✅',
  'verdict.no': 'जनता: रहने दो ❌',

  'cat.Gadgets': 'गैजेट्स',
  'cat.Fashion': 'फ़ैशन',
  'cat.Khana': 'खाना',
  'cat.Beauty': 'ब्यूटी',
  'cat.Ghar': 'घर',
  'cat.Travel': 'यात्रा',
  'cat.Fun': 'मौज-मस्ती',
  'cat.Other': 'अन्य',

  'new.lead': 'जनता 24 घंटे में फ़ैसला करेगी। सच लिखें 😉',
  'new.item': 'क्या ख़रीदना है?',
  'new.itemPh': 'जैसे: नॉइज़-कैंसलिंग हेडफ़ोन',
  'new.price': 'कीमत (₹)',
  'new.category': 'श्रेणी',
  'new.reason': 'क्यों चाहिए? (सच बताएँ)',
  'new.reasonPh': 'ज़रूरत है या शौक? पुराने वाले का क्या हुआ?',
  'new.reasonMin': 'कम से कम 10 अक्षर ({n}/10)',
  'new.alt': 'कोई सस्ता विकल्प सोचा? (वैकल्पिक)',
  'new.altPh': 'जैसे: सेकंड-हैंड, पुराना ठीक करवाना',
  'new.submit': 'अर्ज़ी भेजें 🙏',
  'common.sending': 'भेज रहे हैं…',

  'mine.saved': 'अब तक बचाए',
  'mine.stats': '{handle} · {n} अर्ज़ी · {k} बार रुके',
  'mine.empty': 'आपने अभी तक कोई अर्ज़ी नहीं डाली।',
  'mine.decideQ': 'आख़िर में क्या किया?',
  'mine.skip': 'नहीं ख़रीदा 🎉',
  'mine.bought': 'ख़रीद लिया 🛍️',
  'mine.verified': '✅ वेरिफ़ाइड: {email}',
  'mine.verify': 'ईमेल वेरिफ़ाई करें (वोट और अर्ज़ी के लिए)',
  'mine.language': 'भाषा',
  'mine.delete': 'अकाउंट डिलीट करें',
  'mine.deleteConfirm': 'पक्का? आपकी सारी अर्ज़ियाँ, वोट और कमेंट हमेशा के लिए डिलीट हो जाएँगे।',
  'mine.deleteYes': 'हाँ, डिलीट करें',
  'mine.deleteNo': 'रहने दें',

  'detail.notFound': 'यह अर्ज़ी नहीं मिली (शायद हटा दी गई)।',
  'detail.report': '🚩 रिपोर्ट करें',
  'detail.reported': 'रिपोर्ट भेज दी ✓',
  'detail.block': '🚫 {handle} को ब्लॉक करें',
  'detail.comments': 'जनता की राय ({n})',
  'detail.noComments': 'अभी कोई राय नहीं। पहले आप बोलें।',
  'detail.reportShort': 'रिपोर्ट',
  'detail.blockShort': 'ब्लॉक',
  'detail.placeholder': 'अपनी राय दें… (इज़्ज़त से 🙏)',
  'detail.send': 'भेजें',

  'login.title': 'पहले ईमेल वेरिफ़ाई करें ✉️',
  'login.why': 'वोट, अर्ज़ी और कमेंट के लिए एक बार ईमेल वेरिफ़ाई करना ज़रूरी है — ताकि वोट असली लोगों के हों। आपका ईमेल किसी को नहीं दिखेगा।',
  'login.emailPh': 'aapka@email.com',
  'login.send': 'कोड भेजें',
  'login.sent': '{email} पर कोड भेजा है। स्पैम फ़ोल्डर भी देख लें।',
  'login.demo': ' (डेमो: 123456)',
  'login.existing': 'यह ईमेल पहले से रजिस्टर्ड है — वेरिफ़ाई करने पर उस अकाउंट में लॉगिन होगा। इस डिवाइस की बिना-लॉगिन वाली गतिविधि उसमें नहीं जाएगी।',
  'login.codePh': 'कोड',
  'login.verify': 'वेरिफ़ाई करें',
  'login.checking': 'जाँच हो रही है…',
  'login.changeEmail': 'ईमेल बदलें',
  'login.resend': 'कोड दोबारा भेजें',

  'legal.consent': 'आगे बढ़कर आप पुष्टि करते हैं कि आपकी उम्र 18+ है और आप हमारी शर्तों से सहमत हैं:',
  'legal.terms': 'उपयोग की शर्तें',
  'legal.privacy': 'प्राइवेसी पॉलिसी',
  'legal.contact': 'शिकायत',
};

const hinglish: Dict = {
  'tab.feed': 'Chaupal',
  'tab.new': 'Nayi Arzi',
  'tab.mine': 'Meri Arzi',
  'title.request': 'Arzi',
  'title.login': 'Login',

  'conn.error': 'Connect nahi ho paya: {err}',
  'conn.retry': 'Dobara try karo',

  'feed.tagline': 'Kharidne se pehle, janta se poocho.',
  'feed.demo': 'Demo mode · data sirf is device pe hai',
  'feed.empty': 'Abhi koi arzi nahi. Pehli arzi tum daalo! ✍️',

  'card.you': ' (tum)',
  'card.cheaper': '💡 Sasta option: {alt}',
  'card.yes': 'Le le 👍',
  'card.no': 'Rehne de 👎',
  'card.skipped': '🎉 Nahi kharida — {amt} bache',
  'card.bought': '🛍️ Kharid liya',
  'card.comments': '💬 {n} raay',

  'time.now': 'abhi',
  'time.m': '{n}m',
  'time.h': '{n}h',
  'time.d': '{n}d',
  'time.leftH': '{n}h baaki',
  'time.leftM': '{n}m baaki',

  'verdict.tie': 'Tie — tum decide karo',
  'verdict.none': 'Kisi ne vote nahi kiya',
  'verdict.yes': 'Janta: Le le ✅',
  'verdict.no': 'Janta: Rehne de ❌',

  'cat.Gadgets': 'Gadgets',
  'cat.Fashion': 'Fashion',
  'cat.Khana': 'Khana',
  'cat.Beauty': 'Beauty',
  'cat.Ghar': 'Ghar',
  'cat.Travel': 'Travel',
  'cat.Fun': 'Fun',
  'cat.Other': 'Other',

  'new.lead': 'Janta 24 ghante mein faisla karegi. Sach likhna — jhooth pakda jaata hai 😉',
  'new.item': 'Kya kharidna hai?',
  'new.itemPh': 'e.g. Noise-cancelling headphones',
  'new.price': 'Kitne ka? (₹)',
  'new.category': 'Category',
  'new.reason': 'Kyun chahiye? (sach bolna)',
  'new.reasonPh': 'Zaroorat hai ya shauk? Purana wala kya hua?',
  'new.reasonMin': 'Kam se kam 10 characters ({n}/10)',
  'new.alt': 'Koi sasta option socha? (optional)',
  'new.altPh': 'e.g. Second-hand, purana repair karwana',
  'new.submit': 'Arzi bhejo 🙏',
  'common.sending': 'Bhej rahe hain…',

  'mine.saved': 'Ab tak bachaye',
  'mine.stats': '{handle} · {n} arzi · {k} baar ruk gaye',
  'mine.empty': 'Abhi tak koi arzi nahi daali.',
  'mine.decideQ': 'Aakhir mein kya kiya?',
  'mine.skip': 'Nahi kharida 🎉',
  'mine.bought': 'Kharid liya 🛍️',
  'mine.verified': '✅ Verified: {email}',
  'mine.verify': 'Email verify karo (vote aur arzi ke liye)',
  'mine.language': 'Bhasha',
  'mine.delete': 'Account delete karo',
  'mine.deleteConfirm': 'Pakka? Tumhari saari arzi, votes aur comments hamesha ke liye delete ho jayenge.',
  'mine.deleteYes': 'Haan, delete karo',
  'mine.deleteNo': 'Rehne do',

  'detail.notFound': 'Yeh arzi nahi mili (shayad hata di gayi).',
  'detail.report': '🚩 Report karo',
  'detail.reported': 'Report bhej diya ✓',
  'detail.block': '🚫 Block {handle}',
  'detail.comments': 'Janta ki raay ({n})',
  'detail.noComments': 'Abhi koi raay nahi. Pehle tum bolo.',
  'detail.reportShort': 'Report',
  'detail.blockShort': 'Block',
  'detail.placeholder': 'Apni raay do… (izzat se 🙏)',
  'detail.send': 'Bhejo',

  'login.title': 'Pehle email verify karo ✉️',
  'login.why': 'Vote, arzi aur comment ke liye ek baar email verify karna zaroori hai — taaki votes asli logon ke hon. Email kisi ko dikhega nahi.',
  'login.emailPh': 'tumhara@email.com',
  'login.send': 'Code bhejo',
  'login.sent': '{email} pe code bheja hai. Spam folder bhi dekh lena.',
  'login.demo': ' (Demo: 123456)',
  'login.existing': 'Yeh email pehle se registered hai — verify karne pe us account mein login hoga. Is phone ki bina-login wali activity us account mein nahi jayegi.',
  'login.codePh': 'Code',
  'login.verify': 'Verify karo',
  'login.checking': 'Check ho raha hai…',
  'login.changeEmail': 'Email badlo',
  'login.resend': 'Code dobara bhejo',

  'legal.consent': 'Aage badhkar tum confirm karte ho ki tum 18+ ho aur in sharton se sehmat ho:',
  'legal.terms': 'Terms',
  'legal.privacy': 'Privacy Policy',
  'legal.contact': 'Shikayat',
};

const DICTS: Record<Lang, Dict> = { en, hi, hinglish };
const STORAGE_KEY = 'ruko-zara.lang';

export type T = (key: Key, vars?: Record<string, string | number>) => string;

function translate(lang: Lang): T {
  const d = DICTS[lang];
  return (key, vars) => {
    const s = d[key] ?? en[key];
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s;
  };
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T } | null>(null);

export function useT() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useT outside LanguageProvider');
  return c;
}

/** Loads the saved language; on first launch asks the user to pick one. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'hi' || v === 'hinglish') setLangState(v);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  if (!loaded) return null;
  if (!lang) return <LanguagePicker onPick={setLang} />;

  return <Ctx.Provider value={{ lang, setLang, t: translate(lang) }}>{children}</Ctx.Provider>;
}

function LanguagePicker({ onPick }: { onPick: (l: Lang) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 28, gap: 14 }}>
      <Text style={{ fontSize: 30, fontWeight: '900', color: C.ink, textAlign: 'center' }}>Ruko Zara ✋</Text>
      <Text style={{ fontSize: 16, color: C.sub, textAlign: 'center', marginBottom: 12 }}>
        Choose your language · अपनी भाषा चुनें
      </Text>
      {LANGS.map((l) => (
        <Pressable
          key={l.id}
          onPress={() => onPick(l.id)}
          style={{ backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.brand, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 19, fontWeight: '800', color: C.brand }}>{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
