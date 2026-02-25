import { useState, useEffect } from 'react'
import { API, CoverageBar } from '../App'

const TYPE_ICON = { health: '🏥', auto: '🚗', property: '🏠', life: '💛' }
const STATUS_COLOR = { active: 'green', inactive: 'muted', suspended: 'red' }

export default function PolicyPanel({ customer }) {
  const [policies, setPolicies] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true); setError(null); setPolicies(null)
    fetch(`${API}/api/policy/${customer}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(setPolicies)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [customer])

  if (loading) return <LoadingState label="Loading policies…" />
  if (error)   return <ErrorState msg={error} />
  if (!policies?.length) return <EmptyState label="No policies found for this customer." />

  return (
    <div className="panel">
      <h2 className="panel-title">📋 Policies for <span className="accent">{customer}</span></h2>
      <div className="policy-list">
        {policies.map(p => <PolicyCard key={p.id} policy={p} />)}
      </div>
    </div>
  )
}

function PolicyCard({ policy }) {
  const [expanded, setExpanded] = useState(true)
  const icon = TYPE_ICON[policy.policyType] || '📋'
  const color = STATUS_COLOR[policy.status] || 'muted'

  return (
    <div className="policy-card card">
      <div className="policy-header" onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer' }}>
        <div className="policy-meta">
          <span className="policy-type-icon">{icon}</span>
          <div>
            <div className="policy-number">{policy.policyNumber}</div>
            <div className="policy-type">{policy.policyType?.charAt(0).toUpperCase() + policy.policyType?.slice(1)} Insurance</div>
          </div>
        </div>
        <div className="policy-summary">
          <span className={`badge badge-${color}`}>{policy.status}</span>
          <div className="policy-premium">${policy.premiumAmount}<span>/mo</span></div>
        </div>
        <span className="expand-arrow">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="policy-body">
          <div className="policy-dates">
            <div><label>Start Date</label><span>{policy.startDate}</span></div>
            <div><label>End Date</label><span>{policy.endDate}</span></div>
            <div><label>Policy ID</label><span className="mono">{policy.id}</span></div>
          </div>
          {policy.coverages?.length > 0 && (
            <div className="coverages">
              <h4>Coverage Breakdown</h4>
              {policy.coverages.map(c => <CoverageBar key={c.type} coverage={c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LoadingState({ label }) {
  return <div className="state-wrap"><div className="spinner" /><p>{label}</p></div>
}
export function ErrorState({ msg }) {
  return <div className="state-wrap error-state"><span>⚠️</span><p>Error: {msg}</p></div>
}
export function EmptyState({ label }) {
  return <div className="state-wrap muted-state"><span>📭</span><p>{label}</p></div>
}
