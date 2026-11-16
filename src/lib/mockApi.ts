import type { Api, Comment, FeedItem, Verdict } from './types';

/** In-memory backend so the app runs with zero setup (demo / web preview). */

const ME: { id: string; handle: string; email: string | null } = { id: 'me', handle: 'Kanjoos Kabootar 42', email: null };
const H = 3.6e6;
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * H).toISOString();

type Row = Omit<FeedItem, 'my_vote' | 'approve_count' | 'reject_count' | 'comment_count' | 'handle'>;
const handles: Record<string, string> = {
  me: ME.handle, u1: 'Sabar Panda 17', u2: 'Hisaabi Chacha 88', u3: 'Thrifty Tota 205',
  u4: 'Bachat Baba 9', u5: 'Samajhdar Mausi 61', u6: 'Chillar Tiger 340',
};

const rows: Row[] = [
  { id: 'r1', user_id: 'u1', item: 'iPhone 17 Pro (256GB)', price_inr: 134900, category: 'Gadgets',
    reason: 'Mera iPhone 13 theek chal raha hai, bas camera upgrade chahiye aur sab office mein naya le aaye hain.',
    alternative: 'Battery change ₹6,500 mein', closes_at: at(18), outcome: null, created_at: at(-6) },
  { id: 'r2', user_id: 'u2', item: 'Raat 1 baje Biryani order', price_inr: 480, category: 'Khana',
    reason: 'Ghar pe dal chawal pada hai par mann nahi kar raha. Aaj ka din bahut lamba tha.',
    alternative: 'Maggi bana lo', closes_at: at(0.5), outcome: null, created_at: at(-23.5) },
  { id: 'r3', user_id: 'u3', item: 'Air fryer (sale price)', price_inr: 6499, category: 'Ghar',
    reason: 'Sale mein 40% off hai. Healthy khana banaunga, pakka. Last time wala sandwich maker bhi use karta hoon kabhi kabhi.',
    alternative: null, closes_at: at(9), outcome: null, created_at: at(-15) },
  { id: 'r4', user_id: 'u4', item: 'Goa trip with college friends', price_inr: 18000, category: 'Travel',
    reason: '5 saal se plan ban raha hai, is baar sab ready hain. Savings se jayega, EMI nahi.',
    alternative: 'Gokarna — sasta aur kam crowd', closes_at: at(20), outcome: null, created_at: at(-4) },
  { id: 'r5', user_id: 'u5', item: 'Skincare haul (7 products)', price_inr: 3200, category: 'Beauty',
    reason: 'Reel mein dekha 10-step routine. Abhi mere paas sirf facewash aur moisturiser hai.',
    alternative: 'Sirf sunscreen le lo pehle', closes_at: at(-2), outcome: null, created_at: at(-26) },
  { id: 'r6', user_id: 'u6', item: 'Mechanical keyboard', price_inr: 7800, category: 'Gadgets',
    reason: 'Din bhar coding karta hoon, wrist dard karti hai. Office wala keyboard bahut kharab hai.',
    alternative: 'Office se maang lo', closes_at: at(12), outcome: null, created_at: at(-12) },
  { id: 'r7', user_id: 'me', item: 'Sneakers (limited drop)', price_inr: 16995, category: 'Fashion',
    reason: 'Pichle 2 saal se ek hi joota pehen raha hoon. Par yeh wala thoda zyada mehenga hai.',
    alternative: 'Regular running shoes ₹4,000', closes_at: at(-30), outcome: 'skipped', created_at: at(-54) },
];

const votes = new Map<string, Map<string, Verdict>>(); // requestId → (userId → verdict)
const seedVotes = (id: string, yes: number, no: number) => {
  const m = new Map<string, Verdict>();
  for (let i = 0; i < yes; i++) m.set(`s${id}y${i}`, 'approve');
  for (let i = 0; i < no; i++) m.set(`s${id}n${i}`, 'reject');
  votes.set(id, m);
};
seedVotes('r1', 9, 41); seedVotes('r2', 23, 19); seedVotes('r3', 6, 14); seedVotes('r4', 37, 5);
seedVotes('r5', 3, 22); seedVotes('r6', 28, 4); seedVotes('r7', 7, 31);

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
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

function view(r: Row): FeedItem {
  const m = votes.get(r.id) ?? new Map<string, Verdict>();
  let a = 0, rej = 0;
  m.forEach((v) => (v === 'approve' ? a++ : rej++));
  return {
    ...r,
    handle: handles[r.user_id] ?? '—',
    approve_count: a,
    reject_count: rej,
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
      for (let k = 0; k < 2 + i; k++) m.set(`sim${id}${i}${k}`, Math.random() < 0.4 ? 'approve' : 'reject');
      votes.set(id, m);
      const uid = `u${1 + i}`;
      comments.push({ id: `c${++seq}`, request_id: id, user_id: uid, handle: handles[uid], body: lines[i], created_at: new Date().toISOString() });
    }, ms),
  );
}

export const mockApi: Api = {
  init: () => delay({ ...ME }),
  feed: () => delay(sorted().filter((r) => visible(r.user_id)).map(view)),
  mine: () => delay(sorted().filter((r) => r.user_id === ME.id).map(view)),
  get(id) {
    const r = rows.find((x) => x.id === id && visible(x.user_id));
    return delay(r ? view(r) : null);
  },
  comments: (id) => delay(comments.filter((c) => c.request_id === id && visible(c.user_id))),
  async create(r) {
    const id = `r${++seq}`;
    rows.push({ ...r, id, user_id: ME.id, closes_at: at(24), outcome: null, created_at: new Date().toISOString() });
    votes.set(id, new Map());
    simulateCrowd(id);
    return delay(id);
  },
  async vote(id, v) {
    const r = rows.find((x) => x.id === id);
    if (!r || r.user_id === ME.id) throw new Error('Apni arzi pe vote nahi kar sakte');
    if (new Date(r.closes_at).getTime() < Date.now()) throw new Error('Voting band ho gayi');
    (votes.get(id) ?? votes.set(id, new Map()).get(id)!).set(ME.id, v);
    await delay(null);
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
  report: () => delay(undefined),
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
  async deleteAccount() {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].user_id === ME.id) rows.splice(i, 1);
    ME.email = null;
    return delay({ ...ME });
  },
};
