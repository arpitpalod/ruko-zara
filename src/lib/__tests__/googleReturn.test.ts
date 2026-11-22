import { googleOutcome } from '../googleReturn';

const q = (s: string) => new URLSearchParams(s);

describe('coming back from Google', () => {
  it('a slow sign-in (over 5 minutes) keeps the person as they were', () => {
    expect(googleOutcome(q('error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired'))).toBe('failed');
  });
  it('switches only when that Google account is already someone else\'s', () => {
    expect(googleOutcome(q('error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user'))).toBe('switch');
    expect(googleOutcome(q('error=invalid_request&error_code=email_exists'))).toBe('switch');
  });
  it('cancelling on Google is quiet; other errors say so', () => {
    expect(googleOutcome(q('error=access_denied'))).toBe('cancelled');
    expect(googleOutcome(q('error=server_error&error_description=Unexpected'))).toBe('failed');
  });
  it('no error, nothing to do', () => {
    expect(googleOutcome(q('code=abc'))).toBeNull();
  });
});
