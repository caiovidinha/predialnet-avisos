import { formatDate, formatCep, formatCpf } from '@/lib/utils'

function TargetTag({ target }) {
  const { targeting_type: type, targeting_value: value } = target
  const styles = {
    GLOBAL: 'bg-purple-50 text-purple-700 border-purple-200',
    CIDADE: 'bg-blue-50 text-blue-700 border-blue-200',
    BAIRRO_CIDADE: 'bg-teal-50 text-teal-700 border-teal-200',
    CEP: 'bg-orange-50 text-orange-700 border-orange-200',
    CEP_NUMERO: 'bg-amber-50 text-amber-700 border-amber-200',
    CLIENTE: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  const cls = styles[type] || 'bg-gray-100 text-gray-600 border-gray-300'

  let label = ''
  switch (type) {
    case 'GLOBAL': label = '🌐 Todos os usuários'; break
    case 'CIDADE': label = `🏙️ ${value}`; break
    case 'BAIRRO_CIDADE': { const [b, c] = value.split(':'); label = `🏘️ ${b}${c ? ` · ${c}` : ''}`; break }
    case 'CEP': label = `🛣️ CEP ${formatCep(value)}`; break
    case 'CEP_NUMERO': label = `🏢 ${value}`; break
    case 'CLIENTE': label = `👤 CPF ${formatCpf(value)}`; break
    default: label = value
  }

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 border ${cls}`}>
      {label}
    </span>
  )
}

export function TargetTags({ targets = [] }) {
  if (!targets.length) {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 border bg-gray-100 text-gray-500 border-gray-300">
        Sem destinatários
      </span>
    )
  }

  // Collapse multiple CLIENTE targets
  const nonCliente = targets.filter(t => t.targeting_type !== 'CLIENTE' && t.targeting_type !== 'CEP')
  const clienteCount = targets.filter(t => t.targeting_type === 'CLIENTE').length
  const cepTargets = targets.filter(t => t.targeting_type === 'CEP')

  return (
    <div className="flex flex-wrap gap-1.5">
      {nonCliente.map((t) => <TargetTag key={t.id} target={t} />)}
      {cepTargets.length === 1 && <TargetTag key={cepTargets[0].id} target={cepTargets[0]} />}
      {cepTargets.length > 1 && (
        <span className="inline-flex items-center text-xs px-2 py-0.5 border bg-orange-50 text-orange-700 border-orange-200">
          {`🛣️ Rua · ${cepTargets.length} CEPs`}
        </span>
      )}
      {clienteCount > 0 && (
        <span className="inline-flex items-center text-xs px-2 py-0.5 border bg-rose-50 text-rose-700 border-rose-200">
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
      className={`bg-white border p-4 cursor-pointer hover:border-[#9c0004] transition group ${
        alert.active ? 'border-gray-200' : 'border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-[#9c0004] transition line-clamp-2">
          {alert.title}
        </span>
        <span className={`shrink-0 text-xs px-2 py-0.5 font-medium border ${
          alert.active
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-100 text-gray-500 border-gray-300'
        }`}>
          {alert.active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{alert.msg_cliente}</p>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TargetTags targets={alert.targets || []} />
        <span className="text-xs text-gray-400 shrink-0">{formatDate(alert.created_at)}</span>
      </div>
    </div>
  )
}
