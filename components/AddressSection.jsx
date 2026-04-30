'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { normalize, formatCep, debounce } from '@/lib/utils'

const UF = 'RJ'

// Shared input style
const INPUT_CLS = 'w-full bg-[#1a1d23] border border-[#2e3340] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:bg-[#1e2128] transition-colors'
const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'
const DROP_CLS  = 'absolute z-30 top-full left-0 right-0 mt-0.5 bg-[#1a1d23] border border-[#2e3340] rounded shadow-2xl max-h-52 overflow-y-auto'

let ibgeCache = null

async function fetchIbgeCidades() {
  if (ibgeCache) return ibgeCache
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RJ/municipios')
  const data = await res.json()
  ibgeCache = data.map(c => c.nome)
  return ibgeCache
}

export default function AddressSection({ showNumero, value, onChange }) {
  // ── Cidade ──
  const [cidadeQuery, setCidadeQuery]     = useState('')
  const [cidadeSel, setCidadeSel]         = useState('')
  const [cidadeOpts, setCidadeOpts]       = useState([])
  const cidadeRef = useRef(null)

  // ── Bairro ──
  const [bairroQuery, setBairroQuery]     = useState('')
  const [bairroOpts, setBairroOpts]       = useState([])
  const [bairroLoading, setBairroLoading] = useState(false)
  const [bairroSel, setBairroSel]         = useState('')
  const bairroRef = useRef(null)

  // ── Rua ──
  const [ruaQuery, setRuaQuery]           = useState('')
  const [ruaOpts, setRuaOpts]             = useState([])
  const [ruaLoading, setRuaLoading]       = useState(false)
  const ruaRef = useRef(null)

  function resetFromCity() {
    setBairroQuery(''); setBairroOpts([]); setBairroSel('')
    setRuaQuery('');    setRuaOpts([])
    onChange({ cep: '', logradouro: '', numero: value.numero })
  }

  function resetFromBairro() {
    setRuaQuery(''); setRuaOpts([])
    onChange({ cep: '', logradouro: '', numero: value.numero })
  }

  // ── Cidade autocomplete ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchCidade = useCallback(debounce(async (q) => {
    if (q.length < 2) { setCidadeOpts([]); return }
    const all = await fetchIbgeCidades()
    const nq = normalize(q)
    setCidadeOpts(all.filter(c => normalize(c).startsWith(nq)).slice(0, 8))
  }, 250), [])

  function handleCidadeInput(q) {
    setCidadeQuery(q)
    setCidadeSel('')
    resetFromCity()
    searchCidade(q)
  }

  function selectCidade(c) {
    setCidadeSel(c)
    setCidadeQuery(c)
    setCidadeOpts([])
    resetFromCity()
  }

  // ── Bairro autocomplete (ViaCEP lista bairros via logradouro vazio não funciona,
  //    então usamos um search com rua=' ' para pegar bairros únicos) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchBairro = useCallback(debounce(async (cidade, q) => {
    if (!cidade || q.length < 2) { setBairroOpts([]); return }
    setBairroLoading(true)
    try {
      // ViaCEP não tem endpoint só de bairros; fazemos busca por logradouro = query
      // e extraímos bairros únicos dos resultados
      const url = `https://viacep.com.br/ws/${encodeURIComponent(UF)}/${encodeURIComponent(cidade)}/${encodeURIComponent(q)}/json/`
      const res = await fetch(url)
      const data = await res.json()
      if (!Array.isArray(data)) { setBairroOpts([]); return }
      const bairros = [...new Set(data.filter(d => !d.erro && d.bairro).map(d => d.bairro))].slice(0, 10)
      setBairroOpts(bairros)
    } catch {
      setBairroOpts([])
    } finally {
      setBairroLoading(false)
    }
  }, 450), [])

  function handleBairroInput(q) {
    setBairroQuery(q)
    setBairroSel('')
    resetFromBairro()
    searchBairro(cidadeSel, q)
  }

  function selectBairro(b) {
    setBairroSel(b)
    setBairroQuery(b)
    setBairroOpts([])
    resetFromBairro()
  }

  // ── Rua autocomplete ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchRua = useCallback(debounce(async (cidade, bairro, q) => {
    if (!cidade || q.length < 3) { setRuaOpts([]); return }
    setRuaLoading(true)
    try {
      const url = `https://viacep.com.br/ws/${encodeURIComponent(UF)}/${encodeURIComponent(cidade)}/${encodeURIComponent(q)}/json/`
      const res = await fetch(url)
      const data = await res.json()
      if (!Array.isArray(data)) { setRuaOpts([]); return }
      let results = data.filter(d => !d.erro)
      // If a bairro is selected, prefer results from that bairro first
      if (bairro) {
        const nb = normalize(bairro)
        results.sort((a, b) => {
          const am = normalize(a.bairro || '').includes(nb) ? 0 : 1
          const bm = normalize(b.bairro || '').includes(nb) ? 0 : 1
          return am - bm
        })
      }
      setRuaOpts(results.slice(0, 10))
    } catch {
      setRuaOpts([])
    } finally {
      setRuaLoading(false)
    }
  }, 450), [])

  function handleRuaInput(q) {
    setRuaQuery(q)
    onChange({ cep: '', logradouro: q, numero: value.numero })
    searchRua(cidadeSel, bairroSel, q)
  }

  function selectRua(r) {
    setRuaQuery(r.logradouro)
    setRuaOpts([])
    // Also fill bairro if not already set
    if (!bairroSel && r.bairro) {
      setBairroSel(r.bairro)
      setBairroQuery(r.bairro)
    }
    onChange({ cep: r.cep.replace(/\D/g, ''), logradouro: r.logradouro, numero: value.numero })
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (cidadeRef.current && !cidadeRef.current.contains(e.target)) setCidadeOpts([])
      if (bairroRef.current && !bairroRef.current.contains(e.target)) setBairroOpts([])
      if (ruaRef.current   && !ruaRef.current.contains(e.target))     setRuaOpts([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const cidadeOk  = !!cidadeSel
  const bairroOk  = !!bairroSel  // optional — rua search works without it
  const cepOk     = !!value.cep

  return (
    <div className="flex flex-col gap-0 border border-[#2e3340] rounded divide-y divide-[#2e3340]">

      {/* Row header */}
      <div className="px-3 py-2 bg-[#14161b] flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Localização</span>
        <span className="text-[10px] text-gray-600">· Estado fixo: RJ</span>
      </div>

      {/* Cidade */}
      <div className="p-3 relative" ref={cidadeRef}>
        <label className={LABEL_CLS}>
          Cidade {!cidadeOk && <span className="text-yellow-600 normal-case tracking-normal font-normal">— obrigatório</span>}
        </label>
        <input
          type="text"
          value={cidadeQuery}
          onChange={(e) => handleCidadeInput(e.target.value)}
          placeholder="Ex: Rio de Janeiro, Niterói..."
          autoComplete="off"
          className={INPUT_CLS}
        />
        {cidadeOpts.length > 0 && (
          <ul className={DROP_CLS}>
            {cidadeOpts.map((c) => (
              <li key={c} onMouseDown={() => selectCidade(c)}
                className="px-3 py-2 text-sm text-gray-200 hover:bg-[#22262f] cursor-pointer border-b border-[#2e3340] last:border-0">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bairro */}
      <div className="p-3 relative" ref={bairroRef}>
        <label className={LABEL_CLS}>
          Bairro <span className="normal-case tracking-normal font-normal text-gray-600">(opcional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={bairroQuery}
            onChange={(e) => handleBairroInput(e.target.value)}
            disabled={!cidadeOk}
            placeholder={cidadeOk ? 'Ex: Copacabana, Centro...' : 'Selecione a cidade primeiro'}
            autoComplete="off"
            className={INPUT_CLS + (!cidadeOk ? ' opacity-40 cursor-not-allowed' : '')}
          />
          {bairroLoading && <Spinner />}
        </div>
        {bairroOpts.length > 0 && (
          <ul className={DROP_CLS}>
            {bairroOpts.map((b) => (
              <li key={b} onMouseDown={() => selectBairro(b)}
                className="px-3 py-2 text-sm text-gray-200 hover:bg-[#22262f] cursor-pointer border-b border-[#2e3340] last:border-0">
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Logradouro */}
      <div className="p-3 relative" ref={ruaRef}>
        <label className={LABEL_CLS}>
          Rua / Logradouro {!cepOk && <span className="text-yellow-600 normal-case tracking-normal font-normal">— selecione uma sugestão</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={ruaQuery}
            onChange={(e) => handleRuaInput(e.target.value)}
            disabled={!cidadeOk}
            placeholder={cidadeOk ? 'Digite o nome da rua...' : 'Selecione a cidade primeiro'}
            autoComplete="off"
            className={INPUT_CLS + (!cidadeOk ? ' opacity-40 cursor-not-allowed' : '')}
          />
          {ruaLoading && <Spinner />}
        </div>
        {ruaOpts.length > 0 && (
          <ul className={DROP_CLS}>
            {ruaOpts.map((r, i) => (
              <li key={i} onMouseDown={() => selectRua(r)}
                className="px-3 py-2 hover:bg-[#22262f] cursor-pointer border-b border-[#2e3340] last:border-0">
                <div className="text-sm text-white">{r.logradouro}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.bairro} · CEP {formatCep(r.cep)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CEP result bar */}
      <div className={`px-3 py-2 flex items-center gap-2 text-xs ${cepOk ? 'bg-green-900/20' : 'bg-[#14161b]'}`}>
        <span className={cepOk ? 'text-green-400' : 'text-gray-600'}>▸ CEP</span>
        <span className={`font-mono ${cepOk ? 'text-green-300' : 'text-gray-600'}`}>
          {cepOk ? formatCep(value.cep) : '–'}
        </span>
        {cepOk && (
          <button type="button"
            onClick={() => { onChange({ cep: '', logradouro: '', numero: value.numero }); setRuaQuery(''); setRuaOpts([]) }}
            className="ml-auto text-gray-600 hover:text-red-400 transition cursor-pointer">
            limpar
          </button>
        )}
      </div>

      {/* Número */}
      {showNumero && (
        <div className="p-3">
          <label className={LABEL_CLS}>Número do imóvel</label>
          <input
            type="text"
            value={value.numero}
            onChange={(e) => onChange({ ...value, numero: e.target.value })}
            placeholder="Ex: 123, 45B, S/N"
            className={INPUT_CLS}
          />
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  )
}
