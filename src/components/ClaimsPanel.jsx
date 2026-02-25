import { useState, useEffect } from 'react'
import { API } from '../App'
import { LoadingState, ErrorState, EmptyState } from './PolicyPanel'

const CLAIM_TYPES = ['Medical', 'Property Damage', 'Auto Accident', 'Theft', 'Life', 'Emergency', 'Dental']
const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red', processing: 'blue' }

export default function ClaimsPanel({ customer }) {
  const [claims, setClaims]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    type: 'Medical', amount: '', description: '', incident_date: new Date().toISOString().split('T')[0]
  })
  const [submitMsg, setSubmitMsg] = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    fetch(`${API}/api/claims`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(data => setClaims(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [customer])

  const customerClaims = claims?.filter(c =>
    c.customerId === customer || c.customer_id === customer
  ) || []

  async function submitClaim(e) {
    e.preventDefault()
    setSubmitting(true); setSubmitMsg(null)
    try {
      const res = await fetch(`${API}/api/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer,
          customer_id: customer,
          type: form.type,
          amount: parseFloat(form.amount),
          description: form.description,
          incident_date: form.incident_date,
          status: 'pending',
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setSubmitMsg({ ok: true, text: 'Claim submitted successfully!' })
      setShowForm(false)
      setForm({ type: 'Medical', amount: '', description: '', incident_date: new Date().toISOString().split('T')[0] })
      load()
    } catch (err) {
      setSubmitMsg({ ok: false, text: `Failed to submit: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading claims…" />
  if (error)   return <ErrorState msg={error} />

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">📝 Claims — <span className="accent">{customer}</span></h2>
        <button className="btn-primary" onClick={() => { setShowForm(f => !f); setSubmitMsg(null) }}>
          {showForm ? '✕ Cancel' : '+ File New Claim'}
        </button>
      </div>

      {submitMsg && (
        <div className={`alert ${submitMsg.ok ? 'alert-success' : 'alert-error'}`}>
          {submitMsg.text}
        </div>
      )}

      {showForm && (
        <form className="claim-form card" onSubmit={submitClaim}>
          <h3>New Claim</h3>
          <div className="form-row">
            <label>Claim Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required>
              {CLAIM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Claim Amount ($)</label>
            <input
              type="number" min="1" step="0.01" placeholder="e.g. 2500.00"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required
            />
          </div>
          <div className="form-row">
            <label>Incident Date</label>
            <input
              type="date" value={form.incident_date}
              onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} required
            />
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea
              rows={3} placeholder="Describe the incident…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        </form>
      )}

      {customerClaims.length === 0 ? (
        <EmptyState label={`No claims on file for ${customer}. Use the button above to file one.`} />
      ) : (
        <div className="claims-list">
          {customerClaims.map((c, i) => {
            const color = STATUS_COLOR[c.status] || 'muted'
            return (
              <div key={c.id || c._id || i} className="claim-card card">
                <div className="claim-row">
                  <div>
                    <div className="claim-type">{c.type || c.claim_type || 'Claim'}</div>
                    <div className="claim-desc">{c.description || '—'}</div>
                  </div>
                  <div className="claim-right">
                    <span className={`badge badge-${color}`}>{c.status || 'pending'}</span>
                    <div className="claim-amount">${parseFloat(c.amount || 0).toLocaleString()}</div>
                    <div className="claim-date">{c.incident_date || c.created_at ? new Date(c.incident_date || c.created_at).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {claims && claims.length > customerClaims.length && (
        <p className="muted-text">Showing {customerClaims.length} of {claims.length} total claims for {customer}.</p>
      )}
    </div>
  )
}
