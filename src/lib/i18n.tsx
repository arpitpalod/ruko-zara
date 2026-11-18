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

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'hi', label: 'हिन्दी', short: 'हिं' },
  { id: 'hinglish', label: 'Hinglish', short: 'Hi-En' },
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
  'card.demo': 'demo',
  'admin.hiddenBadge': '🙈 Hidden (only admins see this)',
  'admin.hide': '🛡️ Hide for everyone',
  'admin.unhide': '🛡️ Unhide',
  'web.android': '📱 Get the Android app (45 MB)',
  'web.ios': '📲 iPhone tip: tap Share → Add to Home Screen to use it like an app',

  'time.now': 'now',
  'time.m': '{n}m',
  'time.h': '{n}h',
  'time.d': '{n}d',
  'time.leftH': '{n}h left',
  'time.leftM': '{n}m left',
  'time.leftD': '{n} days left',

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

  'new.lead': 'The crowd votes for as long as you choose (up to 7 days). Be honest 😉',
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
  'login.why': 'Verify your email once to post, comment and vote without limits — so votes come from real people. Nobody sees your email.',
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

  'error.abuse': "Please keep it clean — that wording isn't allowed.",
  'error.dailyLimit': 'Daily limit reached: 5 requests per day.',
  'error.contact': 'For everyone\'s safety, phone numbers, emails, @handles and links aren\'t allowed. (Shop links go in the Product link field.)',
  'error.loginNeeded': 'Please verify your email first.',
  'error.badCode': 'Wrong or expired code. Try again or resend it.',
  'error.network': 'No internet? Check your connection.',

  'share.button': 'Share on WhatsApp',
  'share.mine': 'Should I buy *{item}* for {price}? 🤔\nMy reason: "{reason}"\n\nBuy it or skip it? Vote here — no login needed 👇\n{link}',
  'share.other': 'Someone wants *{item}* for {price} 🤔\n"{reason}"\n\nBuy it or skip it? Vote — no login needed 👇\n{link}',
  'share.nudge': 'Want more votes, faster? Ask your friends on WhatsApp.',
  'share.savings': 'Ruko Zara helped me save {amt} so far 🎉 Ask the crowd before you buy 👉 {link}',
  'mine.shareSavings': 'Show off on WhatsApp',

  'feed.tabVote': 'Vote',
  'feed.tabResults': 'Results',
  'feed.votedHeader': 'You voted ({n}) · still open',
  'feed.emptyVote': "You've voted on everything 🎉\nPull down to refresh, or post your own request.",
  'feed.emptyResults': 'No results yet. Results show up when voting closes.',

  'new.duration': 'How long should voting stay open?',
  'new.durationNote': "Can't be changed after posting.",
  'dur.hours': '{n} hours',
  'dur.day1': '1 day',
  'dur.days': '{n} days',
  'new.link': 'Product link (optional)',
  'new.linkPh': 'Paste from Amazon, Flipkart, Myntra…',
  'new.linkBad': "That doesn't look like a link.",
  'error.link': 'Links are allowed from shopping sites only (Amazon, Flipkart, Myntra…).',
  'feed.guestLeft': '🗳️ {n} free guest votes left · Verify your email for unlimited voting →',
  'feed.guestOut': "🗳️ You've used your 20 guest votes · Verify your email to keep voting →",
  'error.guestLimit': "You've used your 20 guest votes. Verify your email to keep voting — takes 30 seconds.",
  'error.captcha': "Couldn't confirm you're a real person. Check your internet and try again.",
  'captcha.checking': "Quick check that you're a real person 🙏",
  'update.available': '🆕 A new version of the app is ready — tap to update',
  'admin.ban': '⛔ Ban {handle} from Ruko Zara',
  'admin.banConfirm': 'Tap again to ban {handle}. Their posts, comments and votes will silently stop reaching anyone.',
  'admin.unban': '✅ Unban {handle}',
  'admin.bannedBadge': '⛔ Banned — only admins and this person see this',
  'admin.banShort': 'Ban',
  'admin.banShortConfirm': 'Tap again to ban',
  'admin.unbanShort': 'Unban',
  'error.cannotBanAdmin': "Admins can't be banned.",
  'detail.more': '👀 Vote on more arzi →',
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
  'card.demo': 'डेमो',
  'admin.hiddenBadge': '🙈 छिपा हुआ (सिर्फ़ एडमिन को दिखता है)',
  'admin.hide': '🛡️ सबसे छिपाएँ',
  'admin.unhide': '🛡️ वापस दिखाएँ',
  'web.android': '📱 Android ऐप डाउनलोड करें (45 MB)',
  'web.ios': '📲 iPhone टिप: Share → Add to Home Screen दबाएँ, ऐप की तरह चलेगा',

  'time.now': 'अभी',
  'time.m': '{n} मि.',
  'time.h': '{n} घं.',
  'time.d': '{n} दिन',
  'time.leftH': '{n} घंटे बाकी',
  'time.leftM': '{n} मिनट बाकी',
  'time.leftD': '{n} दिन बाकी',

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

  'new.lead': 'जनता आपके चुने समय तक (ज़्यादा से ज़्यादा 7 दिन) वोट करेगी। सच लिखें 😉',
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
  'login.why': 'अर्ज़ी, कमेंट और बेहिसाब वोट के लिए एक बार ईमेल वेरिफ़ाई करें — ताकि वोट असली लोगों के हों। आपका ईमेल किसी को नहीं दिखेगा।',
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

  'error.abuse': 'कृपया शालीन भाषा रखें — ये शब्द इस्तेमाल नहीं कर सकते।',
  'error.dailyLimit': 'आज की सीमा पूरी: दिन में 5 अर्ज़ी।',
  'error.contact': 'सबकी सुरक्षा के लिए फ़ोन नंबर, ईमेल, @हैंडल और लिंक नहीं डाल सकते। (शॉपिंग लिंक "प्रोडक्ट लिंक" में डालें।)',
  'error.loginNeeded': 'पहले अपना ईमेल वेरिफ़ाई करें।',
  'error.badCode': 'कोड गलत है या एक्सपायर हो गया। फिर से कोशिश करें।',
  'error.network': 'इंटरनेट नहीं है? कनेक्शन जाँचें।',

  'share.button': 'WhatsApp पर शेयर करें',
  'share.mine': 'क्या मैं *{item}* ({price}) ख़रीदूँ? 🤔\nमेरी वजह: "{reason}"\n\nले लूँ या रहने दूँ? यहाँ वोट करें — लॉगिन की ज़रूरत नहीं 👇\n{link}',
  'share.other': 'किसी को *{item}* ({price}) चाहिए 🤔\n"{reason}"\n\nले लें या रहने दें? वोट करें — लॉगिन की ज़रूरत नहीं 👇\n{link}',
  'share.nudge': 'जल्दी ज़्यादा वोट चाहिए? दोस्तों से WhatsApp पर पूछें।',
  'share.savings': 'Ruko Zara की मदद से मैंने अब तक {amt} बचाए 🎉 ख़रीदने से पहले जनता से पूछें 👉 {link}',
  'mine.shareSavings': 'WhatsApp पर दिखाएँ',

  'feed.tabVote': 'वोट करें',
  'feed.tabResults': 'फ़ैसले',
  'feed.votedHeader': 'आपने वोट किया ({n}) · अभी खुली हैं',
  'feed.emptyVote': 'आपने सब पर वोट कर दिया 🎉\nरिफ़्रेश करने के लिए नीचे खींचें, या अपनी अर्ज़ी डालें।',
  'feed.emptyResults': 'अभी कोई फ़ैसला नहीं। वोटिंग बंद होने पर फ़ैसला यहाँ दिखेगा।',

  'new.duration': 'वोटिंग कितनी देर खुली रहे?',
  'new.durationNote': 'पोस्ट करने के बाद बदल नहीं सकते।',
  'dur.hours': '{n} घंटे',
  'dur.day1': '1 दिन',
  'dur.days': '{n} दिन',
  'new.link': 'प्रोडक्ट लिंक (वैकल्पिक)',
  'new.linkPh': 'Amazon, Flipkart, Myntra… से पेस्ट करें',
  'new.linkBad': 'यह लिंक जैसा नहीं लग रहा।',
  'error.link': 'सिर्फ़ शॉपिंग साइट्स के लिंक चलेंगे (Amazon, Flipkart, Myntra…)।',
  'feed.guestLeft': '🗳️ मेहमान के तौर पर {n} वोट बाक़ी · बेहिसाब वोट के लिए ईमेल वेरिफ़ाई करें →',
  'feed.guestOut': '🗳️ आपके 20 मेहमान वोट पूरे हो गए · वोट जारी रखने के लिए ईमेल वेरिफ़ाई करें →',
  'error.guestLimit': 'आपके 20 मेहमान वोट पूरे हो गए। वोट जारी रखने के लिए ईमेल वेरिफ़ाई करें — 30 सेकंड लगेंगे।',
  'error.captcha': 'पुष्टि नहीं हो पाई कि आप असली इंसान हैं। इंटरनेट जाँचें और फिर कोशिश करें।',
  'captcha.checking': 'बस एक छोटी जाँच कि आप असली इंसान हैं 🙏',
  'update.available': '🆕 ऐप का नया वर्ज़न आ गया है — अपडेट करने के लिए टैप करें',
  'admin.ban': '⛔ {handle} को Ruko Zara से बैन करें',
  'admin.banConfirm': '{handle} को बैन करने के लिए फिर टैप करें। उनकी अर्ज़ी, कमेंट और वोट चुपचाप किसी तक नहीं पहुँचेंगे।',
  'admin.unban': '✅ {handle} का बैन हटाएँ',
  'admin.bannedBadge': '⛔ बैन — यह सिर्फ़ एडमिन और यही व्यक्ति देख सकते हैं',
  'admin.banShort': 'बैन',
  'admin.banShortConfirm': 'बैन के लिए फिर टैप करें',
  'admin.unbanShort': 'बैन हटाएँ',
  'error.cannotBanAdmin': 'एडमिन को बैन नहीं किया जा सकता।',
  'detail.more': '👀 और अर्ज़ियों पर वोट करें →',
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
  'card.demo': 'demo',
  'admin.hiddenBadge': '🙈 Hidden (sirf admin ko dikhta hai)',
  'admin.hide': '🛡️ Sabse chhupao',
  'admin.unhide': '🛡️ Wapas dikhao',
  'web.android': '📱 Android app download karo (45 MB)',
  'web.ios': '📲 iPhone tip: Share → Add to Home Screen dabao, app jaisa chalega',

  'time.now': 'abhi',
  'time.m': '{n}m',
  'time.h': '{n}h',
  'time.d': '{n}d',
  'time.leftH': '{n}h baaki',
  'time.leftM': '{n}m baaki',
  'time.leftD': '{n} din baaki',

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

  'new.lead': 'Janta tumhare chune hue time tak vote karegi (max 7 din). Sach likhna — jhooth pakda jaata hai 😉',
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
  'login.why': 'Arzi, comment aur unlimited vote ke liye ek baar email verify karo — taaki votes asli logon ke hon. Email kisi ko dikhega nahi.',
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

  'error.abuse': 'Thoda tameez se 🙏 — yeh shabd allowed nahi hain.',
  'error.dailyLimit': 'Aaj ki limit poori: din mein 5 arzi.',
  'error.contact': 'Sabki safety ke liye phone number, email, @handle aur link allowed nahi hain. (Shop link "Product link" mein daalo.)',
  'error.loginNeeded': 'Pehle email verify karo.',
  'error.badCode': 'Code galat hai ya expire ho gaya. Dobara try karo.',
  'error.network': 'Internet nahi hai? Connection check karo.',

  'share.button': 'WhatsApp pe share karo',
  'share.mine': '*{item}* ({price}) le loon ya rehne doon? 🤔\nMera reason: "{reason}"\n\nVote karo — login nahi chahiye 👇\n{link}',
  'share.other': 'Kisi ko *{item}* ({price}) chahiye 🤔\n"{reason}"\n\nLe le ya rehne de? Vote karo — login nahi chahiye 👇\n{link}',
  'share.nudge': 'Jaldi votes chahiye? Doston se WhatsApp pe poocho.',
  'share.savings': 'Ruko Zara ki wajah se maine ab tak {amt} bachaye 🎉 Kharidne se pehle janta se poocho 👉 {link}',
  'mine.shareSavings': 'WhatsApp pe dikhao',

  'feed.tabVote': 'Vote karo',
  'feed.tabResults': 'Faisle',
  'feed.votedHeader': 'Tumne vote kiya ({n}) · abhi khuli hain',
  'feed.emptyVote': 'Sab pe vote ho gaya 🎉\nNeeche kheench ke refresh karo, ya apni arzi daalo.',
  'feed.emptyResults': 'Abhi koi faisla nahi. Voting band hote hi faisla yahan dikhega.',

  'new.duration': 'Voting kitni der chale?',
  'new.durationNote': 'Post karne ke baad badal nahi sakte.',
  'dur.hours': '{n} ghante',
  'dur.day1': '1 din',
  'dur.days': '{n} din',
  'new.link': 'Product link (optional)',
  'new.linkPh': 'Amazon, Flipkart, Myntra… se paste karo',
  'new.linkBad': 'Yeh link jaisa nahi lag raha.',
  'error.link': 'Sirf shopping sites ke link chalenge (Amazon, Flipkart, Myntra…).',
  'feed.guestLeft': '🗳️ Guest ke {n} free vote bache · Unlimited vote ke liye email verify karo →',
  'feed.guestOut': '🗳️ Tumhare 20 guest vote ho gaye · Aage vote karne ke liye email verify karo →',
  'error.guestLimit': 'Tumhare 20 guest vote ho gaye. Aage vote karne ke liye email verify karo — 30 second lagenge.',
  'error.captcha': 'Confirm nahi ho paya ki tum asli insaan ho. Internet check karke dobara try karo.',
  'captcha.checking': 'Bas ek chhota check ki tum asli insaan ho 🙏',
  'update.available': '🆕 App ka naya version aa gaya — update karne ke liye tap karo',
  'admin.ban': '⛔ {handle} ko Ruko Zara se ban karo',
  'admin.banConfirm': '{handle} ko ban karne ke liye dobara tap karo. Unki arzi, comment aur vote chupchaap kisi tak nahi pahunchenge.',
  'admin.unban': '✅ {handle} ka ban hatao',
  'admin.bannedBadge': '⛔ Banned — sirf admin aur yahi insaan dekh sakte hain',
  'admin.banShort': 'Ban',
  'admin.banShortConfirm': 'Ban ke liye dobara tap karo',
  'admin.unbanShort': 'Unban',
  'error.cannotBanAdmin': 'Admin ko ban nahi kar sakte.',
  'detail.more': '👀 Aur arzi pe vote karo →',
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
