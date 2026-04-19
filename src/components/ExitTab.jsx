import React, { useMemo } from 'react';

function etaColor(eta) {
  if (eta <= 3)  return 'green';
  if (eta <= 8)  return 'amber';
  return 'red';
}

function exitStatusColor(status) {
  if (status === 'clear')       return 'green';
  if (status === 'maintenance') return 'amber';
  return 'red';
}

function getBeatTheRushAdvice(stats, gates) {
  const avgWait = stats.avgGateWait;
  if (avgWait > 12) {
    return {
      icon: '🔴',
      title: 'High Exit Congestion',
      msg: `Gates are very busy (avg ${avgWait}min). If you can, wait 15-20 minutes after the final whistle for the rush to clear.`,
      color: 'red',
    };
  }
  if (avgWait > 6) {
    return {
      icon: '🟠',
      title: 'Moderate Exit Traffic',
      msg: `Expect a ${avgWait}min wait at most gates. Heading out 5-10 min early is your best bet.`,
      color: 'amber',
    };
  }
  return {
    icon: '🟢',
    title: 'Clear Exit Conditions',
    msg: `Great time to leave! Most gates have under a ${avgWait}min wait. Head to the nearest open gate.`,
    color: 'green',
  };
}

export default function ExitTab({ data }) {
  const { transport, emergencyExits, gates, stats } = data;

  const sortedTransport = useMemo(() =>
    [...transport].sort((a, b) => a.eta - b.eta),
    [transport]
  );

  const clearExits = useMemo(() =>
    emergencyExits.filter(e => e.status === 'clear'),
    [emergencyExits]
  );

  const bestGates = useMemo(() =>
    [...gates].sort((a, b) => a.waitMinutes - b.waitMinutes).slice(0, 3),
    [gates]
  );

  const advice = getBeatTheRushAdvice(stats, gates);

  const transportByType = useMemo(() => {
    const groups = {};
    sortedTransport.forEach(t => {
      if (!groups[t.type]) groups[t.type] = [];
      groups[t.type].push(t);
    });
    return groups;
  }, [sortedTransport]);

  const TYPE_ICONS = { Metro: '🚇', Bus: '🚌', Shuttle: '🚐' };

  return (
    <div className="fade-in page">
      <div style={{ paddingTop: 4 }}>
        <h2 className="page-title">Plan Your Exit</h2>
        <p className="page-subtitle">Best routes, transport & timing</p>
      </div>

      {/* Beat the Rush */}
      <div className={`alert-card ${advice.color}`} role="note" aria-label="Exit timing advice">
        <span className="alert-card-icon">{advice.icon}</span>
        <div className="alert-card-body">
          <div className="alert-card-title">{advice.title}</div>
          <div className="alert-card-msg">{advice.msg}</div>
        </div>
      </div>

      {/* Best Gates to Exit */}
      <div>
        <p className="section-label">🚪 Quickest Exit Gates</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bestGates.map((gate, idx) => (
            <div key={gate.id} className="list-item" role="article" aria-label={`${gate.name}, ${gate.waitMinutes.toFixed(1)} minute wait`}>
              <div className="list-item-icon">{idx === 0 ? '⭐' : '🚪'}</div>
              <div className="list-item-content">
                <div className="list-item-title">
                  {gate.name}
                  {idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>FASTEST</span>}
                </div>
                <div className="list-item-sub">{gate.peopleInQueue} people · {gate.zone}</div>
              </div>
              <span className={`list-item-badge badge-${gate.waitMinutes < 5 ? 'green' : gate.waitMinutes < 10 ? 'amber' : 'red'}`}>
                {gate.waitMinutes.toFixed(1)}m
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transport */}
      <div>
        <p className="section-label">🚌 Upcoming Transport</p>
        {Object.entries(transportByType).map(([type, vehicles]) => (
          <div key={type} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{TYPE_ICONS[type] || '🚌'}</span> {type}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.slice(0, 2).map(v => (
                <div key={v.id} className="list-item" role="article" aria-label={`${v.line}, arriving in ${v.eta} minutes`}>
                  <div className="list-item-icon">{TYPE_ICONS[type] || '🚌'}</div>
                  <div className="list-item-content">
                    <div className="list-item-title">{v.line}</div>
                    <div className="list-item-sub">{v.passengers}/{v.maxPassengers} passengers · {v.capacity}% capacity</div>
                    <div className="progress" style={{ marginTop: 6 }}>
                      <div
                        className={`progress-fill ${v.capacity > 80 ? 'red' : v.capacity > 50 ? 'amber' : 'green'}`}
                        style={{ width: `${v.capacity}%` }}
                      />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={`list-item-badge badge-${etaColor(v.eta)}`}>{v.eta}m</span>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase' }}>{v.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Exits */}
      <div>
        <p className="section-label">🏃 Emergency Exits</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emergencyExits.slice(0, 5).map(exit => (
            <div key={exit.id} className="list-item" role="article" aria-label={`${exit.name}, status ${exit.status}`}>
              <div className="list-item-icon">🚪</div>
              <div className="list-item-content">
                <div className="list-item-title">{exit.name} <span className="fs-12 text-muted">· {exit.zone} Zone</span></div>
                <div className="list-item-sub">Route: {exit.evacuationRoute} · Checked {exit.lastChecked}</div>
              </div>
              <span className={`list-item-badge badge-${exitStatusColor(exit.status)}`}>
                {exit.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
