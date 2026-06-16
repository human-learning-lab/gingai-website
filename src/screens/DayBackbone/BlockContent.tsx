'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => (
  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 12 }}>Loading chart…</div>
) });
import Link from 'next/link';
import { IconMic } from '@/components/Icons';
import EmptyBlock from '@/components/EmptyBlock';
import { getBlocks } from '@/data/blocks';
import type { DebriefBlockData, WarmUpBlockData, TransferBlockData } from '@/types/block-content';

// ─── Shared ───────────────────────────────────────────────────

function BlockHeader({ eyebrow, title, tag, tagStyle }: {
  eyebrow: string;
  title: string;
  tag?: string;
  tagStyle?: React.CSSProperties;
}) {
  return (
    <div className="main-top">
      <div className="eyebrow">{eyebrow}</div>
      <div className="page-title">
        {title}
        {tag && <span className="ptag" style={tagStyle}>{tag}</span>}
      </div>
    </div>
  );
}

function ActionButton({ href, icon, label, style }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <button className="capture-cta" style={style}>
        {icon}
        {label}
      </button>
    </Link>
  );
}

// ─── 13:30 Brief & Sim Brief ──────────────────────────────────

function Block1330({ data }: { data: DebriefBlockData | null }) {
  return (
    <>
      <BlockHeader eyebrow="13:30 · Phase 5 — Learn" title="Brief & Sim Brief" />
      <div className="gen-panel">
        {!data ? (
          <EmptyBlock
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
            title="Brief & Sim Brief"
            hint="Session notes and action items will appear here after the block completes."
          />
        ) : (
          <>
            {data.aiBriefSummary && (
              <>
                <div className="sec-title">GingAI Summary</div>
                <div className="ai-body" style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
                  {data.durationMinutes && <span style={{ color: 'var(--text3)', display: 'block', marginBottom: 6, fontSize: 11 }}>Duration: {data.durationMinutes} min</span>}
                  {data.aiBriefSummary}
                </div>
              </>
            )}
            {(data.actionItems?.length ?? 0) > 0 && (
              <>
                <div className="sec-title">Action Items</div>
                {data.actionItems!.map((a, i) => (
                  <div className="past-action-row" key={i} style={i === data.actionItems!.length - 1 ? { borderBottom: 'none' } : undefined}>
                    <div className="pa-dot" style={{ background: a.priority === 'high' ? 'var(--green)' : 'var(--yellow)' }} />
                    <div>
                      <div className="pa-txt">{a.text}</div>
                      <div className="pa-meta">Owner: {a.owner} · Due: {a.due}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {data.coachNotes && (
              <>
                <div className="sec-title" style={{ marginTop: 24 }}>Coach Notes</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.coachNotes}</div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── 15:00 Warm Up ────────────────────────────────────────────

const WARMUP_EXERCISES = [
  { name: 'Lacrosse Ball — Foot',              id: '1gAVanUJVtQ' },
  { name: 'Calf Foam Roll',                     id: 'zn1tcngoD8U' },
  { name: 'Quad Foam Roll',                     id: 'jNC0qnQsw3w' },
  { name: 'T-Spine Foam Roller',                id: '81kPLsMt6wY' },
  { name: 'T-Spine Foam Roller Passes',         id: 'ZYn6iypHrCI' },
  { name: 'Cobra to Downward Dog',              id: 'QcMv2yclgxk' },
  { name: 'Shin Box Get Up',                    id: 'IWf78Bf-rAI' },
  { name: 'Shoulder Dislocates',                id: 'rPo5VjfQe9w' },
  { name: 'Quadruped Step Through Rotation',    id: 'KQU0SMJdqBo' },
  { name: 'Single Leg Pogo Hops — 4 Directions',id: 'N84BAPZKnP4' },
];

function Block1500({ data }: { data: WarmUpBlockData | null }) {
  const [activeVideo, setActiveVideo] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      <BlockHeader eyebrow="Warm Up · Exercise Library" title="Warm Up" />
      <div className="gen-panel">
        {data?.notes && (
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>{data.notes}</div>
        )}

        {/* Inline player */}
        {activeVideo && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
              <iframe
                key={activeVideo.id}
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                title={activeVideo.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{activeVideo.name}</div>
          </div>
        )}

        <div className="warmup-grid">
          {WARMUP_EXERCISES.map((ex) => (
            <div
              key={ex.id}
              className={`warmup-card${activeVideo?.id === ex.id ? ' active' : ''}`}
              onClick={() => setActiveVideo(activeVideo?.id === ex.id ? null : ex)}
              style={{ cursor: 'pointer' }}
            >
              <div className="warmup-thumb">
                <img
                  src={`https://img.youtube.com/vi/${ex.id}/hqdefault.jpg`}
                  alt={ex.name}
                  loading="lazy"
                />
                <div className="warmup-play">
                  {activeVideo?.id === ex.id ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="warmup-name">{ex.name}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── 15:50 Transfer to Yacht / Gear Checklist ─────────────────

function Block1550({ data }: { data: TransferBlockData | null }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [custom, setCustom] = useState('');
  const [extras, setExtras] = useState<string[]>([]);

  const all = [...(data?.items ?? []), ...extras];
  const done = all.filter((_, i) => checked.has(i)).length;

  function toggle(i: number) {
    setChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function addItem() {
    const label = custom.trim();
    if (!label) return;
    setExtras(prev => [...prev, label]);
    setCustom('');
  }

  return (
    <>
      <BlockHeader eyebrow="15:50 · Transfer to Yacht" title="Gear Checklist" />
      <div className="gen-panel">
        {all.length === 0 ? (
          <EmptyBlock
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
            title="Gear Checklist"
            hint="Equipment list will be set by the team before transfer to yacht."
          />
        ) : (
          <>
            {data?.notes && <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 16 }}>{data.notes}</div>}
            <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 12 }}>{done}/{all.length} packed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {all.map((item, i) => (
                <button key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', background: 'none', border: 'none', borderBottom: i < all.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: checked.has(i) ? '1.5px solid var(--green)' : '1.5px solid var(--line2)', background: checked.has(i) ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {checked.has(i) && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 5 4 7 8 3"/></svg>}
                  </div>
                  <span style={{ fontSize: 14, color: checked.has(i) ? 'var(--text4)' : 'var(--text)', textDecoration: checked.has(i) ? 'line-through' : 'none' }}>{item}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="text" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Add item…"
            style={{ flex: 1, height: 34, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          {custom.trim() && <button onClick={addItem} style={{ height: 34, padding: '0 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>Add</button>}
        </div>
      </div>
    </>
  );
}

// ─── 18:18 Capture Opens ──────────────────────────────────────

function Block1818() {
  return (
    <>
      <BlockHeader eyebrow="18:18 · Activates at dock-in after R7" title="Capture Opens" tag="Capture" tagStyle={{ color: 'var(--red)', background: 'var(--rg)', border: '1px solid var(--rb)' }} />
      <div className="gen-panel">
        <ActionButton href="/capture" icon={<IconMic size={16} />} label="Open Capture" />
      </div>
    </>
  );
}

// ─── 19:30 Team Debrief ───────────────────────────────────────

function Block1930() {
  return (
    <>
      <BlockHeader eyebrow="19:30 · End of Race Day" title="Team Debrief" tag="Debrief" tagStyle={{ color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--line)' }} />
      <div className="gen-panel">
        <ActionButton href="/debrief" label="Open Team Debrief"
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          style={{ color: 'var(--text2)', borderColor: 'var(--line)', background: 'var(--bg3)' }}
        />
      </div>
    </>
  );
}

// ─── All Team — Tent ──────────────────────────────────────────

function BlockTent() {
  return (
    <>
      <BlockHeader eyebrow="Morning · All Team" title="All Team — Tent" />
    </>
  );
}

// ─── Simulator Session ────────────────────────────────────────

const SIM_CHECKLIST = [
  { label: 'Alarm thresholds set',      hint: 'Check Alarms page — Diff ON/OFF configured?' },
  { label: 'GingAI Live Mode open',     hint: 'Full-screen on tablet for countdown per run' },
  { label: 'Capture ready (offline?)',   hint: 'Switch to Offline mode if WiFi is unreliable' },
  { label: 'Debrief queued',            hint: 'Open Debrief after the session for fresh notes' },
];

function BlockSim() {
  const [checked, setChecked] = useState<boolean[]>(SIM_CHECKLIST.map(() => false));

  return (
    <>
      <BlockHeader
        eyebrow="Simulator · Learn"
        title="Simulator Session"
        tag="Sim"
        tagStyle={{ color: 'var(--sim)', background: 'color-mix(in srgb, var(--sim) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--sim) 30%, transparent)' }}
      />
      <div className="gen-panel">

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          <ActionButton href="/capture" icon={<IconMic size={15} />} label="Capture"
            style={{ fontSize: 12, padding: '9px 12px' }} />
          <ActionButton href="/alarms"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            label="Alarms"
            style={{ fontSize: 12, padding: '9px 12px', color: 'var(--text2)', borderColor: 'var(--line)', background: 'var(--bg3)' }}
          />
        </div>

        {/* Pre-sim checklist */}
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 10 }}>
          Pre-sim checklist
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {SIM_CHECKLIST.map((item, i) => (
            <div
              key={i}
              onClick={() => setChecked(c => c.map((v, j) => j === i ? !v : v))}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${checked[i] ? 'var(--gb)' : 'var(--line)'}`, background: checked[i] ? 'var(--gg)' : 'var(--bg3)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked[i] ? 'var(--green)' : 'var(--line2)'}`, background: checked[i] ? 'var(--green)' : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {checked[i] && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: checked[i] ? 'var(--green)' : 'var(--text)', lineHeight: 1.3, textDecoration: checked[i] ? 'line-through' : 'none' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{item.hint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 7, border: '1px solid var(--line)' }}>
          Each sim run gets a countdown in <strong>Live Mode</strong>. Go full-screen before Run 1 — alarm overlays and the session timer are active throughout.
        </div>
      </div>
    </>
  );
}

// ─── Sim Session — Brief & Documents ─────────────────────────

export type SimDoc = {
  date?: string;
  title: string;
  subtitle?: string;
  externalHref?: string;
  type: 'pdf' | 'gdoc' | 'video';
  embedSrc?: string;
};

export const SIM_DOCS: SimDoc[] = [
  { date: 'Mon 8 Jun', title: 'Team Meeting Agenda',         subtitle: 'Sim programme · Objectives · Accountability',          externalHref: '/sim-docs/sim-meeting-mon-8-june.pdf',      type: 'pdf' },
  { date: 'Mon 8 Jun', title: 'Week Objectives & Programme', subtitle: 'The six-step start process · Weekly cycle',             externalHref: '/sim-docs/week-objectives.pdf',             type: 'pdf' },
  { date: 'Mon 8 Jun', title: 'Objectives Meeting Recording', subtitle: 'Recording — Mon 8 Jun 08:57',                          externalHref: 'https://drive.google.com/file/d/1QGXMBKDsRJIBTsWlK1Ct5GQ6PzW1lpNf/view', embedSrc: 'https://drive.google.com/file/d/1QGXMBKDsRJIBTsWlK1Ct5GQ6PzW1lpNf/preview', type: 'video' },
  { date: 'Mon 8 Jun', title: 'Simulator Training Review',   subtitle: 'Research findings — brief/sim/debrief protocol',        externalHref: '/sim-docs/simulator-training-review.pdf',   type: 'pdf' },
  { date: 'Tue 9 Jun', title: "Martine's Weekly Reflection", subtitle: 'TTK observations · Onboarding week findings',           externalHref: '/sim-docs/martine-weekly-reflection.pdf',   type: 'pdf' },
  { date: 'Tue 9 Jun', title: 'Observations → Hypotheses',  subtitle: 'Live working doc — add your observations here',         externalHref: 'https://docs.google.com/document/d/1EMHci696tcldCJGU5qY_JCGvnUKAit8FE2mT4LESIbc/edit', type: 'gdoc' },
  { date: 'Fri 12 Jun', title: '2024 Reference Video',       subtitle: 'Race replay — T2 positioning reference',               externalHref: 'https://drive.google.com/file/d/11LxvUdhFeCmaks08ouYxwRBrMm3Pf5Ks/view', embedSrc: 'https://drive.google.com/file/d/11LxvUdhFeCmaks08ouYxwRBrMm3Pf5Ks/preview', type: 'video' },
];

const TUESDAY_NOTES = `Capture Goodie — needed to go 70s at T1 to get close to back of the box. From back of box gaining 3 TTK. TTK seemed good from slower speeds closer to the line. 1.4 Ratio seemed a good T2.

Martine: TTK is precise — 15 TTK normal tack, 17 TTK under pressure. Use time-to-start for better awareness of turning the boat.

Pietro: T2 manoeuvre unrealistic. Strong approach from behind with 4 boats — always a gap. Do 5 starts with one objective, then change.

Ras: Low at T2 transition made it hard.`;

// ── Helpers for rendering doc content ────────────────────────

function DocSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function DocBullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
      <span style={{ color: 'var(--sim)', fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>·</span>
      <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{children}</span>
    </div>
  );
}

function DocHighlight({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'color-mix(in srgb, var(--sim) 6%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic' }}>
      {children}
    </div>
  );
}

function DocStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sim)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );
}

// ── Document content components ───────────────────────────────

function DocTeamMeetingAgenda() {
  return (
    <>
      <DocHighlight>
        We've agreed we're looking for ways to improve our real-world result — and that improvement comes through a better M1 and start performance.
      </DocHighlight>
      <DocSection label="Three ways we improve">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
          {[['Knowledge', 'Understand settings and how we should do things'], ['Training', 'Train the right things, the right way'], ['Under Pressure', 'Make it hold when it counts']].map(([t, b]) => (
            <div key={t} style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 7, padding: '10px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sim)', marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{b}</div>
            </div>
          ))}
        </div>
      </DocSection>
      <DocSection label="This Week's Objectives">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Objective 1 — Does the sim reflect reality well enough?</div>
          <DocBullet>TWS — which true wind speed gives the most realistic behaviour</DocBullet>
          <DocBullet>T1 / T2 calibration — check against our role planner</DocBullet>
          <DocBullet>Turn rate → TTK — how much does turn rate affect TTK?</DocBullet>
          <DocBullet>Acceleration H1 → foiling — does it match reality?</DocBullet>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Objective 2 — Can the sim reproduce what decides our starts?</div>
          <DocBullet>Racereplay</DocBullet>
          <DocBullet>Influx model with Nico</DocBullet>
          <DocBullet>Peripheral view</DocBullet>
          <DocBullet>Landscape</DocBullet>
        </div>
      </DocSection>
      <DocSection label="What success looks like by Thursday">
        <DocBullet>We can say whether this sim is realistic enough to train starts.</DocBullet>
        <DocBullet>We can say whether it can reproduce a gas / positioning situation we can learn from.</DocBullet>
      </DocSection>
      <DocSection label="Accountability">
        <DocBullet>We haven't yet agreed what happens when the agreed job isn't done.</DocBullet>
        <DocBullet>This needs settling as a group.</DocBullet>
      </DocSection>
    </>
  );
}

function DocWeekObjectives() {
  const steps = [
    ['Step 0', 'Picture the plan', 'T1, T2, and our target position on the boundary and start line.'],
    ['Step 1', 'Recognise condition at X-point', 'TWS, distance to the line, and threat from other boats.'],
    ['Step 2', 'Adapting the transition to T1', 'If time or position isn\'t right, how do we adapt to still make the best of T1?'],
    ['Step 3', 'Time to manoeuvre: lead or push?', 'Read what the other boats are doing and decide from ratio or TTK.'],
    ['Step 4', 'The final kill after T2', 'Manage the kill of speed, establish max distance to line and space to leeward for trigger-pull.'],
    ['Step 5', 'Trigger-pull', 'The TTK adjustment and maximum acceleration.'],
  ];
  const weeks = [
    ['Week 24 (8–14 Jun)', 'Onboarding & Sim Evaluation'],
    ['Week 25 (15–21 Jun / Halifax)', 'Venue Familiarisation & Comms'],
    ['Week 26', 'X Point'],
    ['Week 27', 'T1 Transition'],
    ['Week 28', 'T2 Transition'],
    ['Week 29', 'Final Kill'],
    ['Week 30', 'Trigger Pull / Portsmouth Prep'],
  ];
  return (
    <>
      <DocSection label="Suggested weekly structure · 1h30 obligatory">
        {[['Monday (30 min)', 'Recap of previous week (Martine, 15 min) · Objective of the week (Ras, 15 min)'],
          ['Wednesday (45 min)', 'Free multiplayer practice — Martine + Ras'],
          ['Thursday (60 min)', 'Briefing (5 min) · Multiplayer session (25 min) · Race (10 min) · Debrief (20 min)'],
          ['Friday', 'Reflection on week + personal learnings + write report (ALL)'],
          ['Saturday', 'Deadline: learning reflections in SIM folder (ALL)'],
        ].map(([day, desc]) => (
          <div key={day} style={{ display: 'flex', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sim)', minWidth: 120, flexShrink: 0, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em' }}>{day}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </DocSection>
      <DocSection label="The Start — Six Steps">
        {steps.map(([step, title, body], i) => (
          <DocStep key={step} n={i} title={title} body={body} />
        ))}
      </DocSection>
      <DocSection label="Season plan">
        {weeks.map(([week, focus]) => (
          <div key={week} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text4)', minWidth: 110, flexShrink: 0, letterSpacing: '0.04em' }}>{week}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{focus}</div>
          </div>
        ))}
      </DocSection>
    </>
  );
}

function DocSimTrainingReview() {
  const findings = [
    ['Deliberate practice drives improvement', 'Skill gains come from structured, goal-directed practice with specific objectives and immediate feedback — not from time spent in the environment. Repetition without design produces diminishing returns.'],
    ['Practice difficulty has an optimum', 'Learning is fastest at ~70–85% success rate (15–30% error rate). Too easy = no growth. Too hard = performance breaks down.'],
    ['Positive feedback aids learning', 'Positive feedback — indicating successful performance — tends to enhance motor learning more than negative feedback. (Wulf & Lewthwaite, 2016)'],
    ['Transfer depends on relevance', 'Simulation transfers most strongly when the simulated situation resembles the real one in the features that matter, and when the learner explicitly connects sim to real-world behaviour.'],
    ['Shared mental models predict performance', 'The degree to which team members hold the same internal representation of a situation is one of the most consistent predictors of coordinated performance — beyond communication.'],
    ['Coordination becomes implicit', 'As teams develop strong shared models, they rely less on verbal communication and more on anticipation — predicting each other\'s actions without being told.'],
  ];
  return (
    <>
      <DocHighlight>
        "The debrief is consistently identified as the single most important element of a simulation-based learning experience — more important than the simulated activity itself." — Tannenbaum & Cerasoli (2013)
      </DocHighlight>
      <DocSection label="What improves real-world performance">
        {findings.map(([title, body]) => (
          <div key={title} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.65 }}>{body}</div>
          </div>
        ))}
      </DocSection>
      <DocSection label="Best protocol">
        <DocBullet><strong>Session length:</strong> 45–90 min active sim, max ~2 hours including debrief</DocBullet>
        <DocBullet><strong>Spacing:</strong> Distributed sessions beat massed practice — gaps support consolidation</DocBullet>
        <DocBullet><strong>One objective per session</strong> — spreading focus dilutes the learning</DocBullet>
        <DocBullet><strong>Debrief close in time</strong> — while events are fresh, structured, developmental</DocBullet>
        <DocBullet><strong>Expect a dip</strong> — when teams actively rebuild shared models, coordination can temporarily decline before improving</DocBullet>
      </DocSection>
      <DocSection label="Key summary">
        <DocHighlight>
          "Shared mental models take substantial time to build — weeks to a full season. Short interventions tend to fail. Measurable development is observed over sustained shared experience."
        </DocHighlight>
      </DocSection>
    </>
  );
}

function DocMartineReflection() {
  return (
    <>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--line)', overflow: 'hidden', flexShrink: 0 }}>
          <img src="/images/team/martine.png" alt="Martine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Martine Grael</div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>Week 24 reflection · Delivered Mon 9 Jun</div>
        </div>
      </div>
      <DocSection label="This week's objective">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Onboarding the SailGP SIM</div>
      </DocSection>
      <DocSection label="Five observations">
        <DocBullet>TTK is a reliable time for manoeuvring when ratio plummets entering late — <strong>15s for a normal tack, 17s under pressure</strong> (not accounting for polar gain)</DocBullet>
        <DocBullet>Polars always gaining, especially with stronger winds and on foil</DocBullet>
        <DocBullet>Manoeuvres at the back are not realistic — every time you're out of range of real sailing it takes much more to accelerate and get up to speed</DocBullet>
        <DocBullet>Time to the line helps trigger pulls in close-to-line situations</DocBullet>
        <DocBullet>Box at Portsmouth seemed quite big — 47 seconds into the box and not close to the back</DocBullet>
      </DocSection>
      <DocSection label="Key observation taken forward">
        <DocHighlight>
          Using TTK for a better idea of time out of the tack: 30s standby, 17s hard boat-on-boat, 15s good tack in clear air — not accounting for polar gain.
        </DocHighlight>
      </DocSection>
      <DocSection label="Why it matters for our starts">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
          We've been missing the key detail of how late we can be without losing timing to the start. In NYC we saw a good attempt at that — I want to study out-of-range situations more (e.g. Perth average TTK was 20).
        </div>
      </DocSection>
      <DocSection label="Evidence">
        <DocBullet>Perth TTK data</DocBullet>
        <DocBullet>Abu Dhabi comparison</DocBullet>
      </DocSection>
      <DocSection label="Proposed hypothesis">
        <DocHighlight>
          If we see a clear tack we can push the TTK within [threshold], then [metric] will improve, because [mechanism].
        </DocHighlight>
      </DocSection>
    </>
  );
}

function DocObservationsHypotheses() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.7 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Live Google Doc</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
        This document is actively edited by the team — add your observations here after each session.
      </div>
      <a
        href="https://docs.google.com/document/d/1EMHci696tcldCJGU5qY_JCGvnUKAit8FE2mT4LESIbc/edit"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4285f4', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open in Google Docs
      </a>
    </div>
  );
}

export const DOC_CONTENT: Record<string, React.ReactNode> = {
  'Team Meeting Agenda':         <DocTeamMeetingAgenda />,
  'Week Objectives & Programme': <DocWeekObjectives />,
  'Simulator Training Review':   <DocSimTrainingReview />,
  "Martine's Weekly Reflection": <DocMartineReflection />,
  'Observations → Hypotheses':   <DocObservationsHypotheses />,
};

// Inline document viewer
function DocViewer({ doc, onClose }: { doc: SimDoc; onClose: () => void }) {
  const content = DOC_CONTENT[doc.title];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Viewer header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'inherit' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
          <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>{doc.date}</div>
        </div>
        {doc.externalHref && (
          <a href={doc.externalHref} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--text4)', textDecoration: 'none', fontFamily: 'inherit', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open
          </a>
        )}
      </div>
      {/* Rendered content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
        {content}
      </div>
    </div>
  );
}

export function DocCard({ doc, onOpen, active = false }: { doc: SimDoc; onOpen: () => void; active?: boolean }) {
  const isPdf = doc.type === 'pdf';
  return (
    <button
      onClick={onOpen}
      style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: active ? 'var(--sg)' : 'var(--bg3)', borderRadius: 8, border: `1px solid ${active ? 'var(--sb)' : 'var(--line)'}`, transition: 'border-color 0.12s, background 0.12s', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 6, background: isPdf ? 'rgba(232,87,74,0.12)' : 'rgba(66,133,244,0.12)', border: `1px solid ${isPdf ? 'rgba(232,87,74,0.25)' : 'rgba(66,133,244,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isPdf ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8574a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2 }}>{doc.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.4 }}>{doc.subtitle}</div>
        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>{doc.date} · {isPdf ? 'PDF' : 'Google Doc'}</div>
      </div>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginTop: 4 }}>
        <path d="M3 2l4 3-4 3" stroke="var(--text4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// Shared brief overview content (used by both BlockSimBrief and Sim screen)
export function SimBriefOverview({ onOpenDoc, activeDoc }: { onOpenDoc: (doc: SimDoc) => void; activeDoc?: SimDoc | null }) {
  const [notesOpen, setNotesOpen] = useState(false);
  return (
    <div>
      {/* Session objectives */}
      <div style={{ background: 'color-mix(in srgb, var(--sim) 8%, var(--bg))', border: '1px solid var(--sb)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 6 }}>
          Fri 12 Jun · Session Objectives
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Evaluate T2 timing & positioning</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
          Using courses 150° and 345° TWD — focus on M1 position and ability to get early gybe on northerly course.
        </div>
        {[
          'Best TTK / ratio for optimal final kill before trigger pull',
          'Good T2 positioning — north/south, first/last in train',
          'Bad T2 positioning — north/south, first/last in train',
          'Compare to 2024 video — calibrate numbers if needed',
        ].map((obs, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--sg)', border: '1px solid var(--sb)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--sim)', fontFamily: "'Barlow Condensed', sans-serif" }}>{i + 1}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{obs}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        <ActionButton href="/capture" icon={<IconMic size={15} />} label="Capture note" style={{ fontSize: 12, padding: '9px 12px' }} />
        <ActionButton href="/alarms"
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
          label="Alarms"
          style={{ fontSize: 12, padding: '9px 12px', color: 'var(--text2)', borderColor: 'var(--line)', background: 'var(--bg3)' }}
        />
      </div>

      {/* Documents */}
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
        Session Documents
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {SIM_DOCS.map((doc, i) => <DocCard key={i} doc={doc} onOpen={() => onOpenDoc(doc)} active={activeDoc?.title === doc.title} />)}
        {/* Friday objectives placeholder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px dashed var(--line2)', opacity: 0.7 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>Friday Objectives</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>Fri 12 Jun · Rasmus will post before 08:30</div>
          </div>
        </div>
      </div>

        {/* Tuesday debrief notes — collapsible */}
        <button
          onClick={() => setNotesOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--line)', textAlign: 'left' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ transition: 'transform 0.15s', transform: notesOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} fill="none">
            <path d="M3 2l4 3-4 3" stroke="var(--text4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>
            Tue 9 Jun — Debrief notes
          </span>
        </button>
        {notesOpen && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 7, padding: '12px 14px', marginTop: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {TUESDAY_NOTES}
          </div>
        )}
    </div>
  );
}

// Used in DayBackbone block panel — handles its own doc navigation
export function BlockSimBrief() {
  const [openDoc, setOpenDoc] = useState<SimDoc | null>(null);
  if (openDoc) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <button onClick={() => setOpenDoc(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'inherit' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openDoc.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>{openDoc.date}</div>
          </div>
          {openDoc.externalHref && (
            <a href={openDoc.externalHref} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', fontSize: 11, color: 'var(--text4)', textDecoration: 'none', fontFamily: 'inherit', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </a>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
          {DOC_CONTENT[openDoc.title]}
        </div>
      </div>
    );
  }
  return (
    <>
      <BlockHeader eyebrow="Week 24 · Jun 8–14 · Onboarding & Sim Evaluation" title="Sim Brief & Objectives" tag="Sim" tagStyle={{ color: 'var(--sim)', background: 'var(--sg)', border: '1px solid var(--sb)' }} />
      <div className="gen-panel">
        <SimBriefOverview onOpenDoc={setOpenDoc} activeDoc={null} />
      </div>
    </>
  );
}

// ─── Sim Session — Debrief & Data Upload ─────────────────────

const SIM_REFLECTION_PROMPTS = [
  'What was your clearest observation from today — one thing that happened more than once?',
  'Did the sim behaviour match the real boat? Where did it feel different?',
  'What would you do differently in the next session based on today?',
  'One hypothesis: "If we change X, then Y will improve, because Z."',
];

// Viktor's API base — direct from browser to avoid Vercel's 4.5 MB proxy limit
export const VIKTOR_BASE = process.env.NEXT_PUBLIC_VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';
export const VIKTOR_HEADERS = { 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' };

// SimOut from API: { scoreboard: object, plots: object }
// plots is a dict of name → Plotly figure JSON
type SimOut = { scoreboard: Record<string, unknown>; plots: Record<string, { data: Plotly.Data[]; layout: Partial<Plotly.Layout> }> };

function SimPlots({ sessId }: { sessId: number }) {
  const [result, setResult] = useState<SimOut | null>(null);
  const [error, setError]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    let delay = 3000;

    async function poll() {
      if (cancelled) return;
      try {
        const res  = await fetch(`${VIKTOR_BASE}/sim_session/${sessId}`, { headers: { 'ngrok-skip-browser-warning': '1' } });
        if (!res.ok) { setTimeout(poll, delay = Math.min(delay * 1.5, 15000)); return; }
        const data: SimOut = await res.json();
        if (cancelled) return;
        // If plots is empty the server is still processing
        if (!data.plots || Object.keys(data.plots).length === 0) {
          setResult(data);
          setTimeout(poll, delay = Math.min(delay * 1.5, 15000));
          return;
        }
        setResult(data);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [sessId]);

  if (error) return (
    <div style={{ fontSize: 12, color: 'var(--red)', padding: '12px 0' }}>Could not reach server — try refreshing.</div>
  );

  if (!result || Object.keys(result.plots ?? {}).length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: 'var(--text3)', fontSize: 12 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Processing your data…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const plots  = Object.entries(result.plots);
  const board  = result.scoreboard;
  const boardRows = board ? Object.entries(board) : [];

  return (
    <div style={{ marginTop: 16 }}>
      {/* Scoreboard */}
      {boardRows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sim)', marginBottom: 8 }}>Scoreboard</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {boardRows.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '5px 10px', color: 'var(--text3)', fontWeight: 600, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{k}</td>
                    <td style={{ padding: '5px 10px', color: 'var(--text)', borderBottom: '1px solid var(--line)' }}>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plotly charts */}
      {plots.map(([name, fig]) => (
        <div key={name} style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
          {name && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', padding: '8px 12px 0', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>{name}</div>}
          <Plot
            data={fig.data}
            layout={{
              ...fig.layout,
              // Override any hardcoded dimensions from the backend so the chart
              // fills its container responsively
              width:         undefined,
              height:        undefined,
              autosize:      true,
              paper_bgcolor: 'transparent',
              plot_bgcolor:  'transparent',
              font: { family: 'Barlow, sans-serif', size: 11, color: 'var(--text)' },
              margin: { t: 24, r: 16, b: 40, l: 48 },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%', minHeight: 360 }}
            useResizeHandler
          />
        </div>
      ))}
    </div>
  );
}

export function SimDataUpload({ userName }: { userName?: string }) {
  const [file, setFile]       = useState<File | null>(null);
  const [status, setStatus]   = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [sessId, setSessId]   = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (f: File) => {
    setFile(f);
    setStatus('uploading');
    try {
      // Encode file to base64 — API expects JSON { user, file: base64 }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      // Use timestamp as session ID (integer, unique per upload)
      const id = Math.floor(Date.now() / 1000);

      const res = await fetch(`${VIKTOR_BASE}/sim_session/${id}`, {
        method:  'POST',
        headers: VIKTOR_HEADERS,
        body:    JSON.stringify({ user: userName ?? 'unknown', file: base64 }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setSessId(id);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [userName]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  }

  function reset() { setFile(null); setStatus('idle'); setSessId(null); }

  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
        Upload Sim Session File
      </div>

      {(status === 'idle' || status === 'error') && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${status === 'error' ? 'var(--rb)' : 'var(--sb)'}`, borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: status === 'error' ? 'var(--rg)' : 'color-mix(in srgb, var(--sim) 5%, var(--bg))' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={status === 'error' ? 'var(--red)' : 'var(--sim)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 600, color: status === 'error' ? 'var(--red)' : 'var(--sim)', marginBottom: 4 }}>
            {status === 'error' ? 'Upload failed — try again' : 'Drop your sim file here'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>or tap to browse · any format</div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        </div>
      )}

      {status === 'uploading' && (
        <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 13, color: 'var(--sim)', fontWeight: 600, marginBottom: 4 }}>Uploading {file?.name}…</div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>Sending to Viktor's server</div>
        </div>
      )}

      {status === 'done' && (
        <div>
          <div style={{ padding: '12px 16px', background: 'var(--gg)', border: '1px solid var(--gb)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ {file?.name}</div>
              {sessId && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Session #{sessId}</div>}
            </div>
            <button onClick={reset} style={{ fontSize: 11, color: 'var(--text4)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Upload another
            </button>
          </div>
          {sessId && <SimPlots sessId={sessId} />}
        </div>
      )}
    </div>
  );
}

export function BlockSimDebrief() {
  const { user } = useUser();
  const userName = user?.firstName ?? user?.username ?? undefined;
  return (
    <>
      <BlockHeader
        eyebrow="End of Sim Day · Reflect & Upload"
        title="Full Day Debrief"
        tag="Debrief"
        tagStyle={{ color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--line)' }}
      />
      <div className="gen-panel">

        {/* Record debrief */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
            Record Debrief
          </div>
          <ActionButton href="/capture"
            icon={<IconMic size={15} />}
            label="Start debrief recording"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6, lineHeight: 1.5 }}>
            Open Capture → record your thoughts out loud. GingAI transcribes and stores it.
          </div>
        </div>

        {/* Reflection prompts */}
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
          Reflection Prompts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {SIM_REFLECTION_PROMPTS.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: 'var(--bg3)', borderRadius: 7, border: '1px solid var(--line)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--sim)', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>

        {/* Sim data upload */}
        <SimDataUpload userName={userName} />

        {/* Observations doc */}
        <div style={{ marginTop: 16 }}>
          <DocCard doc={SIM_DOCS[SIM_DOCS.length - 1]} onOpen={() => window.open(SIM_DOCS[SIM_DOCS.length - 1].externalHref, '_blank')} />
        </div>
      </div>
    </>
  );
}

// ─── Generic (past / future) ──────────────────────────────────

function BlockGeneric({ selectedId, blocks: propBlocks }: { selectedId: string; blocks?: import('@/types').Block[] }) {
  const blocks = propBlocks ?? getBlocks();
  const block = blocks.find(b => b.id === selectedId);
  if (!block) return null;

  return (
    <>
      <BlockHeader
        eyebrow={`${block.time}${block.tag ? ` · ${block.tag}` : ''} · ${block.status === 'past' ? 'Past' : 'Upcoming'}`}
        title={block.name}
      />
      <div className="gen-panel">
        {block.status === 'past' ? (
          <div style={{ color: 'var(--text3)', fontSize: 14 }}>Session complete.</div>
        ) : (
          <EmptyBlock
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            title={block.name}
            hint="Content for this block will be available closer to the session."
          />
        )}
      </div>
    </>
  );
}

// ─── Main export — single entry point ─────────────────────────

export default function BlockContent({ panel, selectedId, blocks }: {
  panel: string;
  selectedId: string;
  blocks?: import('@/types').Block[];
}) {
  switch (panel) {
    case 'tent':  return <BlockTent />;
    case 'sim':        return <BlockSim />;
    case 'sim-brief':  return <BlockSimBrief />;
    case 'sim-debrief':return <BlockSimDebrief />;
    case '1330':  return <Block1330 data={null} />;
    case '1500':  return <Block1500 data={null} />;
    case '1550':  return <Block1550 data={null} />;
    case '1818':  return <Block1818 />;
    case '1930':  return <Block1930 />;
    default:      return <BlockGeneric selectedId={selectedId} blocks={blocks} />;
  }
}
