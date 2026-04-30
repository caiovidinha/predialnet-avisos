'use client'

import { useEffect } from 'react'

export default function ConfirmDialog({ title, text, onCancel, onOk }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-400">{text}</p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onOk}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
