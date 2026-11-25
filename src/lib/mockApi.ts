import { REASONS, type VoteReason } from './reasons';
import type { Api, Comment, FeedItem, Verdict } from './types';

/** In-memory backend so the app runs with zero setup (demo / web preview). */

// Dev site: open it with ?admin=1 to see the app as an admin (demo data only, nothing real).
const asAdmin = typeof window !== 'undefined' && /[?&]admin=1\b/.test(window.location?.search ?? '');
/** A drawn stand-in product photo for the demo's link preview. */
const DEMO_PRODUCT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAABZklEQVR42u3cUU7DMAwA0NXaSRGcahP34oszcAMuwAorsZ1Uz99VYr/NSdZW274+Py7icQQCQIAAAQIECBAgAQgQIECAAAECJAABGhXX9gxeXt/2L3i/3xrT27pu2v/qMolUNdABl16pOqAhNPVMsahO0pg9QHmVFBjlttgfC9hplv+PMC/Q2P276zSQBbRfz+FikoatBtopY0gN2eO3/dQYlf3a56AfP96kkgrminV1Ho08du+P5U5uxZnEKutO1/ixaHOVNZobZn1AlZtx3lxxsuV5eFZxgq9P6ozWoHygOftrVG5xjv7Km1eLAQJ0mfN2x2xPRJPyibzdoXJ3y8snUvfOGqPUfCL7ZJFtlJ2PRRoQIECAAAECBEgAAgQIECBAgAAJQIAAAQJ0UqBnn0/O9pbrs9dHak6Nb7mOyifycprtJc5j+Wz+qtQiDQgQIECAAAESgAABAgQIECBAAhAgQIDmiG9H45v708IR2wAAAABJRU5ErkJggg==';

const ME: { id: string; handle: string; email: string | null; isAdmin: boolean } = { id: 'me', handle: 'Kanjoos Kabootar 42', email: null, isAdmin: asAdmin };
const H = 3.6e6;
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * H).toISOString();

type Row = Omit<FeedItem, 'my_vote' | 'approve_count' | 'reject_count' | 'comment_count' | 'handle'>;
const handles: Record<string, string> = {
  me: ME.handle, u1: 'Sabar Panda 17', u2: 'Hisaabi Chacha 88', u3: 'Thrifty Tota 205',
  u4: 'Bachat Baba 9', u5: 'Samajhdar Mausi 61', u6: 'Chillar Tiger 340',
  u7: 'Jugaadu Bhalu 12', u8: 'Spammy Sher 99',
};

