'use client'

import { useState } from 'react'

const TARGETING_TYPES = [
  { value: 'GLOBAL',       icon: '🌐', label: 'Todos',     desc: 'Todos os usuários do app' },
  { value: 'CLIENTE',      icon: '👤', label: 'CPF',       desc: 'Um cliente específico (por CPF)' },
  { value: 'CIDADE',       icon: '🏙️', label: 'Cidade',    desc: 'Todos os clientes de uma cidade' },
  { value: 'BAIRRO_CIDADE',icon: '🏘️', label: 'Bairro',    desc: 'Clientes de um bairro em uma cidade' },
  { value: 'CEP',          icon: '📮', label: 'CEP',       desc: 'Clientes com o CEP exato' },
  { value: 'RUA',          icon: '🛣️', label: 'Rua',       desc: 'Clientes na rua identificada pelo CEP' },
  { value: 'CEP_NUMERO',   icon: '🏠', label: 'Endereço',  desc: 'Endereço exato (CEP + número)' },
]

const INPUT_CLS = 'w-full bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#9c0004] transition-colors'
const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'

export default function PushTab({ showToast }) {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [targetingType, setTargetingType] = useState('GLOBAL')
  const [cpf, setCpf]       = useState('')
  const [cidade, setCidade] = useState('')
  const [bairro, setBairro] = useState('')
  const [cep, setCep]       = useState('')
  const [numero, setNumero] = useState('')
  const [loading, setLoading] = useState(false)

  function buildTarget() {
    switch (targetingType) {
      case 'GLOBAL':       return { targeting_type: 'GLOBAL' }
      case 'CLIENTE':      return { targeting_type: 'CLIENTE',      targeting_value: cpf.trim() }
      case 'CIDADE':       return { targeting_type: 'CIDADE',       targeting_value: cidade.trim() }
      case 'BAIRRO_CIDADE':return { targeting_type: 'BAIRRO_CIDADE',targeting_value: `${bairro.trim()}:${cidade.trim()}` }
      case 'CEP':          return { targeting_type: 'CEP',          targeting_value: cep.trim() }
      case 'RUA':          return { targeting_type: 'RUA',          targeting_value: cep.trim() }
      case 'CEP_NUMERO':   return { targeting_type: 'CEP_NUMERO',   targeting_value: `${cep.trim()}:${numero.trim()}` }
      default:             return { targeting_type: 'GLOBAL' }
    }
  }

  function validate() {
    if (!title.trim()) return 'Informe o título da notificação.'
    if (!body.trim())  return 'Informe o texto da notificação.'
    if (targetingType === 'CLIENTE' && !cpf.trim())    return 'Informe o CPF.'
    if (targetingType === 'CIDADE'  && !cidade.trim()) return 'Informe a cidade.'
    if (targetingType === 'BAIRRO_CIDADE') {
      if (!bairro.trim()) return 'Informe o bairro.'
      if (!cidade.trim()) return 'Informe a cidade.'
    }
    if (['RUA', 'CEP', 'CEP_NUMERO'].includes(targetingType) && !cep.trim()) return 'Informe o CEP.'
    if (targetingType === 'CEP_NUMERO' && !numero.trim()) return 'Informe o número.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { showToast(err, 'error'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), targets: [buildTarget()] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Erro ao enviar notificação.')
      const queued = data.queued ?? '?'
      showToast(`Notificação enviada para ${queued} destinatário(s).`)
      setTitle(''); setBody(''); setCpf(''); setCidade(''); setBairro(''); setCep(''); setNumero('')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const needsCidade = targetingType === 'CIDADE' || targetingType === 'BAIRRO_CIDADE'
  const needsBairro = targetingType === 'BAIRRO_CIDADE'
  const needsCep    = targetingType === 'RUA' || targetingType === 'CEP' || targetingType === 'CEP_NUMERO'
  const needsNumero = targetingType === 'CEP_NUMERO'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 flex flex-col gap-5 max-w-2xl">
      {/* Title */}
      <div>
        <label className={LABEL_CLS}>Título</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Título da notificação"
          className={INPUT_CLS}
        />
      </div>

      {/* Body */}
      <div>
        <label className={LABEL_CLS}>Mensagem</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Texto da notificação..."
          className={INPUT_CLS + ' resize-none'}
        />
      </div>

      {/* Targeting type */}
      <div>
        <label className={LABEL_CLS}>Destinatários</label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {TARGETING_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTargetingType(t.value)}
              className={`flex flex-col items-center gap-1 border px-2 py-2.5 text-xs font-medium transition cursor-pointer ${
                targetingType === t.value
                  ? 'border-[#9c0004] bg-[#9c0004]/5 text-[#9c0004]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {TARGETING_TYPES.find(t => t.value === targetingType)?.desc}
        </p>
      </div>

      {/* Dynamic fields */}
      {targetingType === 'CLIENTE' && (
        <div>
          <label className={LABEL_CLS}>CPF</label>
          <input
            type="text"
            value={cpf}
            onChange={e => setCpf(e.target.value)}
            placeholder="00000000000"
            maxLength={14}
            className={INPUT_CLS}
          />
        </div>
      )}

      {needsCidade && (
        <div>
          <label className={LABEL_CLS}>Cidade</label>
          <input
            type="text"
            value={cidade}
            onChange={e => setCidade(e.target.value)}
            placeholder="Ex: NITERÓI"
            className={INPUT_CLS}
          />
        </div>
      )}

      {needsBairro && (
        <div>
          <label className={LABEL_CLS}>Bairro</label>
          <input
            type="text"
            value={bairro}
            onChange={e => setBairro(e.target.value)}
            placeholder="Ex: Icaraí"
            className={INPUT_CLS}
          />
        </div>
      )}

      {needsCep && (
        <div>
          <label className={LABEL_CLS}>CEP</label>
          <input
            type="text"
            value={cep}
            onChange={e => setCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className={INPUT_CLS}
          />
        </div>
      )}

      {needsNumero && (
        <div>
          <label className={LABEL_CLS}>Número</label>
          <input
            type="text"
            value={numero}
            onChange={e => setNumero(e.target.value)}
            placeholder="Ex: 100"
            className={INPUT_CLS}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="self-start bg-[#9c0004] hover:bg-[#7a0003] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 transition cursor-pointer"
      >
        {loading ? 'Enviando...' : 'Enviar Notificação'}
      </button>
    </form>
  )
}
