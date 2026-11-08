export function formatDate(isoStr) {
  if (!isoStr) return '–'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(isoStr))
  } catch {
    return isoStr
  }
}

export function formatCep(cep) {
  const d = String(cep).replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep
}

export function formatCpf(cpf) {
  const d = String(cpf).replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function maskCpf(cpf) {
  const f = formatCpf(cpf) // "123.456.789-01"
  if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(f)) return f
  return `${f.slice(0, 4)}***.*${f.slice(9)}` // "123.***.*89-01"
}

export function maskToken(token) {
  if (!token) return '–'
  if (token.length <= 20) return '•'.repeat(token.length)
  return `${token.slice(0, 14)}…${token.slice(-6)}` // "ExponentPushTo…xyz]"
}

export function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
