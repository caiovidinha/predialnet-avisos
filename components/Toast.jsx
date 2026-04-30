'use client'

import { useEffect } from 'react'

export default function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [onDone])

  const styles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
  }

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${styles[type] || styles.info} animate-fade-in`}
      role="status"
    >
      {msg}
    </div>
  )
}
