'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/Avatar';
import { getBlocks, getVenueHM } from '@/data/blocks';

const TEAM_AVATARS: Record<string, string> = {
  Martine: '/images/team/martine.png',
  Rasmus:  '/images/team/rasmus.png',
  Pietro:  '/images/team/pietro.png',
  'Paul G.': '/images/team/goodison.png',
  Mateus:  '/images/team/mateus.png',
  Marco:   '/images/team/marco.png',
};

function DemoBadge() {
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
      background: 'var(--yg)', border: '1px solid var(--yb)', color: 'var(--yellow)',
    }}>DEMO</span>
  );
}

function NextUp({ regatId, dayIndex, venueTimezone }: { regatId?: string; dayIndex?: number; venueTimezone?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const blocks = getBlocks(now, regatId, dayIndex, venueTimezone);
  const next = blocks.find(b => b.status === 'future');

  if (!next) return null;

  const [h, m] = next.time.split(':').map(Number);
  const { h: nowH, m: nowM } = getVenueHM(now, venueTimezone);
  const diffMins = (h * 60 + m) - (nowH * 60 + nowM);
  const inLabel = diffMins <= 0 ? 'now'
    : diffMins < 60 ? `in ${diffMins} min`
    : `in ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

  return (
    <div className="srl-sec">
      <div className="srl-lbl">Next Up</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>{next.time} · {inLabel}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{next.name}</div>
    </div>
  );
}

export default function StatusRail({ regatId, dayIndex, venueTimezone }: { regatId?: string; dayIndex?: number; venueTimezone?: string }) {
  const team = [
    { init: 'MG', name: 'Martine', state: 'At tent',  dot: 'sd-g' },
    { init: 'RK', name: 'Rasmus',  state: 'At tent',  dot: 'sd-g' },
    { init: 'PS', name: 'Pietro',  state: 'At tent',  dot: 'sd-g' },
    { init: 'PG', name: 'Paul G.', state: 'En route', dot: 'sd-y', stateColor: 'var(--yellow)' },
    { init: 'MI', name: 'Mateus',  state: 'At tent',  dot: 'sd-g' },
    { init: 'MC', name: 'Marco',   state: 'At tent',  dot: 'sd-g' },
  ];

  const actions = [
    { color: 'var(--red)',    title: 'Mark 2 tack trigger rule',    meta: 'Rasmus · from R3' },
    { color: 'var(--yellow)', title: 'Comms during start sequence', meta: 'Pietro · from R4' },
    { color: 'var(--green)',  title: 'Wing cant SOP <12 kts',       meta: 'Mateus · due today', last: true },
  ];

  return (
    <div className="srl">
      <div className="srl-sec">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="srl-lbl" style={{ marginBottom: 0 }}>Team</div>
          <DemoBadge />
        </div>
        {team.map(m => (
          <div className="s-row" key={m.name}>
            <div className="s-ava" style={{ padding: 0, overflow: 'hidden' }}>
              <Avatar src={TEAM_AVATARS[m.name]} initial={m.init} size={28} />
              <div className={`sdot ${m.dot}`} />
            </div>
            <div>
              <div className="s-name">{m.name}</div>
              <div className="s-state" style={m.stateColor ? { color: m.stateColor } : undefined}>{m.state}</div>
            </div>
          </div>
        ))}
      </div>
      <NextUp regatId={regatId} dayIndex={dayIndex} venueTimezone={venueTimezone} />
      <div className="srl-sec">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="srl-lbl" style={{ marginBottom: 0 }}>Open Items</div>
          <DemoBadge />
        </div>
        {actions.map((a, i) => (
          <div className="ac-row" key={i} style={a.last ? { borderBottom: 'none' } : undefined}>
            <div className="ac-title">
              <span className="ac-dot" style={{ background: a.color }} />
              {a.title}
            </div>
            <div className="ac-meta">{a.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
