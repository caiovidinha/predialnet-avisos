'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import AddressSection from './AddressSection'
import { normalize, debounce } from '@/lib/utils'

const TARGETING_TYPES = [
  { value: 'GLOBAL',       icon: '🌐', label: 'Todos',     desc: 'Todos os usuários do app' },
  { value: 'CLIENTE',      icon: '👤', label: 'CPF',       desc: 'Um cliente específico (por CPF)' },
  { value: 'CIDADE',       icon: '🏙️', label: 'Cidade',    desc: 'Todos os clientes de uma cidade' },
  { value: 'BAIRRO_CIDADE',icon: '🏘️', label: 'Bairro',    desc: 'Clientes de um bairro em uma cidade' },
  { value: 'CEP',          icon: '📍', label: 'Rua / CEP', desc: 'Clientes na rua (por CEP)' },
  { value: 'CEP_NUMERO',   icon: '🏠', label: 'Endereço',  desc: 'Endereço exato (CEP + número)' },
]

const INPUT_CLS = 'w-full bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#9c0004] transition-colors'
const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'
const DROP_CLS  = 'absolute z-30 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 shadow-2xl max-h-52 overflow-y-auto'

let ibgeCache = null
async function fetchIbgeCidades() {
  if (ibgeCache) return ibgeCache
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RJ/municipios')
  const data = await res.json()
  ibgeCache = data.map(c => c.nome)
  return ibgeCache
}

const bairroCacheGlobal = {}

function Spinner() {
  return <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#9c0004] border-t-transparent rounded-full animate-spin" />
}