const rows: Row[] = [
  { id: 'r1', user_id: 'u1', item: 'iPhone 17 Pro (256GB)', price_inr: 134900, category: 'Gadgets',
    reason: 'Mera iPhone 13 theek chal raha hai, bas camera upgrade chahiye aur sab office mein naya le aaye hain.',
    alternative: 'Battery change ₹6,500 mein', closes_at: at(18), outcome: null, created_at: at(-6), link: 'https://www.apple.com/in/iphone/', image: DEMO_PRODUCT },
  { id: 'r2', user_id: 'u2', item: 'Raat 1 baje Biryani order', price_inr: 480, category: 'Khana',
    reason: 'Ghar pe dal chawal pada hai par mann nahi kar raha. Aaj ka din bahut lamba tha.',
    alternative: 'Maggi bana lo', closes_at: at(0.5), outcome: null, created_at: at(-23.5), link: null },
  { id: 'r3', user_id: 'u3', item: 'Air fryer (sale price)', price_inr: 6499, category: 'Ghar',
    reason: 'Sale mein 40% off hai. Healthy khana banaunga, pakka. Last time wala sandwich maker bhi use karta hoon kabhi kabhi.',
    alternative: null, closes_at: at(9), outcome: null, created_at: at(-15), link: null },
  { id: 'r4', user_id: 'u4', item: 'Goa trip with college friends', price_inr: 18000, category: 'Travel',
    reason: '5 saal se plan ban raha hai, is baar sab ready hain. Savings se jayega, EMI nahi.',
    alternative: 'Gokarna — sasta aur kam crowd', closes_at: at(20), outcome: null, created_at: at(-4), link: null },
  { id: 'r5', user_id: 'u5', item: 'Skincare haul (7 products)', price_inr: 3200, category: 'Beauty',
    reason: 'Reel mein dekha 10-step routine. Abhi mere paas sirf facewash aur moisturiser hai.',
    alternative: 'Sirf sunscreen le lo pehle', closes_at: at(-2), outcome: null, created_at: at(-26), link: null },
  { id: 'r6', user_id: 'u6', item: 'Mechanical keyboard', price_inr: 7800, category: 'Gadgets',
    reason: 'Din bhar coding karta hoon, wrist dard karti hai. Office wala keyboard bahut kharab hai.',
    alternative: 'Office se maang lo', closes_at: at(12), outcome: null, created_at: at(-12), link: null },
  { id: 'r7', user_id: 'me', item: 'Sneakers (limited drop)', price_inr: 16995, category: 'Fashion',
    reason: 'Pichle 2 saal se ek hi joota pehen raha hoon. Par yeh wala thoda zyada mehenga hai.',
    alternative: 'Regular running shoes ₹4,000', closes_at: at(-30), outcome: 'skipped', created_at: at(-54), link: null },
  { id: 'r11', user_id: 'u3', item: 'Cult.fit Pro pass (10 months left)', price_inr: 10000, category: 'Health',
    reason: 'Dost ki job doosre sheher mein lag gayi. ₹15,000 wala pass ₹10,000 mein de raha hai, centre ghar ke paas hai.',
    alternative: 'Pehle 1 mahine ka pass', closes_at: at(30), outcome: null, created_at: at(-2), link: null },
  { id: 'r12', user_id: 'u5', item: 'Coffee machine (espresso + frother)', price_inr: 10000, category: 'Khana',
    reason: 'Café pe roz ₹220 ka cup jaata hai. Machine 3 mahine mein paisa wasool kar degi.',
    alternative: 'French press ₹1,000', closes_at: at(40), outcome: null, created_at: at(-1), link: 'https://www.amazon.in/dp/B0DEMO1234', image: DEMO_PRODUCT },
  // Closed and not marked yet: the feed asks "Did you buy it?" about this one.
  { id: 'r10', user_id: 'me', item: 'Bluetooth party speaker', price_inr: 3499, category: 'Gadgets',
    reason: 'Ghar pe dosto ke saath music ke liye. Purana speaker kharab ho gaya.',
    alternative: 'Purana speaker repair karwa lo', closes_at: at(-2), outcome: null, created_at: at(-26), link: null },
  // Only admins see these two (demo of the "Hidden and banned" page).
  { id: 'r8', user_id: 'u7', item: 'Something reported three times', price_inr: 999, category: 'Other',
    reason: 'Demo: an arzi hidden after reports.', alternative: null, closes_at: at(10), outcome: null, created_at: at(-3), link: null, hidden: true },
  { id: 'r9', user_id: 'u8', item: 'Spam from a banned account', price_inr: 1, category: 'Other',
    reason: 'Demo: an arzi from a banned account. Nobody else sees it.', alternative: null, closes_at: at(16), outcome: null, created_at: at(-2), link: null },
];

const banned = new Set<string>(['u8']);
// Dev site: ?new=1 shows the app as a brand-new person (no arzi of your own yet).
if (typeof window !== 'undefined' && /[?&]new=1\b/.test(window.location?.search ?? '')) {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].user_id === ME.id) rows.splice(i, 1);
}
const votes = new Map<string, Map<string, Verdict>>(); // requestId → (userId → verdict)
const verifiedVoters = new Set<string>(); // demo: about a third of voters verified their email
const reasons = new Map<string, Map<string, VoteReason>>(); // requestId → (userId → reason)
// Demo spread of reasons: mostly "need it" / "don't need it", the rest mixed.
const YES_MIX: VoteReason[] = ['need_it', 'worth_price', 'need_it', 'treat_yourself', 'worth_price'];
const NO_MIX: VoteReason[] = ['dont_need', 'wait_sale', 'dont_need', 'cheaper_option', 'too_much', 'dont_need', 'wait_sale'];
const setReason = (id: string, who: string, code: VoteReason) =>
  (reasons.get(id) ?? reasons.set(id, new Map()).get(id)!).set(who, code);
