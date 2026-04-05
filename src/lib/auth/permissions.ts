import { can as canFn, type Modulo, type Acao } from '@/types/permissions.types'
import type { UserRole } from '@/types/database.types'

// Hook-free version — usada no servidor e em componentes sem hook
export function checkPermission(role: UserRole, modulo: Modulo, acao: Acao): boolean {
  return canFn(role, modulo, acao)
}
