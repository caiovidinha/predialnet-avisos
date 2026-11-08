'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, maskCpf, maskToken } from '@/lib/utils'

const PAGE_LIMIT = 15

const STATUS_LABELS = {
  pending: { label: 'Pendente', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  sent: { label: 'Enviado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  delivered: { label: 'Entregue', cls: 'bg-green-50 text-green-700 border-green-200' },
  failed: { label: 'Falhou', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const STATUS_FILTROS = ['todos', 'pending', 'sent', 'delivered', 'failed']

export default function CampaignDetailModal({ campaign, onClose, showToast }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('todos')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (p = 1, st = status) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) })
      if (st !== 'todos') params.set('status', st)
      const res = await fetch(`/api/sistema-push/campanhas/${campaign.id}/destinatarios?${params}`)
      if (!res.ok) throw new Error('Erro ao buscar destinatários')
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      setPage(p)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [campaign.id, status, showToast])

  useEffect(() => { load(1, status) }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stats = campaign.stats || {}
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-gray-200 w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{campaign.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition p-1 hover:bg-gray-100 shrink-0 cursor-pointer">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-5 gap-3">
            {['pending', 'sent', 'delivered', 'failed', 'opened'].map((k) => (
              <div key={k} className="bg-gray-50 border border-gray-200 px-2 py-3 flex flex-col items-center">
                <span className="text-xl font-bold text-gray-900">{stats[k] ?? 0}</span>
                <span className="text-xs text-gray-500 mt-0.5 capitalize">{k === 'opened' ? 'Abertos' : STATUS_LABELS[k]?.label ?? k}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 p-1 self-start">
            {STATUS_FILTROS.map((f) => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className={`px-3 py-1 text-xs font-medium transition capitalize cursor-pointer ${
                  status === f ? 'bg-[#9c0004] text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {f === 'todos' ? 'Todos' : STATUS_LABELS[f]?.label ?? f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#9c0004] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">Nenhum destinatário encontrado.</p>
          ) : (
            <div className="border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-3 py-2 font-medium">CPF</th>
                    <th className="px-3 py-2 font-medium">Token</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Enviado em</th>
                    <th className="px-3 py-2 font-medium">Aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => {
                    const st = STATUS_LABELS[d.status] || { label: d.status, cls: 'bg-gray-100 text-gray-600 border-gray-300' }
                    return (
                      <tr key={d.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{maskCpf(d.cpf)}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{maskToken(d.token)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 border ${st.cls}`} title={d.errorCode || undefined}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{formatDate(d.sentAt)}</td>
                        <td className="px-3 py-2 text-center">{d.openedAt ? '✓' : '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                ‹ Anterior
              </button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Próxima ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
