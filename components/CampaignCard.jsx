import { formatDate } from '@/lib/utils'

const STATUS_BADGES = [
  { key: 'sent', label: 'Enviados', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'delivered', label: 'Entregues', cls: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'opened', label: 'Abertos', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'failed', label: 'Falhas', cls: 'bg-red-50 text-red-700 border-red-200' },
]

export default function CampaignCard({ campaign, onClick }) {
  const stats = campaign.stats || {}

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 p-4 cursor-pointer hover:border-[#9c0004] transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-[#9c0004] transition line-clamp-2">
          {campaign.title}
        </span>
        <span className="text-xs text-gray-400 shrink-0">{formatDate(campaign.createdAt)}</span>
      </div>

      {campaign.body && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{campaign.body}</p>}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center text-xs px-2 py-0.5 border bg-gray-100 text-gray-600 border-gray-300">
          {campaign.tokens} destinatário(s)
        </span>
        {STATUS_BADGES.map(({ key, label, cls }) => (
          stats[key] > 0 && (
            <span key={key} className={`inline-flex items-center text-xs px-2 py-0.5 border ${cls}`}>
              {label}: {stats[key]}
            </span>
          )
        ))}
      </div>
    </div>
  )
}