const seedVotes = (id: string, yes: number, no: number) => {
  const m = new Map<string, Verdict>();
  // Every 4th seeded vote has no reason, like the live votes cast before reasons existed.
  for (let i = 0; i < yes; i++) m.set(`s${id}y${i}`, 'approve'), i % 4 !== 3 && setReason(id, `s${id}y${i}`, YES_MIX[i % YES_MIX.length]);
  for (let i = 0; i < no; i++) m.set(`s${id}n${i}`, 'reject'), i % 4 !== 3 && setReason(id, `s${id}n${i}`, NO_MIX[i % NO_MIX.length]);
  [...m.keys()].forEach((k, i) => (i % 3 === 0 ? verifiedVoters.add(k) : null));
  votes.set(id, m);
};
seedVotes('r1', 9, 41); seedVotes('r2', 23, 19); seedVotes('r3', 6, 14); seedVotes('r4', 37, 5);
seedVotes('r5', 3, 22); seedVotes('r6', 28, 4); seedVotes('r7', 7, 31); seedVotes('r10', 12, 21);

const comments: Comment[] = [
  { id: 'c1', request_id: 'r1', user_id: 'u2', handle: handles.u2, body: 'Office walon ki EMI tum bharoge? Battery badlo, 2 saal aur chalega.', created_at: at(-5) },
  { id: 'c2', request_id: 'r1', user_id: 'u4', handle: handles.u4, body: 'Camera ke liye ₹1.3 lakh? Insta pe sab filter hi lagate hain 😅', created_at: at(-4) },
  { id: 'c3', request_id: 'r2', user_id: 'u5', handle: handles.u5, body: 'Lamba din tha toh kha lo beta. Kal se dal chawal.', created_at: at(-20) },
  { id: 'c4', request_id: 'r3', user_id: 'u6', handle: handles.u6, body: '"Kabhi kabhi" = kabhi nahi. Rehne do.', created_at: at(-10) },
  { id: 'c5', request_id: 'r6', user_id: 'u1', handle: handles.u1, body: 'Health ka kharcha hai, le lo. Wrist pehle.', created_at: at(-8) },
];

let seq = 100;
const blocked = new Set<string>();
const visible = (userId: string) => !blocked.has(userId);
// Hidden arzi and banned people's arzi reach only admins and the author (silent ban).
const shown = (r: Row) => visible(r.user_id) && (ME.isAdmin || r.user_id === ME.id || (!r.hidden && !banned.has(r.user_id)));
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

function view(r: Row): FeedItem {
  const m = votes.get(r.id) ?? new Map<string, Verdict>();
  let a = 0, rej = 0, va = 0, vr = 0;
  m.forEach((v, who) => {
    if (v === 'approve') a++;
    else rej++;
    if (verifiedVoters.has(who)) v === 'approve' ? va++ : vr++;
  });
  return {
    ...r,
    handle: handles[r.user_id] ?? '—',
    approve_count: a,
    reject_count: rej,
    verified_approve: va,
    verified_reject: vr,
    comment_count: comments.filter((c) => c.request_id === r.id).length,
    my_vote: m.get(ME.id) ?? null,
  };
}
const sorted = () => [...rows].sort((x, y) => y.created_at.localeCompare(x.created_at));

/** Makes the demo feel alive: strangers trickle in on your new arzi. */
function simulateCrowd(id: string) {
  const lines = ['Pehle 1 hafta ruko, phir bhi chahiye toh le lena.', 'Zaroorat hai ya shauk? Sach bolo 😄', 'Sale khatam nahi hogi, tension mat lo.'];
  [3000, 7000, 12000].forEach((ms, i) =>
    setTimeout(() => {
      const m = votes.get(id) ?? new Map<string, Verdict>();
      for (let k = 0; k < 2 + i; k++) {
        const v: Verdict = Math.random() < 0.4 ? 'approve' : 'reject';
        const pool = v === 'approve' ? YES_MIX : NO_MIX;
        m.set(`sim${id}${i}${k}`, v);
        setReason(id, `sim${id}${i}${k}`, pool[Math.floor(Math.random() * pool.length)]);
      }
      votes.set(id, m);
      const uid = `u${1 + i}`;
      comments.push({ id: `c${++seq}`, request_id: id, user_id: uid, handle: handles[uid], body: lines[i], created_at: new Date().toISOString() });
    }, ms),
  );
}

