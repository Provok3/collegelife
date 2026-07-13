// Deep links / handles for paying a student back. The app never handles money:
// Venmo and Cash App open the payer's own app with the amount pre-filled; Zelle
// and Apple Cash have no payment URL scheme, so the handle is shown to copy.
//
// Formats verified against current provider behavior (July 2026):
//   Venmo:    https://venmo.com/<user>?txn=pay&amount=<amt>&note=<note>
//   Cash App: https://cash.app/$<cashtag>/<amount>
// Venmo web links hand off to the Venmo app on mobile; on desktop they open the
// Venmo site (transaction can't be initiated there, but the profile resolves).

export interface PayMethod {
  key: 'venmo' | 'cashapp' | 'zelle' | 'apple_cash'
  label: string
  /** Deep link to open (Venmo / Cash App), or null for copy-only (Zelle / Apple Cash). */
  href: string | null
  /** The raw handle, shown for copy-only methods. */
  handle: string
}

interface MoneyRequestHandleData {
  venmo?: string | null
  cashtag?: string | null
  zelle?: string | null
  apple_cash?: string | null
}

/**
 * Build the list of ways a parent can pay a given money request, from the
 * handles embedded in the notification payload. Only methods with a handle set
 * are returned.
 */
export function payMethodsFromData(
  data: MoneyRequestHandleData | null | undefined,
  amount: number,
  note?: string | null,
): PayMethod[] {
  if (!data) return []
  const methods: PayMethod[] = []
  const amt = Number(amount)
  const amountStr = Number.isFinite(amt) ? amt.toFixed(2) : ''
  const encodedNote = encodeURIComponent(note?.trim() || '')

  if (data.venmo) {
    methods.push({
      key: 'venmo',
      label: 'Venmo',
      href: `https://venmo.com/${encodeURIComponent(data.venmo)}?txn=pay&amount=${amountStr}&note=${encodedNote}`,
      handle: `@${data.venmo}`,
    })
  }
  if (data.cashtag) {
    // Cash App's documented links use a bare amount in the path (e.g. /10);
    // drop a trailing ".00" for whole dollars, keep cents otherwise.
    const cashAmount = Number.isInteger(amt) ? String(amt) : amountStr
    methods.push({
      key: 'cashapp',
      label: 'Cash App',
      href: `https://cash.app/$${encodeURIComponent(data.cashtag)}/${cashAmount}`,
      handle: `$${data.cashtag}`,
    })
  }
  if (data.zelle) {
    methods.push({ key: 'zelle', label: 'Zelle', href: null, handle: data.zelle })
  }
  if (data.apple_cash) {
    methods.push({ key: 'apple_cash', label: 'Apple Cash', href: null, handle: data.apple_cash })
  }
  return methods
}
