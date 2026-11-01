import { AppError } from '@zelqune/common';

/**
 * NIST SP 800-63B 3.1.1.2: no composition rules, but reject passwords that are known to be
 * common or that contain the person's own details. The length (10..128) is in the contract.
 * The list holds well-known leaked and keyboard passwords of 10+ characters (shorter ones fail
 * the length rule anyway) plus local favourites.
 */
const COMMON = new Set(
  `1234567890 0123456789 12345678910 1234567891 0987654321 1111111111 0000000000 1122334455
  1q2w3e4r5t 1qaz2wsx3edc qwertyuiop asdfghjkl; zxcvbnm123 qwerty1234 qwerty12345 qwertyuiop1
  password12 password123 password1234 passw0rd123 p@ssw0rd123 password!! iloveyou123 iloveyou12
  welcome123 welcome1234 letmein123 abcdefghij abc1234567 abcd123456 a123456789 aa12345678
  1234qwerty 123456789a 123456789q 12345678910a princess123 football123 baseball123 sunshine123
  superman123 starwars123 dragon1234 monkey12345 shadow1234 master1234 michael123 jennifer123
  computer123 internet123 trustno1234 changeme123 administrator admin12345 admin123456 root123456
  bangladesh bangladesh1 bangladesh123 dhaka12345 dhaka123456 allahisgreat bismillah bismillah123
  zelqune123 zelqune1234 zelqune2026 zelqunezelqune`
    .split(/\s+/)
    .filter(Boolean),
);

export function assertStrongPassword(password: string, own: (string | null | undefined)[]): void {
  const p = password.toLowerCase();
  const repeated = /^(.)\1+$/.test(p) || /^(..)\1+$/.test(p) || /^(...)\1+$/.test(p);
  const sequence = '01234567890123456789abcdefghijklmnopqrstuvwxyz'.includes(p);
  const personal = own
    .flatMap((v) => (v ?? '').toLowerCase().split(/[@\s.+_-]+/))
    .filter((part) => part.length >= 4)
    .some((part) => p.includes(part));
  if (COMMON.has(p) || repeated || sequence || personal) {
    throw new AppError(
      'WEAK_PASSWORD',
      'Choose a less common password that does not contain your name, email or phone',
      400,
    );
  }
}