export const mockApi: Api = {
  init: () => delay({ ...ME }),
  onSignedIn: () => () => {},
  feed: (kind) =>
    delay(
      sorted()
        .filter((r) => shown(r) && (kind === 'open') === new Date(r.closes_at).getTime() > Date.now())
        .map(view),
    ),
  mine: () => delay(sorted().filter((r) => r.user_id === ME.id).map(view)),
  get(id) {
    const r = rows.find((x) => x.id === id && shown(x));
    return delay(r ? view(r) : null);
  },
  comments: (id) => delay(comments.filter((c) => c.request_id === id && visible(c.user_id))),
  async create(r) {
    const id = `r${++seq}`;
    const { duration_hours, ...fields } = r;
    // Like the live server: an Amazon link gets its product photo (the poster can't set one).
    const image = fields.link && /amazon|amzn/.test(fields.link) ? DEMO_PRODUCT : null;
    rows.push({ ...fields, id, user_id: ME.id, closes_at: at(Math.min(duration_hours, 168)), outcome: null, created_at: new Date().toISOString(), image });
    votes.set(id, new Map());
    simulateCrowd(id);
    return delay(id);
  },
  guestVotesLeft() {
    if (ME.email) return delay(null);
    let n = 0;
    votes.forEach((m) => m.has(ME.id) && n++);
    return delay(Math.max(0, 20 - n));
  },

  async vote(id, v, reason) {
    const r = rows.find((x) => x.id === id);
    if (!r || r.user_id === ME.id) throw new Error('Apni arzi pe vote nahi kar sakte');
    if (new Date(r.closes_at).getTime() < Date.now()) throw new Error('Voting band ho gayi');
    if (!ME.email && !votes.get(id)?.has(ME.id) && (await this.guestVotesLeft()) === 0) throw new Error('GUEST_VOTE_LIMIT');
    if (reason && !REASONS[v].includes(reason)) throw new Error('Wrong reason for this vote');
    (votes.get(id) ?? votes.set(id, new Map()).get(id)!).set(ME.id, v);
    if (reason) setReason(id, ME.id, reason);
    else reasons.get(id)?.delete(ME.id);
    await delay(null);
  },
  voteReasons(id) {
    const r = rows.find((x) => x.id === id && visible(x.user_id));
    const m = votes.get(id);
    // Same rule as the database: only once you've voted, it's yours, or voting has closed.
    const canSee = !!r && (r.user_id === ME.id || !!m?.has(ME.id) || new Date(r.closes_at).getTime() <= Date.now());
    if (!canSee) return delay([]);
    const n = new Map<VoteReason, number>();
    reasons.get(id)?.forEach((code) => n.set(code, (n.get(code) ?? 0) + 1));
    return delay([...n].map(([reason, count]) => ({ reason, n: count })));
  },
  async comment(id, body) {
    comments.push({ id: `c${++seq}`, request_id: id, user_id: ME.id, handle: ME.handle, body, created_at: new Date().toISOString() });
    await delay(null);
  },
  async setOutcome(id, o) {
    const r = rows.find((x) => x.id === id);
    if (r) r.outcome = o;
    await delay(null);
  },
  async setFeatureOk(id, ok) {
    const r = rows.find((x) => x.id === id && x.user_id === ME.id);
    if (r) r.feature_ok = ok;
    await delay(null);
  },
  setSource: () => delay(undefined),
  report: () => delay(undefined),
  adminSetHidden(type, id, hide) {
    if (!ME.isAdmin) throw new Error('NOT_ADMIN');
    const r = type === 'request' ? rows.find((x) => x.id === id) : undefined;
    if (r) r.hidden = hide;
    return delay(undefined);
  },
  async adminSetBanned(userId, ban) {
    if (!ME.isAdmin) throw new Error('NOT_ADMIN');
    if (ban) banned.add(userId);
    else banned.delete(userId);
    await delay(null);
  },
  adminBannedIds: () => delay(ME.isAdmin ? [...banned] : []),
  async block(userId) {
    blocked.add(userId);
    await delay(null);
  },
  // Demo: any email works, the code is always 123456.
  sendEmailCode: () => delay('link' as const),
  async verifyEmailCode(email, code) {
    if (code !== '123456') throw new Error('Galat code (demo mein 123456 daalo)');
    ME.email = email;
    return delay({ ...ME });
  },
  async linkPreview(url: string) {
    const site = (url.match(/^https?:\/\/([^/:?#]+)/i)?.[1] ?? '').replace(/^www\./i, '').toLowerCase();
    if (/notallowed|example\./.test(site)) return delay({ allowed: false, site });
    if (/amazon|amzn/.test(site)) return delay({ allowed: true, site, title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', image: DEMO_PRODUCT });
    return delay({ allowed: true, site, title: null, image: null });
  },
  async signInWithGoogle() {
    ME.email = 'demo.google@gmail.com';
    return delay({ ...ME });
  },
  async deleteAccount() {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].user_id === ME.id) rows.splice(i, 1);
    ME.email = null;
    return delay({ ...ME });
  },
};
