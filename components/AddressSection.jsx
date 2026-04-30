'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { normalize, formatCep, debounce } from '@/lib/utils'

const UF = 'RJ'

// Shared input style
const INPUT_CLS = 'w-full bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#9c0004] transition-colors'
const LABEL_CLS = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'
const DROP_CLS  = 'absolute z-30 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 shadow-2xl max-h-52 overflow-y-auto'
const DROP_CLS_UP = 'absolute z-30 bottom-full left-0 right-0 mb-0.5 bg-white border border-gray-200 shadow-2xl max-h-60 overflow-y-auto'

// Module-level bairro cache (by city name)
const bairroCacheGlobal = {}

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

  // Bairro cache (seeded from ViaCEP when city is selected)
  const bairroCacheRef = useRef([])
  useEffect(() => {
    bairroCacheRef.current = []
    if (!cidadeSel) return
    if (bairroCacheGlobal[cidadeSel]) { bairroCacheRef.current = bairroCacheGlobal[cidadeSel]; return }
    Promise.all(
      ['rua', 'avenida', 'estrada'].map(p =>
        fetch(`https://viacep.com.br/ws/${UF}/${encodeURIComponent(cidadeSel)}/${p}/json/`)
          .then(r => r.json()).catch(() => [])
      )
    ).then(results => {
      const all = [...new Set(results.flat().filter(d => !d.erro && d.bairro).map(d => d.bairro))].sort()
      bairroCacheRef.current = all
      bairroCacheGlobal[cidadeSel] = all
    }).catch(() => {})
  }, [cidadeSel])

  function resetFromCity() {
    setBairroQuery(''); setBairroOpts([]); setBairroSel('')
    setRuaQuery('');    setRuaOpts([])
    onChange({ cep: '', logradouro: '', numero: value.numero, ceps: [] })
  }

  function resetFromBairro() {
    setRuaQuery(''); setRuaOpts([])
    onChange({ cep: '', logradouro: '', numero: value.numero, ceps: [] })
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

  // ── Bairro autocomplete: usa cache de bairros por cidade + busca live ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchBairro = useCallback(debounce(async (cidade, q) => {
    if (!cidade || q.length < 2) { setBairroOpts([]); return }
    const nq = normalize(q)
    const fromCache = bairroCacheRef.current.filter(b => normalize(b).includes(nq))
    setBairroLoading(true)
    try {
      const url = `https://viacep.com.br/ws/${encodeURIComponent(UF)}/${encodeURIComponent(cidade)}/${encodeURIComponent(q)}/json/`
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
    onChange({ cep: '', logradouro: q, numero: value.numero, ceps: [] })
    searchRua(cidadeSel, bairroSel, q)
  }

  function selectAllCeps(logradouro) {
    const grouped = ruaOpts.filter(o => o.logradouro === logradouro)
    const allCeps = [...new Set(grouped.map(o => o.cep.replace(/\D/g, '')))]
    const firstBairro = grouped.find(o => o.bairro)?.bairro || ''
    const alreadyAll = allCeps.every(c => (value.ceps || []).includes(c)) && value.logradouro === logradouro
    if (!bairroSel && firstBairro) { setBairroSel(firstBairro); setBairroQuery(firstBairro) }
    setRuaQuery(logradouro)
    if (alreadyAll) {
      onChange({ cep: '', logradouro, numero: value.numero, ceps: [] })
    } else {
      onChange({ cep: '', logradouro, numero: value.numero, ceps: allCeps })
    }
    // Keep dropdown open so user can fine-tune
  }

  function toggleCep(r) {
    const cep = r.cep.replace(/\D/g, '')
    const logradouro = r.logradouro
    // If switching to a different street, reset selection
    const currentCeps = value.logradouro === logradouro ? (value.ceps || []) : []
    const newCeps = currentCeps.includes(cep)
      ? currentCeps.filter(c => c !== cep)
      : [...currentCeps, cep]
    if (!bairroSel && r.bairro) { setBairroSel(r.bairro); setBairroQuery(r.bairro) }
    setRuaQuery(logradouro)
    onChange({ cep: '', logradouro, numero: value.numero, ceps: newCeps })
    // Dropdown stays open (no setRuaOpts([]))
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
  const cepOk     = !!value.cep || (value.ceps?.length > 0)

  return (
    <div className="flex flex-col gap-0 border border-gray-200 divide-y divide-gray-200">

      {/* Row header */}
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Localização</span>
        <span className="text-[10px] text-gray-400">· Estado fixo: RJ</span>
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
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bairro */}
      <div className="p-3 relative" ref={bairroRef}>
        <label className={LABEL_CLS}>
          Bairro <span className="normal-case tracking-normal font-normal text-gray-400">(opcional — ou digite livremente)</span>
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
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
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
          <ul className={DROP_CLS_UP}>
            {(() => {
              const grouped = {}
              ruaOpts.forEach(r => {
                if (!grouped[r.logradouro]) grouped[r.logradouro] = []
                grouped[r.logradouro].push(r)
              })
              return Object.entries(grouped).flatMap(([logradouro, items]) => {
                const allCepsForStreet = [...new Set(items.map(o => o.cep.replace(/\D/g, '')))]
                const selectedCeps = value.logradouro === logradouro ? (value.ceps || []) : []
                const allSelected = allCepsForStreet.length > 1 && allCepsForStreet.every(c => selectedCeps.includes(c))
                return [
                  items.length > 1 ? (
                    <li key={`all-${logradouro}`}
                      onMouseDown={(e) => { e.preventDefault(); selectAllCeps(logradouro) }}
                      className={`px-3 py-2 cursor-pointer border-b border-gray-200 flex items-center gap-2 ${allSelected ? 'bg-red-100' : 'bg-red-50 hover:bg-red-100'}`}>
                      <span className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                        allSelected ? 'bg-[#9c0004] border-[#9c0004] text-white' : 'border-gray-400 bg-white'
                      }`}>{allSelected ? '✓' : ''}</span>
                      <span>
                        <div className="text-xs font-semibold text-[#9c0004]">Todos os CEPs — {logradouro}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{allCepsForStreet.length} CEPs encontrados</div>
                      </span>
                    </li>
                  ) : null,
                  ...items.map((r, i) => {
                    const cep = r.cep.replace(/\D/g, '')
                    const checked = selectedCeps.includes(cep)
                    return (
                      <li key={`${logradouro}-${i}`}
                        onMouseDown={(e) => { e.preventDefault(); toggleCep(r) }}
                        className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 flex items-center gap-2 ${
                          checked ? 'bg-[#9c0004]/5' : 'hover:bg-gray-50'
                        }`}>
                        <span className={`w-4 h-4 border shrink-0 flex items-center justify-center ${
                          checked ? 'bg-[#9c0004] border-[#9c0004] text-white' : 'border-gray-300 bg-white'
                        }`}>{checked ? '✓' : ''}</span>
                        <span>
                          <div className="text-sm text-gray-900">{r.logradouro}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{r.bairro} · CEP {formatCep(r.cep)}</div>
                        </span>
                      </li>
                    )
                  })
                ].filter(Boolean)
              })
            })()}
          </ul>
        )}
      </div>

      {/* CEP result bar */}
      <div className={`px-3 py-2 flex items-center gap-2 text-xs ${cepOk ? 'bg-green-50' : 'bg-gray-50'}`}>
        <span className={cepOk ? 'text-green-600' : 'text-gray-400'}>▸</span>
        <span className={`font-mono ${cepOk ? 'text-green-700' : 'text-gray-400'}`}>
          {!cepOk
            ? '–'
            : value.ceps?.length > 0
              ? `${value.ceps.length} CEP${value.ceps.length > 1 ? 's' : ''} selecionado${value.ceps.length > 1 ? 's' : ''} — ${value.logradouro}`
              : `CEP ${formatCep(value.cep)}`}
        </span>
        {cepOk && (
          <button type="button"
            onClick={() => { onChange({ cep: '', logradouro: '', numero: value.numero, ceps: [] }); setRuaQuery(''); setRuaOpts([]) }}
            className="ml-auto text-gray-400 hover:text-red-600 transition cursor-pointer">
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
    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#9c0004] border-t-transparent rounded-full animate-spin" />
  )
}
