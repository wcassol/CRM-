import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return phone
}

export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export function formatDateLabel(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d))    return `Hoje, ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `Amanhã, ${format(d, 'HH:mm')}`
  return format(d, "dd 'de' MMMM, HH:mm", { locale: ptBR })
}

export function isOverdue(date: string | Date): boolean {
  return isPast(new Date(date))
}

export function formatPercent(value: number): string {
  return `${value}%`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}
