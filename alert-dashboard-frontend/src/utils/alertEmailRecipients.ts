const STORAGE_KEY = 'hungerjet-alert-notification-recipients-v1'

export const DEFAULT_ALERT_RECIPIENTS = ['observeriqhungerjet@gmail.com']

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function loadStoredRecipients(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_ALERT_RECIPIENTS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_ALERT_RECIPIENTS]
    const emails = parsed
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(isValidEmail)
    return emails.length ? emails : [...DEFAULT_ALERT_RECIPIENTS]
  } catch {
    return [...DEFAULT_ALERT_RECIPIENTS]
  }
}

export function saveRecipientsToStorage(emails: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails))
}

/** Split pasted textarea content into unique valid emails (comma, semicolon, newline, space). */
export function parseEmailsFromText(text: string): string[] {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    if (!isValidEmail(p)) continue
    const lower = p.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(p)
  }
  return out
}
