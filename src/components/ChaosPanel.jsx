import { useState, useEffect, useCallback } from 'react'
import { API } from '../App'
import { LoadingState, ErrorState } from './PolicyPanel'

const FAULTS = [
  { key: 'service_crash', label: 'Service Crash',  icon: '💥', desc: 'Service returns 503 on every request' },
  { key: 'high_latency',  label: 'High Latency',   icon: '🐢', desc: 'Adds 3–8 second delay to responses' },
  { key: 'db_failure',    label: 'DB Failure',      icon: '🗄️', desc: 'Simulates database connection failure' },
  { key: 'memory_spike',  label: 'Memory Spike',    icon: '🧠', desc: 'Allocates 50 MB on each request' },
  { key: 'cpu_spike',     label: 'CPU Spike',       icon: '🔥', desc: 'Burns CPU for 2 seconds per request' },
]

const SCENARIOS = [
  { id: 'cascading_failure',   label: 'Cascading Failure',  icon: '🌊', color: 'red',   faults: ['service_crash'] },
  { id: 'system_wide_latency', label: 'System Latency',     icon: '🐌', color: 'amber', faults: ['high_latency'] },
  { id: 'database_blackout',   label: 'DB Blackout',        icon: '💾', color: 'red',   faults: ['db_failure'] },
  { id: 'memory_pressure',     label: 'Memory Pressure',    icon: '📊', color: 'amber', faults: ['memory_spike'] },
  { id: 'reset_all',           label: 'Reset All',          icon: '✅', color: 'green', faults: [] },
]

const SERVICES = ['claims', 'policy', 'investment', 'notification']

export default function ChaosPanel() {
  const [status, setStatus]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [toggling, setToggling] = useState({})

  const load = useCallback(() => {
    fetch(`${API}/api/chaos/status`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => { setStatus(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  async function toggleFault(service, fault, enabled) {
    const key = `${service}-${fault}`
    setToggling(t => ({ ...t, [key]: true }))
    try {
      await fetch(`${API}/api/chaos/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, fault, enabled }),
      })
      await load()
    } catch {/* silent */} finally {
      setToggling(t => ({ ...t, [key]: false }))
    }
  }

  async function applyScenario(scenario) {
    const isReset = scenario.id === 'reset_all'
    const targets = SERVICES
    setToggling(t => ({ ...t, scenario: true }))
    try {
      for (const svc of targets) {
        for (const fault of FAULTS.map(f => f.key)) {
          const enable = !isReset && scenario.faults.includes(fault)
          await fetch(`${API}/api/chaos/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service: svc, fault, enabled: enable }),
          })
        }
      }
      await load()
    } catch {/* silent */} finally {
      setToggling(t => ({ ...t, scenario: false }))
    }
  }

  if (loading) return <LoadingState label="Loading system status…" />
  if (error)   return <ErrorState msg={error} />

  const services = status?.services || {}

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">⚡ System Status &amp; Chaos Engineering</h2>
        <span className="pulse-dot" title="Auto-refreshes every 5s">● Live</span>
      </div>

      {/* ── Service health overview ── */}
      <div className="service-health-grid">
        {SERVICES.map(svc => {
          const s = services[svc] || {}
          const healthy = s.healthy !== false
          return (
            <div key={svc} className={`svc-card card ${healthy ? 'svc-ok' : 'svc-err'}`}>
              <div className="svc-header">
                <div className={`svc-dot ${healthy ? 'ok' : 'err'}`} />
                <span className="svc-name">{svc.charAt(0).toUpperCase() + svc.slice(1)}</span>
                <span className={`badge badge-${healthy ? 'green' : 'red'}`}>{healthy ? 'Healthy' : 'Degraded'}</span>
              </div>
              <div className="chaos-toggles">
                {FAULTS.map(f => {
                  const active = s.chaos?.[f.key] === true
                  const key = `${svc}-${f.key}`
                  return (
                    <button
                      key={f.key}
                      className={`fault-btn ${active ? 'fault-active' : ''}`}
                      onClick={() => toggleFault(svc, f.key, !active)}
                      disabled={toggling[key]}
                      title={f.desc}
                    >
                      {f.icon} {f.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Scenario shortcuts ── */}
      <div className="scenarios-section">
        <h3>Quick Scenarios</h3>
        <div className="scenario-btns">
          {SCENARIOS.map(sc => (
            <button
              key={sc.id}
              className={`scenario-btn sc-${sc.color}`}
              onClick={() => applyScenario(sc)}
              disabled={toggling.scenario}
            >
              <span>{sc.icon}</span>
              <span>{sc.label}</span>
            </button>
          ))}
        </div>
        {toggling.scenario && <p className="muted-text">Applying scenario across all services…</p>}
      </div>

      <p className="muted-text chaos-note">
        ⚠️ Fault toggles affect live Railway services and are visible to all clients. Use <strong>Reset All</strong> to restore normal operation.
      </p>
    </div>
  )
}
