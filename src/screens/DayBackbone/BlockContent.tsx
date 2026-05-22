'use client';

import { useState } from 'react';
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

function Block1500({ data }: { data: WarmUpBlockData | null }) {
  const empty = !data || (!data.exercises?.length && !data.notes);
  return (
    <>
      <BlockHeader eyebrow="15:00 · Warm Up" title="Warm Up" />
      <div className="gen-panel">
        {empty ? (
          <EmptyBlock
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            title="Warm Up"
            hint="The coaching staff will add the warm-up protocol before the session."
          />
        ) : (
          <>
            {data!.notes && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>{data!.notes}</div>}
            {data!.exercises?.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < data!.exercises!.length - 1 ? '1px solid var(--line)' : 'none', cursor: ex.url ? 'pointer' : 'default' }}
                onClick={() => ex.url && window.open(ex.url, '_blank', 'noopener')}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</div>
                  {ex.duration && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{ex.duration}</div>}
                </div>
                {ex.url && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--line2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
              </div>
            ))}
          </>
        )}
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

// ─── Generic (past / future) ──────────────────────────────────

function BlockGeneric({ selectedId }: { selectedId: string }) {
  const blocks = getBlocks();
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

export default function BlockContent({ panel, selectedId }: { panel: string; selectedId: string }) {
  switch (panel) {
    case '1330': return <Block1330 data={null} />;
    case '1500': return <Block1500 data={null} />;
    case '1550': return <Block1550 data={null} />;
    case '1818': return <Block1818 />;
    case '1930': return <Block1930 />;
    default:     return <BlockGeneric selectedId={selectedId} />;
  }
}
