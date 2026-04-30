'use client'

import { useEffect } from 'react'
import { TargetTags } from './AlertCard'
import { formatDate } from '@/lib/utils'

export default function DetailModal({ alert, onClose, onToggle, onDelete }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-white truncate">{alert.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition p-1 rounded-lg hover:bg-gray-800 shrink-0 cursor-pointer">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          <Field label="Título (interno)" value={alert.title} />

          <div>
            <div className="text-xs text-gray-400 mb-1.5">Mensagem ao cliente</div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {alert.msg_cliente}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Duração" value={`${alert.timeout_sec}s`} />
            <Field
              label="Status"
              value={
                <span className={alert.active ? 'text-green-400' : 'text-gray-400'}>
                  {alert.active ? '✅ Ativo' : '⏸️ Inativo'}
                </span>
              }
            />
            <Field label="Criado em" value={formatDate(alert.created_at)} />
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-2">Destinatários</div>
            <TargetTags targets={alert.targets || []} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 transition cursor-pointer"
          >
            Excluir
          </button>
          <button
            onClick={onToggle}
            className={`px-5 py-2 text-sm rounded-lg font-medium transition cursor-pointer ${
              alert.active
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {alert.active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  )
}
