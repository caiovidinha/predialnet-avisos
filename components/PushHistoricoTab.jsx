'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import CampaignCard from './CampaignCard'
import CampaignDetailModal from './CampaignDetailModal'

const PAGE_LIMIT = 10

export default function PushHistoricoTab({ showToast }) {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) })
      const res = await fetch(`/api/sistema-push/campanhas?${params}`)
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error('Erro ao buscar campanhas de push')
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      setPage(p)
    } catch (err) {
      showToast(err.message || 'Erro ao carregar campanhas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, router, showToast])

  useEffect(() => { load(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PAGE_LIMIT)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Campanhas de push enviadas, mais recentes primeiro.</p>
        <button
          onClick={() => load(page)}
          title="Atualizar lista"
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-8 h-8 border-2 border-[#9c0004] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Carregando campanhas...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p>Nenhuma campanha enviada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <CampaignCard key={c.id} campaign={c} onClick={() => setDetail(c)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
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

      {detail && (
        <CampaignDetailModal campaign={detail} onClose={() => setDetail(null)} showToast={showToast} />
      )}
    </div>
  )
}
