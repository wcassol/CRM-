// =============================================================================
// CRM JURÍDICO — PERMISSIONS TYPES
// =============================================================================

import type { UserRole } from './database.types'

// ─── Módulos e ações disponíveis ─────────────────────────────────────────────

export type Modulo =
  | 'dashboard'
  | 'leads'
  | 'triagem'
  | 'documentos'
  | 'reunioes'
  | 'propostas'
  | 'contratos'
  | 'cobracas'
  | 'onboarding'
  | 'tarefas'
  | 'relatorios'
  | 'usuarios'
  | 'configuracoes'
  | 'audit_logs'

export type Acao =
  | 'ver'
  | 'ver_todos'
  | 'criar'
  | 'editar'
  | 'deletar'
  | 'validar'
  | 'upload'
  | 'enviar_astrea'

export type PermissionMap = {
  [M in Modulo]?: Partial<Record<Acao, boolean>>
}

// ─── Context de autenticação passado pelo tRPC ───────────────────────────────

export interface UserContext {
  userId:    string
  email:     string
  role:      UserRole
  fullName:  string
  avatarUrl: string | null
}

// ─── Helpers de verificação ───────────────────────────────────────────────────

// Usado em: usePermission() hook + can() utilitário do servidor
export type CanFn = (modulo: Modulo, acao: Acao) => boolean

// Resultado de verificação de permissão
export interface PermissionCheck {
  allowed:  boolean
  reason?:  string
}

// ─── Mapa de permissões por role (sincronizado com seed do banco) ─────────────
// Fonte de verdade é o banco; este tipo é usado para validação no servidor
// antes de fazer queries — evita round-trips desnecessários.

export const ROLE_PERMISSIONS: Record<UserRole, PermissionMap> = {
  admin: {
    dashboard:    { ver: true, ver_todos: true },
    leads:        { ver: true, criar: true, editar: true, deletar: true, ver_todos: true },
    triagem:      { ver: true, editar: true },
    documentos:   { ver: true, validar: true, upload: true },
    reunioes:     { ver: true, criar: true, editar: true },
    propostas:    { ver: true, criar: true, editar: true },
    contratos:    { ver: true, criar: true, editar: true },
    cobracas:     { ver: true, criar: true, editar: true },
    onboarding:   { ver: true, editar: true, enviar_astrea: true },
    tarefas:      { ver: true, criar: true, editar: true, ver_todos: true },
    relatorios:   { ver: true },
    usuarios:     { ver: true, criar: true, editar: true, deletar: true },
    configuracoes:{ ver: true, editar: true },
    audit_logs:   { ver: true },
  },

  comercial: {
    dashboard:    { ver: true, ver_todos: false },
    leads:        { ver: true, criar: true, editar: true, deletar: false, ver_todos: false },
    triagem:      { ver: true, editar: true },
    documentos:   { ver: true, validar: false, upload: true },
    reunioes:     { ver: true, criar: true, editar: true },
    propostas:    { ver: true, criar: true, editar: true },
    contratos:    { ver: true, criar: true, editar: false },
    cobracas:     { ver: true, criar: false, editar: false },
    onboarding:   { ver: false },
    tarefas:      { ver: true, criar: true, editar: true, ver_todos: false },
    relatorios:   { ver: false },
    usuarios:     { ver: false },
    configuracoes:{ ver: false },
    audit_logs:   { ver: false },
  },

  pre_juridico: {
    dashboard:    { ver: true, ver_todos: false },
    leads:        { ver: true, criar: false, editar: false, ver_todos: false },
    triagem:      { ver: true, editar: true },
    documentos:   { ver: true, validar: true, upload: false },
    reunioes:     { ver: true, criar: false },
    propostas:    { ver: true, criar: false },
    contratos:    { ver: false },
    cobracas:     { ver: false },
    onboarding:   { ver: false },
    tarefas:      { ver: true, criar: true, editar: true, ver_todos: false },
    relatorios:   { ver: false },
    usuarios:     { ver: false },
    configuracoes:{ ver: false },
    audit_logs:   { ver: false },
  },

  juridico: {
    dashboard:    { ver: true, ver_todos: false },
    leads:        { ver: true, criar: false, editar: false, ver_todos: false },
    triagem:      { ver: true, editar: false },
    documentos:   { ver: true, validar: false, upload: false },
    reunioes:     { ver: true, criar: false },
    propostas:    { ver: true, criar: false },
    contratos:    { ver: true, criar: false },
    cobracas:     { ver: false },
    onboarding:   { ver: true, editar: true, enviar_astrea: true },
    tarefas:      { ver: true, criar: true, editar: true, ver_todos: false },
    relatorios:   { ver: false },
    usuarios:     { ver: false },
    configuracoes:{ ver: false },
    audit_logs:   { ver: false },
  },

  financeiro: {
    dashboard:    { ver: true, ver_todos: true },
    leads:        { ver: true, criar: false, editar: false, ver_todos: false },
    triagem:      { ver: false },
    documentos:   { ver: false },
    reunioes:     { ver: false },
    propostas:    { ver: true, criar: false },
    contratos:    { ver: true, criar: false },
    cobracas:     { ver: true, criar: true, editar: true },
    onboarding:   { ver: false },
    tarefas:      { ver: true, criar: true, editar: true, ver_todos: false },
    relatorios:   { ver: true },
    usuarios:     { ver: false },
    configuracoes:{ ver: false },
    audit_logs:   { ver: false },
  },
} as const

// Função pura de verificação de permissão
export function can(role: UserRole, modulo: Modulo, acao: Acao): boolean {
  return ROLE_PERMISSIONS[role]?.[modulo]?.[acao] === true
}