export default function PushTab({ showToast }) {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [targetingType, setTargetingType] = useState('GLOBAL')
  const [loading, setLoading] = useState(false)

  // CLIENTE
  const [cpf, setCpf] = useState('')

  // CIDADE
  const [cidadeQuery, setCidadeQuery] = useState('')
  const [cidadeSel, setCidadeSel]     = useState('')
  const [cidadeOpts, setCidadeOpts]   = useState([])
  const cidadeRef = useRef(null)

  // BAIRRO_CIDADE — cidade
  const [bCidadeQuery, setBCidadeQuery] = useState('')
  const [bCidadeSel, setBCidadeSel]     = useState('')
  const [bCidadeOpts, setBCidadeOpts]   = useState([])
  const bCidadeRef = useRef(null)
  // BAIRRO_CIDADE — bairro
  const [bairroQuery, setBairroQuery]     = useState('')
  const [bairroSel, setBairroSel]         = useState('')
  const [bairroOpts, setBairroOpts]       = useState([])
  const [bairroLoading, setBairroLoading] = useState(false)
  const bairroRef = useRef(null)
  const bairroCacheRef = useRef([])

  // RUA / CEP / CEP_NUMERO
  const [addr, setAddr] = useState({ cep: '', logradouro: '', numero: '', ceps: [] })

  // ── Cidade autocomplete (CIDADE scope) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchCidade = useCallback(debounce(async (q) => {
    if (q.length < 2) { setCidadeOpts([]); return }
    const all = await fetchIbgeCidades()
    const nq = normalize(q)
    setCidadeOpts(all.filter(c => normalize(c).startsWith(nq)).slice(0, 8))
  }, 250), [])

  // ── Cidade autocomplete (BAIRRO_CIDADE scope) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchBCidade = useCallback(debounce(async (q) => {
    if (q.length < 2) { setBCidadeOpts([]); return }
    const all = await fetchIbgeCidades()
    const nq = normalize(q)
    setBCidadeOpts(all.filter(c => normalize(c).startsWith(nq)).slice(0, 8))
  }, 250), [])

  // ── Seed bairro cache when city is selected ──
  useEffect(() => {
    bairroCacheRef.current = []
    if (!bCidadeSel) return
    if (bairroCacheGlobal[bCidadeSel]) { bairroCacheRef.current = bairroCacheGlobal[bCidadeSel]; return }
    Promise.all(
      ['rua', 'avenida', 'estrada'].map(p =>
        fetch(`https://viacep.com.br/ws/RJ/${encodeURIComponent(bCidadeSel)}/${p}/json/`)
          .then(r => r.json()).catch(() => [])
      )
    ).then(results => {
      const all = [...new Set(results.flat().filter(d => !d.erro && d.bairro).map(d => d.bairro))].sort()
      bairroCacheRef.current = all
      bairroCacheGlobal[bCidadeSel] = all
    }).catch(() => {})
  }, [bCidadeSel])

  // ── Bairro autocomplete ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchBairro = useCallback(debounce(async (cidade, q) => {
    if (!cidade || q.length < 2) { setBairroOpts([]); return }
    const nq = normalize(q)
    const fromCache = bairroCacheRef.current.filter(b => normalize(b).includes(nq))
    setBairroLoading(true)
    try {
      const url = `https://viacep.com.br/ws/RJ/${encodeURIComponent(cidade)}/${encodeURIComponent(q)}/json/`
      const res = await fetch(url)
      const data = await res.json()
      const fromApi = Array.isArray(data)
        ? [...new Set(data.filter(d => !d.erro && d.bairro).map(d => d.bairro))]
        : []
      setBairroOpts([...new Set([...fromCache, ...fromApi])].slice(0, 10))
    } catch {
      setBairroOpts(fromCache.slice(0, 10))
    } finally {
      setBairroLoading(false)
    }
  }, 350), [])

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handler(e) {
      if (cidadeRef.current  && !cidadeRef.current.contains(e.target))  setCidadeOpts([])
      if (bCidadeRef.current && !bCidadeRef.current.contains(e.target)) setBCidadeOpts([])
      if (bairroRef.current  && !bairroRef.current.contains(e.target))  setBairroOpts([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function buildTargets() {
    switch (targetingType) {
      case 'GLOBAL':
        return [{ targeting_type: 'GLOBAL' }]
      case 'CLIENTE': {
        const digits = cpf.replace(/\D/g, '')
        return [{ targeting_type: 'CLIENTE', targeting_value: digits }]
      }
      case 'CIDADE':
        return [{ targeting_type: 'CIDADE', targeting_value: cidadeSel.trim().toUpperCase() }]
      case 'BAIRRO_CIDADE':
        return [{ targeting_type: 'BAIRRO_CIDADE', targeting_value: `${bairroQuery.trim()}:${bCidadeSel.trim().toUpperCase()}` }]
      case 'CEP': {
        const ceps = addr.ceps?.length > 0 ? addr.ceps : [addr.cep.replace(/\D/g, '')]
        return ceps.map(c => ({ targeting_type: 'CEP', targeting_value: c }))
      }
      case 'CEP_NUMERO': {
        const ceps = addr.ceps?.length > 0 ? addr.ceps : [addr.cep.replace(/\D/g, '')]
        return ceps.map(c => ({ targeting_type: 'CEP_NUMERO', targeting_value: `${c}:${addr.numero.trim()}` }))
      }
      default:
        return [{ targeting_type: 'GLOBAL' }]
    }
  }

  function validate() {
    if (!title.trim()) return 'Informe o título da notificação.'
    if (!body.trim())  return 'Informe o texto da notificação.'
    switch (targetingType) {
      case 'CLIENTE': {
        const digits = cpf.replace(/\D/g, '')
        if (digits.length !== 11) return 'Informe um CPF válido com 11 dígitos.'
        break
      }
      case 'CIDADE':
        if (!cidadeSel.trim()) return 'Selecione uma cidade na lista.'
        break
      case 'BAIRRO_CIDADE':
        if (!bCidadeSel.trim())   return 'Selecione a cidade do bairro.'
        if (!bairroQuery.trim())  return 'Informe o bairro.'
        break
      case 'CEP':
        if (!addr.cep && !(addr.ceps?.length > 0)) return 'Selecione uma rua no autocomplete.'
        break
      case 'CEP_NUMERO':
        if (!addr.cep && !(addr.ceps?.length > 0)) return 'Selecione uma rua no autocomplete.'
        if (!addr.numero?.trim()) return 'Informe o número do imóvel.'
        break
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { showToast(err, 'error'); return }

    setLoading(true)
    try {
      const targets = buildTargets()
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), targets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Erro ao enviar notificação.')
      showToast(`Notificação enviada para ${data.queued ?? '?'} destinatário(s).`)
      setTitle(''); setBody('')
      setCpf('')
      setCidadeQuery(''); setCidadeSel('')
      setBCidadeQuery(''); setBCidadeSel(''); setBairroQuery(''); setBairroSel('')
      setAddr({ cep: '', logradouro: '', numero: '', ceps: [] })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const needsAddr = targetingType === 'CEP' || targetingType === 'CEP_NUMERO'

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

      {/* CLIENTE — CPF com máscara */}
      {targetingType === 'CLIENTE' && (
        <div>
          <label className={LABEL_CLS}>CPF do cliente</label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
              let fmt = digits
              if (digits.length > 9) fmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
              else if (digits.length > 6) fmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`
              else if (digits.length > 3) fmt = `${digits.slice(0,3)}.${digits.slice(3)}`
              setCpf(fmt)
            }}
            placeholder="000.000.000-00"
            maxLength={14}
            className={INPUT_CLS}
          />
        </div>
      )}

      {/* CIDADE — autocomplete IBGE */}
      {targetingType === 'CIDADE' && (
        <div>
          <label className={LABEL_CLS}>Cidade</label>
          <div className="relative" ref={cidadeRef}>
            <input
              type="text"
              value={cidadeQuery}
              onChange={(e) => { setCidadeQuery(e.target.value); setCidadeSel(''); searchCidade(e.target.value) }}
              placeholder="Ex: Rio de Janeiro, Niterói..."
              autoComplete="off"
              className={INPUT_CLS}
            />
            {cidadeOpts.length > 0 && (
              <ul className={DROP_CLS}>
                {cidadeOpts.map((c) => (
                  <li key={c}
                    onMouseDown={() => { setCidadeQuery(c); setCidadeSel(c); setCidadeOpts([]) }}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* BAIRRO_CIDADE — autocomplete cidade + bairro */}
      {targetingType === 'BAIRRO_CIDADE' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={LABEL_CLS}>Cidade</label>
            <div className="relative" ref={bCidadeRef}>
              <input
                type="text"
                value={bCidadeQuery}
                onChange={(e) => {
                  setBCidadeQuery(e.target.value)
                  setBCidadeSel('')
                  setBairroQuery(''); setBairroSel('')
                  searchBCidade(e.target.value)
                }}
                placeholder="Ex: Rio de Janeiro, Niterói..."
                autoComplete="off"
                className={INPUT_CLS}
              />
              {bCidadeOpts.length > 0 && (
                <ul className={DROP_CLS}>
                  {bCidadeOpts.map((c) => (
                    <li key={c}
                      onMouseDown={() => { setBCidadeQuery(c); setBCidadeSel(c); setBCidadeOpts([]); setBairroQuery(''); setBairroSel('') }}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>
              Bairro <span className="normal-case tracking-normal font-normal text-gray-400">(ou digite livremente)</span>
            </label>
            <div className="relative" ref={bairroRef}>
              <input
                type="text"
                value={bairroQuery}
                onChange={(e) => {
                  setBairroQuery(e.target.value)
                  setBairroSel('')
                  searchBairro(bCidadeSel, e.target.value)
                }}
                disabled={!bCidadeSel}
                placeholder={bCidadeSel ? 'Ex: Icaraí, Copacabana...' : 'Selecione a cidade primeiro'}
                autoComplete="off"
                className={INPUT_CLS + (!bCidadeSel ? ' opacity-40 cursor-not-allowed' : '')}
              />
              {bairroLoading && <Spinner />}
              {bairroOpts.length > 0 && (
                <ul className={DROP_CLS}>
                  {bairroOpts.map((b) => (
                    <li key={b}
                      onMouseDown={() => { setBairroQuery(b); setBairroSel(b); setBairroOpts([]) }}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RUA / CEP / CEP_NUMERO — AddressSection (cidade + bairro + rua/CEP) */}
      {needsAddr && (
        <AddressSection
          showNumero={targetingType === 'CEP_NUMERO'}
          value={addr}
          onChange={setAddr}
        />
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
