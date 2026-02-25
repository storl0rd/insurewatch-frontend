import { useState, useEffect, useCallback } from 'react'
import { API } from '../App'
import { LoadingState, ErrorState } from './PolicyPanel'

export default function InvestmentPanel({ customer }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)
    fetch(`${API}/api/investments/${customer}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [customer])

  useEffect(() => { setData(null); load() }, [customer, load])

  if (loading) return <LoadingState label="Loading portfolio…" />
  if (error)   return <ErrorState msg={error} />
  if (!data)   return <ErrorState msg="No portfolio data" />

  const totalChange = data.holdings?.reduce((sum, h) => sum + h.value * h.changePercent / 100, 0) || 0

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">📈 Portfolio — <span className="accent">{customer}</span></h2>
        <button className="btn-refresh" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? '⟳ Refreshing…' : '⟳ Refresh Prices'}
        </button>
      </div>

      <div className="invest-summary">
        <div className="invest-card">
          <div className="invest-label">Total Value</div>
          <div className="invest-value">
            ${data.totalValue?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="invest-currency">{data.currency || 'USD'}</div>
        </div>
        <div className="invest-card">
          <div className="invest-label">Today's Change</div>
          <div className={`invest-value ${totalChange >= 0 ? 'positive' : 'negative'}`}>
            {totalChange >= 0 ? '+' : ''}${totalChange.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="invest-currency">estimated</div>
        </div>
        <div className="invest-card">
          <div className="invest-label">Holdings</div>
          <div className="invest-value">{data.holdings?.length || 0}</div>
          <div className="invest-currency">positions</div>
        </div>
        <div className="invest-card">
          <div className="invest-label">Portfolio</div>
          <div className="invest-value mono" style={{ fontSize: '1rem' }}>{data.portfolioId}</div>
          <div className="invest-currency">{data.portfolioName}</div>
        </div>
      </div>

      <div className="holdings-table-wrap card">
        <table className="holdings-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th className="num">Shares</th>
              <th className="num">Price</th>
              <th className="num">Value</th>
              <th className="num">Change</th>
            </tr>
          </thead>
          <tbody>
            {data.holdings?.map(h => (
              <tr key={h.symbol}>
                <td><span className="symbol-badge">{h.symbol}</span></td>
                <td>{h.name}</td>
                <td className="num">{h.shares}</td>
                <td className="num">${h.currentPrice?.toFixed(2)}</td>
                <td className="num">${h.value?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className={`num ${h.changePercent >= 0 ? 'positive' : 'negative'}`}>
                  {h.changePercent >= 0 ? '▲' : '▼'} {Math.abs(h.changePercent).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="invest-footer">
        Last updated: {new Date(data.lastUpdated).toLocaleString()} · Prices fluctuate on each refresh
      </p>
    </div>
  )
}
