// =============================================================================
// CRM JURÍDICO — ZAPSIGN CLIENT
// =============================================================================

interface CreateDocumentParams {
  lead_id:      string
  template_id?: string
}

interface CreateDocumentResult {
  token:   string
  doc_url: string
}

export class ZapSignClient {
  private readonly baseUrl = 'https://api.zapsign.com.br/api/v1'
  private readonly token: string

  constructor() {
    const token = process.env.ZAPSIGN_API_TOKEN
    if (!token) throw new Error('ZAPSIGN_API_TOKEN não configurado')
    this.token = token
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type':  'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`ZapSign API error ${res.status}: ${body}`)
    }

    return res.json()
  }

  async createDocument(params: CreateDocumentParams): Promise<CreateDocumentResult> {
    const body: Record<string, unknown> = {
      name:        `Contrato - Lead ${params.lead_id}`,
      lang:        'pt-br',
      external_id: params.lead_id,
    }

    if (params.template_id) {
      body.template_id = params.template_id
    }

    const data = await this.fetch<{ token: string; original_file: string }>(
      '/docs/',
      { method: 'POST', body: JSON.stringify(body) }
    )

    return { token: data.token, doc_url: data.original_file }
  }

  async getDocumentStatus(token: string) {
    return this.fetch<{ token: string; status: string; signed_at?: string }>(
      `/docs/${token}/`
    )
  }

  // Validação de HMAC do webhook
  static validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }
}
