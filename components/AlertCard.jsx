import { formatDate, formatCep, formatCpf } from '@/lib/utils'

function TargetTag({ target }) {
  const { targeting_type: type, targeting_value: value } = target
  const styles = {
    GLOBAL: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    CIDADE: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    BAIRRO: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    CEP: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    CEP_NUMERO: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    CLIENTE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }
  const cls = styles[type] || 'bg-gray-700 text-gray-300 border-gray-600'

  let label = ''
  switch (type) {
    case 'GLOBAL': label = '🌐 Todos os usuários'; break
    case 'CIDADE': label = `🏙️ ${value}`; break
    case 'BAIRRO': label = `🏘️ ${value}`; break
    case 'CEP': label = `🛣️ CEP ${formatCep(value)}`; break
    case 'CEP_NUMERO': label = `🏢 ${value}`; break
    case 'CLIENTE': label = `👤 CPF ${formatCpf(value)}`; break
    default: label = value
  }

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

export function TargetTags({ targets = [] }) {
  if (!targets.length) {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-gray-700 text-gray-400 border-gray-600">
        Sem destinatários
      </span>
    )
  }

  // Collapse multiple CLIENTE targets
  const nonCliente = targets.filter(t => t.targeting_type !== 'CLIENTE')
  const clienteCount = targets.filter(t => t.targeting_type === 'CLIENTE').length

  return (
    <div className="flex flex-wrap gap-1.5">
      {nonCliente.map((t) => <TargetTag key={t.id} target={t} />)}
      {clienteCount > 0 && (
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-300 border-rose-500/30">
          {clienteCount === 1
            ? `👤 CPF ${targets.find(t => t.targeting_type === 'CLIENTE')?.targeting_value}`
            : `👥 ${clienteCount} clientes`}
        </span>
      )}
    </div>
  )
}

export default function AlertCard({ alert, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border rounded-xl p-4 cursor-pointer hover:border-gray-600 transition group ${
        alert.active ? 'border-gray-800' : 'border-gray-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-semibold text-white text-sm leading-snug group-hover:text-blue-300 transition line-clamp-2">
          {alert.title}
        </span>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
          alert.active
            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
            : 'bg-gray-700 text-gray-400 border border-gray-600'
        }`}>
          {alert.active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{alert.msg_cliente}</p>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TargetTags targets={alert.targets || []} />
        <span className="text-xs text-gray-600 shrink-0">{formatDate(alert.created_at)}</span>
      </div>
    </div>
  )
}
