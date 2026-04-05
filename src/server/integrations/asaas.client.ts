// =============================================================================
// CRM JURÍDICO — ASAAS CLIENT
// =============================================================================

interface CreateChargeParams {
  nome:       string
  cpfCnpj:    string
  email?:     string
  valor:      number
  vencimento: string   // YYYY-MM-DD
  descricao?: string
}

interface AsaasCharge {
  id:         string
  status:     string
  value:      number
  dueDate:    string
  invoiceUrl: string | null
  bankSlipUrl: string | null
}

export class AsaasClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor() {
    const apiKey = process.env.ASAAS_API_KEY
    if (!apiKey) throw new Error('ASAAS_API_KEY não configurado')

    const env = process.env.ASAAS_ENVIRONMENT ?? 'sandbox'
    this.baseUrl = env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3'
    this.apiKey = apiKey
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Asaas API error ${res.status}: ${body}`)
    }

    return res.json()
  }

  // Busca ou cria cliente no Asaas
  async getOrCreateCustomer(params: { nome: string; cpfCnpj: string; email?: string }) {
    // Tenta encontrar existente
    const existing = await this.fetch<{ data: Array<{ id: string }> }>(
      `/customers?cpfCnpj=${params.cpfCnpj.replace(/\D/g, '')}`
    )

    if (existing.data.length > 0) {
      return existing.data[0]!.id
    }

    const created = await this.fetch<{ id: string }>('/customers', {
      method: 'POST',
      body:   JSON.stringify({
        name:     params.nome,
        cpfCnpj:  params.cpfCnpj.replace(/\D/g, ''),
        email:    params.email,
      }),
    })

    return created.id
  }

  async createCharge(params: CreateChargeParams): Promise<AsaasCharge> {
    const customerId = await this.getOrCreateCustomer({
      nome:     params.nome,
      cpfCnpj:  params.cpfCnpj,
      email:    params.email,
    })

    return this.fetch<AsaasCharge>('/payments', {
      method: 'POST',
      body:   JSON.stringify({
        customer:    customerId,
        billingType: 'UNDEFINED',   // cliente escolhe a forma
        value:       params.valor,
        dueDate:     params.vencimento,
        description: params.descricao ?? 'Honorários advocatícios',
      }),
    })
  }

  async getCharge(asaasId: string): Promise<AsaasCharge> {
    return this.fetch<AsaasCharge>(`/payments/${asaasId}`)
  }

  // Validação do token de webhook do Asaas
  static validateWebhookToken(token: string): boolean {
    return token === process.env.ASAAS_WEBHOOK_TOKEN
  }
}
