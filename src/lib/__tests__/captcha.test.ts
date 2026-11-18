/// <reference types="jest" />
// The bot-check bridge between the sign-in code and the hidden Cloudflare widget.
type Captcha = typeof import('../captcha');

function load(siteKey: string): Captcha {
  process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = siteKey;
  let mod!: Captcha;
  jest.isolateModules(() => {
    mod = require('../captcha');
  });
  return mod;
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
  jest.useRealTimers();
});

it('does nothing when no site key is set', async () => {
  const c = load('');
  expect(c.captchaOn).toBe(false);
  await expect(c.getCaptchaToken()).resolves.toBeUndefined();
});

it('waits for the widget, even if sign-in asks before the widget is ready', async () => {
  const c = load('0xTEST');
  const rounds: number[] = [];
  const first = c.getCaptchaToken();
  const second = c.getCaptchaToken();
  c.subscribeCaptcha((r) => rounds.push(r));
  expect(rounds).toEqual([1]);

  c.captchaSolved('tok-1');
  await expect(first).resolves.toBe('tok-1');
  expect(rounds).toEqual([1, 2]); // tokens work once: the second caller gets a fresh widget run

  c.captchaBroken('110200');
  await expect(second).rejects.toThrow('CAPTCHA_FAILED: 110200');
  expect(rounds).toEqual([1, 2, 0]); // idle again
});

it('gives up after 15 s, or 2 min once a tap is asked for', async () => {
  jest.useFakeTimers();
  const c = load('0xTEST');
  c.subscribeCaptcha(() => {});
  const quick = c.getCaptchaToken();
  jest.advanceTimersByTime(15001);
  await expect(quick).rejects.toThrow('timeout');

  const tap = c.getCaptchaToken();
  c.captchaInteractive();
  jest.advanceTimersByTime(60000);
  c.captchaSolved('tok-late');
  await expect(tap).resolves.toBe('tok-late');
});

it('knows which widget errors are permanent', () => {
  const c = load('0xTEST');
  expect(c.isFatalCaptchaError('110200')).toBe(true);
  expect(c.isFatalCaptchaError('script')).toBe(true);
  expect(c.isFatalCaptchaError('300030')).toBe(false);
});

it('only trusts messages from its own page', () => {
  const c = load('0xTEST');
  expect(c.parseCaptchaMsg('{"source":"rz-captcha","type":"token","token":"x"}')?.token).toBe('x');
  expect(c.parseCaptchaMsg('{"source":"other","type":"token","token":"x"}')).toBeNull();
  expect(c.parseCaptchaMsg('not json')).toBeNull();
});
