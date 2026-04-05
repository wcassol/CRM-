// =============================================================================
// CRM JURÍDICO — CAL.COM CLIENT
// =============================================================================

export interface CalcomBooking {
  uid:          string
  title:        string
  startTime:    string   // ISO 8601
  endTime:      string
  meetingUrl?:  string
  status:       'ACCEPTED' | 'CANCELLED' | 'PENDING' | 'REJECTED'
  attendees:    Array<{ name: string; email: string; timeZone: string }>
  organizer:    { name: string; email: string }
  responses?:   Record<string, { label: string; value: string }>
}

export interface CalcomWebhookPayload {
  triggerEvent:
    | 'BOOKING_CREATED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_RESCHEDULED'
    | 'MEETING_ENDED'
  createdAt:    string
  payload:      CalcomBooking
}

export class CalcomClient {
  private readonly baseUrl = 'https://api.cal.com/v1'
  private readonly apiKey:  string

  constructor() {
    const key = process.env.CALCOM_API_KEY
    if (!key) throw new Error('CALCOM_API_KEY não configurado')
    this.apiKey = key
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}${path.includes('?') ? '&' : '?'}apiKey=${this.apiKey}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Cal.com API error ${res.status}: ${body}`)
    }

    return res.json()
  }

  /** Busca detalhes de uma reserva pelo UID */
  async getBooking(uid: string): Promise<CalcomBooking> {
    return this.fetch<CalcomBooking>(`/bookings/${uid}`)
  }

  /** Cancela uma reserva */
  async cancelBooking(uid: string, reason?: string): Promise<void> {
    await this.fetch(`/bookings/${uid}/cancel`, {
      method: 'DELETE',
      body:   JSON.stringify({ reason }),
    })
  }

  /**
   * Valida a assinatura HMAC do webhook do Cal.com.
   * Cal.com envia o header `X-Cal-Signature-256: <hmac-sha256>`
   */
  static validateWebhookSignature(
    rawBody:   string,
    signature: string,
    secret:    string
  ): boolean {
    const crypto = require('crypto') as typeof import('crypto')
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
    try {
      return crypto.timingSafeEqual(
        Buffer.from(`sha256=${expected}`),
        Buffer.from(signature)
      )
    } catch {
      return false
    }
  }
}
