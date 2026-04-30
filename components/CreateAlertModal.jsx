'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import AddressSection from './AddressSection'
import { normalize, debounce } from '@/lib/utils'

const SCOPES = [
  { value: 'GLOBAL', icon: '🌐', label: 'Todos',       desc: 'Todos os usuários' },
  { value: 'CIDADE', icon: '🏙️', label: 'Cidade',      desc: 'Por município' },
  { value: 'BAIRRO', icon: '🏘️', label: 'Bairro',      desc: 'Por bairro' },
  { value: 'RUA',    icon: '🛣️', label: 'Rua',         desc: 'Por logradouro' },
  { value: 'PREDIO', icon: '🏢', label: 'Prédio',      desc: 'Endereço exato' },
  { value: 'CPF',    icon: '👤', label: 'CPF',         desc: 'Cliente específico' },
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

// Reusable city + neighborhood autocomplete hook-like component
function CidadeField({ value, onChange, onSelect, placeholder }) {
  const [opts, setOpts] = useState([])
  const ref = useRef(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const search = useCallback(debounce(async (q) => {
    if (q.length < 2) { setOpts([]); return }
    const all = await fetchIbgeCidades()
    const nq = normalize(q)
    setOpts(all.filter(c => normalize(c).startsWith(nq)).slice(0, 8))
  }, 250), [])

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpts([]) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); onSelect(''); search(e.target.value) }}
        placeholder={placeholder || 'Ex: Rio de Janeiro, Niterói...'}
        autoComplete="off"
        className={INPUT_CLS}
      />
      {opts.length > 0 && (
        <ul className={DROP_CLS}>
          {opts.map((c) => (
            <li key={c} onMouseDown={() => { onChange(c); onSelect(c); setOpts([]) }}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BairroField({ cidade, value, onChange, onSelect }) {
  const [opts, setOpts]       = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const cacheRef = useRef([])

  useEffect(() => {
    cacheRef.current = []
    if (!cidade) return
    Promise.all(
      ['rua', 'avenida', 'estrada'].map(p =>
        fetch(`https://viacep.com.br/ws/RJ/${encodeURIComponent(cidade)}/${p}/json/`)
          .then(r => r.json()).catch(() => [])
      )
    ).then(results => {
      cacheRef.current = [...new Set(results.flat().filter(d => !d.erro && d.bairro).map(d => d.bairro))].sort()
    }).catch(() => {})
  }, [cidade])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const search = useCallback(debounce(async (cid, q) => {
    if (!cid || q.length < 2) { setOpts([]); return }
    const nq = normalize(q)
    const fromCache = cacheRef.current.filter(b => normalize(b).includes(nq))
    setLoading(true)
    try {
      const url = `https://viacep.com.br/ws/RJ/${encodeURIComponent(cid)}/${encodeURIComponent(q)}/json/`
      const res = await fetch(url)
      const data = await res.json()
      const fromApi = Array.isArray(data)
        ? [...new Set(data.filter(d => !d.erro && d.bairro).map(d => d.bairro))]
        : []
      setOpts([...new Set([...fromCache, ...fromApi])].slice(0, 10))
    } catch { setOpts(fromCache.slice(0, 10)) } finally { setLoading(false) }
  }, 350), [])

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpts([]) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const disabled = !cidade

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input type="text" value={value}
          onChange={(e) => { onChange(e.target.value); onSelect(''); search(cidade, e.target.value) }}
          disabled={disabled}
          placeholder={disabled ? 'Selecione a cidade primeiro' : 'Ex: Icaraí, Copacabana, Centro... ou digite livremente'}
          autoComplete="off"
          className={INPUT_CLS + (disabled ? ' opacity-40 cursor-not-allowed' : '')}
        />
        {loading && <Spinner />}
      </div>
      {opts.length > 0 && (
        <ul className={DROP_CLS}>
          {opts.map((b) => (
            <li key={b} onMouseDown={() => { onChange(b); onSelect(b); setOpts([]) }}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#9c0004] border-t-transparent rounded-full animate-spin" />
}

function initFromAlert(alert) {
  const targets = alert.targets || []
  const types = targets.map(t => t.targeting_type)
  let scope = 'GLOBAL'
  let cidadeNome = '', cidadeSel = ''
  let bCidadeNome = '', bCidadeSel = '', bairroNome = '', bairroSel = ''
  let cpfValue = ''
  let addr = { cep: '', logradouro: '', numero: '', ceps: [] }

  if (types.includes('CLIENTE')) {
    scope = 'CPF'
    const digits = targets.find(t => t.targeting_type === 'CLIENTE').targeting_value
    cpfValue = digits.length === 11
      ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
      : digits
  } else if (types.includes('CEP_NUMERO')) {
    scope = 'PREDIO'
    const cepNumTargets = targets.filter(t => t.targeting_type === 'CEP_NUMERO')
    const ceps = cepNumTargets.map(t => t.targeting_value.split(':')[0])
    const numero = cepNumTargets[0]?.targeting_value.split(':')[1] || ''
    addr = { cep: ceps[0] || '', logradouro: ceps[0] || '', numero, ceps }
  } else if (types.includes('CEP')) {
    scope = 'RUA'
    const cepTargets = targets.filter(t => t.targeting_type === 'CEP')
    const ceps = cepTargets.map(t => t.targeting_value)
    addr = { cep: ceps.length === 1 ? ceps[0] : '', logradouro: ceps[0] || '', numero: '', ceps }
  } else if (types.includes('BAIRRO_CIDADE')) {
    scope = 'BAIRRO'
    const val = targets.find(t => t.targeting_type === 'BAIRRO_CIDADE').targeting_value
    const [bairro, cidade] = val.split(':')
    bCidadeNome = cidade || ''; bCidadeSel = cidade || ''
    bairroNome = bairro || ''; bairroSel = bairro || ''
  } else if (types.includes('CIDADE')) {
    scope = 'CIDADE'
    const cidade = targets.find(t => t.targeting_type === 'CIDADE').targeting_value
    cidadeNome = cidade; cidadeSel = cidade
  }
  return { scope, cidadeNome, cidadeSel, bCidadeNome, bCidadeSel, bairroNome, bairroSel, cpfValue, addr }
}

export default function CreateAlertModal({ onClose, onCreated, showToast, initialAlert }) {
  const init = initialAlert ? initFromAlert(initialAlert) : null

  const [title, setTitle]   = useState(init ? initialAlert.title : '')
  const [msg, setMsg]       = useState(init ? initialAlert.msg_cliente : '')
  const [timeout, setTimeout_] = useState(init ? initialAlert.timeout_sec : 10)
  const [scope, setScope]   = useState(init ? init.scope : 'GLOBAL')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const titleRef = useRef(null)

  // CIDADE scope
  const [cidadeNome, setCidadeNome]   = useState(init?.cidadeNome ?? '')
  const [cidadeSel, setCidadeSel]     = useState(init?.cidadeSel ?? '')

  // BAIRRO scope
  const [bCidadeNome, setBCidadeNome] = useState(init?.bCidadeNome ?? '')
  const [bCidadeSel, setBCidadeSel]   = useState(init?.bCidadeSel ?? '')
  const [bairroNome, setBairroNome]   = useState(init?.bairroNome ?? '')
  const [bairroSel, setBairroSel]     = useState(init?.bairroSel ?? '')

  // CPF scope
  const [cpfValue, setCpfValue] = useState(init?.cpfValue ?? '')

  // RUA / PREDIO scope
  const [addr, setAddr] = useState(init?.addr ?? { cep: '', logradouro: '', numero: '', ceps: [] })

  useEffect(() => { titleRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function buildPreview() {
    switch (scope) {
      case 'GLOBAL': return 'Alerta para <strong>todos os usuários</strong> do aplicativo.'
      case 'CIDADE': return cidadeSel
        ? `Clientes da cidade <strong>${cidadeSel.toUpperCase()}</strong>.`
        : 'Selecione uma <strong>cidade</strong>.'
      case 'BAIRRO': return (bCidadeSel && bairroNome)
        ? `Clientes do bairro <strong>${bairroNome.toUpperCase()}</strong> — ${bCidadeSel.toUpperCase()}.`
        : 'Selecione <strong>cidade e bairro</strong>.'
      case 'CPF': {
        const d = cpfValue.replace(/\D/g, '')
        return d.length === 11 ? `Cliente CPF <strong>${cpfValue}</strong>.` : 'Informe o <strong>CPF</strong>.'
      }
      case 'RUA': {
        const hasCep = addr.cep || addr.ceps?.length > 0
        if (!hasCep) return 'Selecione uma <strong>rua</strong> no autocomplete.'
        if (!addr.cep && addr.ceps?.length > 0)
          return `Todos os CEPs — <strong>${addr.logradouro}</strong> (${addr.ceps.length} CEPs).`
        return `Rua <strong>${addr.logradouro}</strong> · CEP ${addr.cep}.`
      }
      case 'PREDIO': {
        const hasCep = addr.cep || addr.ceps?.length > 0
        if (!hasCep) return 'Selecione uma <strong>rua</strong> no autocomplete.'
        if (!addr.numero?.trim()) return 'Informe o <strong>número</strong>.'
        const count = addr.ceps?.length || 1
        return `<strong>${addr.logradouro}, Nº ${addr.numero}</strong> · ${count} CEP${count > 1 ? 's' : ''}.`
      }
      default: return ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) return setError('Informe o título do alerta.')
    if (!msg.trim())   return setError('Informe a mensagem para o cliente.')
    if (timeout < 5 || timeout > 120) return setError('A duração deve ser entre 5 e 120 segundos.')

    let targets

    switch (scope) {
      case 'GLOBAL':
        targets = [{ targeting_type: 'GLOBAL', targeting_value: '*' }]; break
      case 'CIDADE':
        if (!cidadeSel.trim()) return setError('Selecione uma cidade na lista.')
        targets = [{ targeting_type: 'CIDADE', targeting_value: cidadeSel.trim().toUpperCase() }]; break
      case 'BAIRRO':
        if (!bCidadeSel.trim()) return setError('Selecione a cidade do bairro.')
        if (!bairroNome.trim()) return setError('Informe o nome do bairro.')
        targets = [
          { targeting_type: 'BAIRRO_CIDADE', targeting_value: `${bairroNome.trim()}:${bCidadeSel.trim().toUpperCase()}` },
        ]; break
      case 'RUA': {
        const cepsRua = addr.cep ? [addr.cep] : (addr.ceps?.length > 0 ? addr.ceps : null)
        if (!cepsRua) return setError('Selecione uma rua no autocomplete.')
        targets = cepsRua.map(c => ({ targeting_type: 'CEP', targeting_value: c.replace(/\D/g, '') }))
        break
      }
      case 'PREDIO': {
        const hasCep = addr.cep || addr.ceps?.length > 0
        if (!hasCep)               return setError('Selecione uma rua no autocomplete.')
        if (!addr.numero?.trim())  return setError('Informe o número do imóvel.')
        const cepsPredi = addr.ceps?.length > 0 ? addr.ceps : [addr.cep]
        targets = cepsPredi.map(c => ({ targeting_type: 'CEP_NUMERO', targeting_value: `${c.replace(/\D/g, '')}:${addr.numero.trim()}` }))
        break
      }
      case 'CPF': {
        const digits = cpfValue.replace(/\D/g, '')
        if (digits.length !== 11) return setError('Informe um CPF válido com 11 dígitos.')
        targets = [{ targeting_type: 'CLIENTE', targeting_value: digits }]; break
      }
      default:
        return setError('Selecione um público-alvo.')
    }

    setLoading(true)
    try {
      const url = initialAlert ? `/api/messages/${initialAlert.id}` : '/api/messages'
      const method = initialAlert ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), msg_cliente: msg.trim(), timeout_sec: timeout, targets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || (initialAlert ? 'Erro ao editar alerta.' : 'Erro ao criar alerta.'))
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-[#9c0004]" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900">{initialAlert ? 'Editar Alerta' : 'Novo Alerta'}</span>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition text-lg leading-none px-1 cursor-pointer">✕</button>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} id="create-form"
          className="overflow-y-auto flex-1 flex flex-col divide-y divide-gray-200">

          {/* Título */}
          <div className="px-5 py-4">
            <label className={LABEL_CLS}>
              Título <span className="normal-case tracking-normal font-normal text-gray-400">— uso interno</span>
            </label>
            <input ref={titleRef} type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Ex: Manutenção preventiva – Centro"
              className={INPUT_CLS}
            />
          </div>

          {/* Mensagem */}
          <div className="px-5 py-4">
            <label className={LABEL_CLS}>Mensagem ao cliente</label>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)}
              rows={3} maxLength={500}
              placeholder="Ex: Manutenção na sua região hoje das 14h às 18h."
              className={INPUT_CLS + ' resize-none'}
            />
            <div className="text-right text-xs text-gray-400 mt-1">{msg.length}/500</div>
          </div>

          {/* Duração */}
          <div className="px-5 py-4 flex items-center gap-3">
            <label className={LABEL_CLS + ' mb-0 shrink-0'}>Duração</label>
            <input type="number" value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              min={5} max={120}
              className="w-20 bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#9c0004] transition-colors"
            />
            <span className="text-xs text-gray-400">segundos (5–120)</span>
          </div>

          {/* Público-alvo */}
          <div className="px-5 py-4">
            <label className={LABEL_CLS}>Público-alvo</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {SCOPES.map((s) => (
                <label key={s.value} className="cursor-pointer">
                  <input type="radio" name="scope" value={s.value}
                    checked={scope === s.value}
                    onChange={() => setScope(s.value)}
                    className="sr-only"
                  />
                  <div className={`border px-2 py-2.5 text-center transition cursor-pointer ${
                    scope === s.value
                      ? 'border-[#9c0004] bg-[#9c0004]/10 text-[#9c0004]'
                      : 'border-gray-200 bg-[#f5f5f5] text-gray-500 hover:border-gray-400 hover:text-gray-700'
                  }`}>
                    <div className="text-base mb-1">{s.icon}</div>
                    <div className="text-xs font-semibold leading-none">{s.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── Campos dinâmicos ── */}

          {scope === 'CIDADE' && (
            <div className="px-5 py-4">
              <label className={LABEL_CLS}>Cidade</label>
              <CidadeField value={cidadeNome} onChange={setCidadeNome} onSelect={setCidadeSel} />
            </div>
          )}

          {scope === 'BAIRRO' && (
            <div className="px-5 py-4 flex flex-col gap-3">
              <div>
                <label className={LABEL_CLS}>Cidade</label>
                <CidadeField value={bCidadeNome} onChange={setBCidadeNome} onSelect={setBCidadeSel} />
              </div>
              <div>
                <label className={LABEL_CLS}>Bairro</label>
                <BairroField cidade={bCidadeSel} value={bairroNome}
                  onChange={setBairroNome} onSelect={setBairroSel} />
              </div>
            </div>
          )}

          {scope === 'CPF' && (
            <div className="px-5 py-4">
              <label className={LABEL_CLS}>CPF do cliente</label>
              <input type="text" value={cpfValue}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                  let fmt = digits
                  if (digits.length > 9) fmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
                  else if (digits.length > 6) fmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`
                  else if (digits.length > 3) fmt = `${digits.slice(0,3)}.${digits.slice(3)}`
                  setCpfValue(fmt)
                }}
                placeholder="000.000.000-00"
                maxLength={14}
                className={INPUT_CLS + ' font-mono tracking-widest'}
              />
            </div>
          )}

          {(scope === 'RUA' || scope === 'PREDIO') && (
            <div className="px-5 py-4">
              <AddressSection showNumero={scope === 'PREDIO'} value={addr} onChange={setAddr} />
            </div>
          )}

          {/* Preview */}
          <div className="px-5 py-3 bg-gray-50 flex items-start gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 mt-0.5">Alvo</span>
            <p className="text-sm text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: buildPreview() }} />
          </div>

          {/* Erro */}
          {error && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </form>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit" form="create-form" disabled={loading}
            className="px-5 py-2 text-sm bg-[#9c0004] hover:bg-[#7a0003] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white font-bold transition">
            {loading ? (initialAlert ? 'Salvando...' : 'Criando...') : (initialAlert ? 'Salvar Alterações' : 'Criar e Ativar')}
          </button>
        </div>
      </div>
    </div>
  )
}
