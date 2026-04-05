'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createColumnHelper, flexRender,
  getCoreRowModel, useReactTable,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { EtapaBadge } from './EtapaBadge'
import { TemperaturaBadge } from './TemperaturaBadge'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatPhone, formatRelative, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { DbLeadResumo } from '@/types/database.types'

const col = createColumnHelper<DbLeadResumo>()

const columns = [
  col.accessor('nome', {
    header: 'Nome',
    cell: info => (
      <div>
        <p className="font-medium text-gray-900">{info.getValue()}</p>
        <p className="text-xs text-gray-400">{formatPhone(info.row.original.telefone)}</p>
      </div>
    ),
  }),
  col.accessor('area_juridica', {
    header: 'Área',
    cell: info => (
      <span className="text-sm text-gray-600 capitalize">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
  col.accessor('etapa_comercial', {
    header: 'Etapa',
    cell: info => <EtapaBadge etapa={info.getValue()} />,
  }),
  col.accessor('temperatura', {
    header: 'Temp.',
    cell: info => <TemperaturaBadge temperatura={info.getValue()} />,
  }),
  col.accessor('responsavel_comercial_nome', {
    header: 'Responsável',
    cell: info => (
      <span className="text-sm text-gray-600">{info.getValue() ?? '—'}</span>
    ),
  }),
  col.accessor('valor_proposto', {
    header: 'Valor',
    cell: info => (
      <span className="text-sm font-medium text-gray-700">
        {info.getValue() ? formatCurrency(info.getValue()!) : '—'}
      </span>
    ),
  }),
  col.accessor('tarefas_vencidas', {
    header: '⚠',
    cell: info => info.getValue() > 0 ? (
      <span className="inline-flex w-5 h-5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full items-center justify-center">
        {info.getValue()}
      </span>
    ) : null,
  }),
  col.accessor('updated_at', {
    header: 'Atualizado',
    cell: info => <span className="text-xs text-gray-400">{formatRelative(info.getValue())}</span>,
  }),
]

interface LeadTableProps {
  filters?: Record<string, string>
}

export function LeadTable({ filters }: LeadTableProps) {
  const router  = useRouter()
  const [page,  setPage]  = useState(1)
  const [sort,  setSort]  = useState({ field: 'updated_at', direction: 'desc' as 'asc' | 'desc' })

  const { data, isLoading } = trpc.leads.list.useQuery({
    page,
    per_page:       20,
    sort_field:     sort.field,
    sort_direction: sort.direction,
    search:         filters?.search,
    area_juridica:  filters?.area_juridica,
    temperatura:    filters?.temperatura as any,
    responsavel_id: filters?.responsavel_id,
  })

  const table = useReactTable({
    data:            data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount:       data?.total_pages ?? 0,
  })

  function toggleSort(field: string) {
    setSort(s => ({
      field,
      direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  if (isLoading) return <TableSkeleton />

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={() => toggleSort(header.id)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sort.field === header.id ? (
                        sort.direction === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                onClick={() => router.push(`/leads/${row.original.id}`)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {(data?.data.length === 0) && (
          <div className="py-16 text-center text-sm text-gray-400">
            Nenhum lead encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Paginação */}
      {(data?.total_pages ?? 0) > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
          <span className="text-sm text-gray-500">
            {data?.total} leads — Página {page} de {data?.total_pages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data?.total_pages ?? 1, p + 1))}
              disabled={page === (data?.total_pages ?? 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
