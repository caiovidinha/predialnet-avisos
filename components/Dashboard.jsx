'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AlertCard from './AlertCard'
import CreateAlertModal from './CreateAlertModal'
import DetailModal from './DetailModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const PAGE_LIMIT = 10

export default function Dashboard() {
  const router = useRouter()

  // List state
  const [alerts, setAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('ativos') // 'ativos' | 'todos'
  const [loading, setLoading] = useState(false)

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [detailAlert, setDetailAlert] = useState(null)
  const [editAlert, setEditAlert] = useState(null)
  const [confirm, setConfirm] = useState(null) // { title, text, onOk }

  // Toast
  const [toast, setToast] = useState(null) // { msg, type }

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
  }, [])

  const loadAlerts = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const includeInactive = filter === 'todos'
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_LIMIT),
        includeInactive: String(includeInactive),
      })
      const res = await fetch(`/api/messages?${params}`)
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error('Erro ao buscar alertas')
      const data = await res.json()
      setAlerts(data.items || [])
      setTotal(data.total || 0)
      setPage(p)
    } catch (err) {
      showToast(err.message || 'Erro ao carregar alertas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [filter, page, router, showToast])

  useEffect(() => { loadAlerts(1) }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function handleToggle(alert) {
    try {
      const res = await fetch(`/api/messages/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !alert.active }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar alerta.')
      const action = !alert.active ? 'ativado' : 'desativado'
      showToast(`Alerta ${action} com sucesso.`)
      setDetailAlert(null)
      loadAlerts(page)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleDelete(alert) {
    setConfirm({
      title: 'Excluir alerta',
      text: `Deseja excluir o alerta "${alert.title}"? Esta ação não pode ser desfeita.`,
      onOk: async () => {
        try {
          const res = await fetch(`/api/messages/${alert.id}`, { method: 'DELETE' })
          if (!res.ok && res.status !== 204) throw new Error('Erro ao excluir alerta.')
          showToast('Alerta excluído com sucesso.')
          setDetailAlert(null)
          loadAlerts(1)
        } catch (err) {
          showToast(err.message, 'error')
        }
      },
    })
  }

  const ativos = alerts.filter(a => a.active).length
  const inativos = alerts.filter(a => !a.active).length
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/img/logo.webp" alt="Predialnet" className="h-7 w-auto" />
          <span className="text-gray-400">|</span>
          <span className="text-gray-500 text-sm font-medium">Painel de Alertas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-[#9c0004] hover:bg-[#7a0003] text-white text-sm font-semibold px-4 py-2 transition cursor-pointer"
          >
            + Novo Alerta
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-900 text-sm px-3 py-2 hover:bg-gray-100 transition cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: total },
            { label: 'Ativos', value: ativos },
            { label: 'Inativos', value: inativos },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 px-4 py-4 flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">{loading ? '–' : value}</span>
              <span className="text-xs text-gray-500 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 p-1">
            {['ativos', 'todos'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium transition capitalize cursor-pointer ${
                  filter === f
                    ? 'bg-[#9c0004] text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {f === 'ativos' ? 'Ativos' : 'Todos'}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAlerts(page)}
            title="Atualizar lista"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Alert list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-8 h-8 border-2 border-[#9c0004] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Carregando alertas...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Nenhum alerta encontrado.</p>
            <button onClick={() => setCreateOpen(true)} className="text-sm text-[#9c0004] hover:underline cursor-pointer">
              Criar o primeiro alerta
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onClick={() => setDetailAlert(alert)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => loadAlerts(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              ‹ Anterior
            </button>
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => loadAlerts(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              Próxima ›
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {createOpen && (
        <CreateAlertModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); loadAlerts(1); showToast('Alerta criado com sucesso!') }}
          showToast={showToast}
        />
      )}

      {editAlert && (
        <CreateAlertModal
          initialAlert={editAlert}
          onClose={() => setEditAlert(null)}
          onCreated={() => { setEditAlert(null); loadAlerts(page); showToast('Alerta atualizado com sucesso!') }}
          showToast={showToast}
        />
      )}

      {detailAlert && (
        <DetailModal
          alert={detailAlert}
          onClose={() => setDetailAlert(null)}
          onToggle={() => handleToggle(detailAlert)}
          onDelete={() => handleDelete(detailAlert)}
          onEdit={() => { setEditAlert(detailAlert); setDetailAlert(null) }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          text={confirm.text}
          onCancel={() => setConfirm(null)}
          onOk={async () => { await confirm.onOk(); setConfirm(null) }}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
