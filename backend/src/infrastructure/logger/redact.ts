const PHONE_REGEX = /(\+?\d{1,3}[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const PII_PATTERNS: [RegExp, (m: string) => string][] = [
  [EMAIL_REGEX, (m) => {
    const [local, domain] = m.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }],
  [PHONE_REGEX, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 8) return m;
    return digits.slice(0, 2) + '****' + digits.slice(-2);
  }],
];

export function redactPII(input: string): string {
  let result = input;
  for (const [regex, replacer] of PII_PATTERNS) {
    result = result.replace(regex, replacer);
  }
  return result;
}

export function redactPhone(phone: string | undefined | null): string {
  if (!phone) return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return digits.slice(0, 2) + '****' + digits.slice(-2);
}

export function redactEmail(email: string | undefined | null): string {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.charAt(0)}***@${domain}`;
}

export function redactName(name: string | undefined | null): string {
  if (!name) return '***';
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p.charAt(0) + '***').join(' ');
}
