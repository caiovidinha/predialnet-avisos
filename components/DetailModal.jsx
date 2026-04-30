'use client'

import { useEffect } from 'react'
import { TargetTags } from './AlertCard'
import { formatDate } from '@/lib/utils'

export default function DetailModal({ alert, onClose, onToggle, onDelete, onEdit }) {
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
      <div className="bg-white border border-gray-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{alert.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition p-1 hover:bg-gray-100 shrink-0 cursor-pointer">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          <Field label="Título (interno)" value={alert.title} />

          <div>
            <div className="text-xs text-gray-500 mb-1.5">Mensagem ao cliente</div>
            <div className="bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {alert.msg_cliente}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Duração" value={`${alert.timeout_sec}s`} />
            <Field
              label="Status"
              value={
                <span className={alert.active ? 'text-green-600' : 'text-gray-400'}>
                  {alert.active ? '✅ Ativo' : '⏸️ Inativo'}
                </span>
              }
            />
            <Field label="Criado em" value={formatDate(alert.created_at)} />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">Destinatários</div>
            <TargetTags targets={alert.targets || []} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
          >
            Excluir
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition cursor-pointer"
            >
              Editar
            </button>
            <button
              onClick={onToggle}
              className={`px-5 py-2 text-sm font-medium transition cursor-pointer ${
                alert.active
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-[#9c0004] hover:bg-[#7a0003] text-white'
              }`}
            >
              {alert.active ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  )
}
