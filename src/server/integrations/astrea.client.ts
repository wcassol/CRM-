// =============================================================================
// CRM JURÍDICO — ASTREA CLIENT
// Gestão de processos jurídicos no Astrea
// Docs: https://docs.astrea.net.br/api
// =============================================================================

export interface AstreaProcesso {
  id:           string
  titulo:       string
  numero?:      string   // número do processo judicial se houver
  status:       string
  area:         string
  cliente:      { id: string; nome: string; cpf?: string }
  responsavel:  { id: string; nome: string }
  created_at:   string
}

export interface AstreaCliente {
  id:        string
  nome:      string
  cpf?:      string
  email?:    string
  telefone?: string
}

interface CriarProcessoParams {
  titulo:             string
  area_juridica:      string
  descricao:          string
  cliente_nome:       string
  cliente_cpf?:       string
  cliente_email?:     string
  cliente_telefone?:  string
  responsavel_id?:    string    // ID do advogado no Astrea
  lead_id:            string    // referência externa
  urgente?:           boolean
}

export class AstreaClient {
  private readonly baseUrl: string
  private readonly token:   string

  constructor() {
    const token = process.env.ASTREA_API_TOKEN
    if (!token) throw new Error('ASTREA_API_TOKEN não configurado')

    this.baseUrl = process.env.ASTREA_BASE_URL ?? 'https://api.astrea.net.br/v1'
    this.token   = token
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        ...options?.headers,
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Astrea API error ${res.status} em ${path}: ${body}`)
    }

    return res.json()
  }

  // ─── Clientes ─────────────────────────────────────────────────────────────

  /** Busca cliente por CPF ou cria um novo */
  async getOrCreateCliente(params: {
    nome:      string
    cpf?:      string
    email?:    string
    telefone?: string
  }): Promise<AstreaCliente> {
    // Tentar encontrar por CPF
    if (params.cpf) {
      const cpfLimpo = params.cpf.replace(/\D/g, '')
      const results  = await this.fetch<{ data: AstreaCliente[] }>(
        `/clientes?cpf=${cpfLimpo}&limit=1`
      )
      if (results.data.length > 0) {
        return results.data[0]!
      }
    }

    // Criar novo cliente
    return this.fetch<AstreaCliente>('/clientes', {
      method: 'POST',
      body:   JSON.stringify({
        nome:     params.nome,
        cpf:      params.cpf?.replace(/\D/g, '') ?? undefined,
        email:    params.email ?? undefined,
        telefone: params.telefone?.replace(/\D/g, '') ?? undefined,
      }),
    })
  }

  // ─── Processos ────────────────────────────────────────────────────────────

  /** Cria um processo/caso jurídico no Astrea */
  async criarProcesso(params: CriarProcessoParams): Promise<AstreaProcesso> {
    // 1. Garantir que o cliente existe no Astrea
    const cliente = await this.getOrCreateCliente({
      nome:      params.cliente_nome,
      cpf:       params.cliente_cpf,
      email:     params.cliente_email,
      telefone:  params.cliente_telefone,
    })

    // 2. Mapear área jurídica → área do Astrea
    const AREA_MAP: Record<string, string> = {
      previdenciario: 'previdenciario',
      trabalhista:    'trabalhista',
      consumidor:     'consumidor',
      civil:          'civel',
      criminal:       'criminal',
      familia:        'familia',
      tributario:     'tributario',
    }

    // 3. Criar processo
    return this.fetch<AstreaProcesso>('/processos', {
      method: 'POST',
      body:   JSON.stringify({
        titulo:         params.titulo,
        descricao:      params.descricao,
        area:           AREA_MAP[params.area_juridica] ?? params.area_juridica,
        cliente_id:     cliente.id,
        responsavel_id: params.responsavel_id ?? undefined,
        referencia:     `crm:${params.lead_id}`,   // rastreabilidade bidirecional
        urgente:        params.urgente ?? false,
        status:         'ativo',
      }),
    })
  }

  /** Busca processo pelo external_reference (lead_id do CRM) */
  async getProcessoPorRef(lead_id: string): Promise<AstreaProcesso | null> {
    const results = await this.fetch<{ data: AstreaProcesso[] }>(
      `/processos?referencia=crm:${lead_id}&limit=1`
    )
    return results.data[0] ?? null
  }

  /** Busca todos os processos de um cliente */
  async getProcessosCliente(cliente_id: string): Promise<AstreaProcesso[]> {
    const results = await this.fetch<{ data: AstreaProcesso[] }>(
      `/processos?cliente_id=${cliente_id}`
    )
    return results.data
  }

  /** Atualiza status do processo */
  async atualizarStatus(processo_id: string, status: string): Promise<void> {
    await this.fetch(`/processos/${processo_id}`, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
    })
  }

  /** Adiciona anotação ao processo */
  async adicionarAnotacao(processo_id: string, texto: string): Promise<void> {
    await this.fetch(`/processos/${processo_id}/anotacoes`, {
      method: 'POST',
      body:   JSON.stringify({ texto }),
    })
  }

  /** Busca lista de advogados/responsáveis cadastrados no Astrea */
  async getAdvogados(): Promise<Array<{ id: string; nome: string; email: string }>> {
    const results = await this.fetch<{ data: Array<{ id: string; nome: string; email: string }> }>(
      '/usuarios?papel=advogado'
    )
    return results.data
  }
}
