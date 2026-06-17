'use client';

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { IconStar } from '@/components/Icons';
import type { BriefingBlockData } from '@/types/block-content';
// canEdit kept for future use when coach manual entry is added

interface Props {
  data: BriefingBlockData | null;
}

function EmptyState() {
  return (
    <div className="gen-panel">
      <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.7 }}>
        Briefing pack will be ready before the session.
      </div>
    </div>
  );
}

export default function Block1430({ data }: Props) {
  const [tab, setTab] = useState<'briefing' | 'focus' | 'chat'>('briefing');
  const { role } = useRole();

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">14:30 · Phase 1 — Prime</div>
        <div className="page-title">
          Brief the Day <span className="ptag ptag-g">Prime</span>
        </div>
      </div>

      {!data ? (
        <EmptyState />
      ) : (
        <>
          <div className="tabs">
            <div className={`tab${tab === 'briefing' ? ' on' : ''}`} onClick={() => setTab('briefing')}>Briefing Pack</div>
            <div className={`tab${tab === 'focus' ? ' on' : ''}`} onClick={() => setTab('focus')}>
              {role?.view === 'sailor' ? 'My Focus Points' : 'Focus Points'}
            </div>
            <div className={`tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}>
              Chat
              {data.chatMessages && data.chatMessages.length > 0 && (
                <span style={{ color: 'var(--green)', marginLeft: 3, fontSize: 10 }}>{data.chatMessages.length}</span>
              )}
            </div>
          </div>

          {tab === 'briefing' && (
            <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.conditions && (
                <div className="cond-card">
                  <div className="cond-cell">
                    <div className="cond-lbl">Wind</div>
                    <div className="cond-val">{data.conditions.wind}</div>
                    <div className="cond-unit">kts</div>
                  </div>
                  <div className="cond-cell cond-cell-mid">
                    <div className="cond-lbl">Direction</div>
                    <div className="cond-val" style={{ color: 'var(--text2)' }}>{data.conditions.direction}</div>
                    <div className="cond-unit">{data.conditions.steadiness}</div>
                  </div>
                  <div className="cond-cell">
                    <div className="cond-lbl">Course</div>
                    <div className="cond-val" style={{ color: 'var(--yellow)' }}>{data.conditions.course}</div>
                    {data.conditions.courseDetail && <div className="cond-unit">{data.conditions.courseDetail}</div>}
                  </div>
                </div>
              )}

              {data.documents && data.documents.length > 0 && (
                <div className="card">
                  <div className="card-label">Documents</div>
                  {data.documents.map((doc, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0',
                        borderBottom: i < data.documents!.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <span className={`doc-badge doc-badge-${doc.type.toLowerCase()}`}>{doc.type}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="doc-n" style={{ marginBottom: 2 }}>{doc.name}</div>
                        <div className="doc-m">{doc.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.aiBriefing && (
                <div className="card card-g">
                  <div className="card-label" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <IconStar /> GingAI · Race Briefing
                  </div>
                  <div className="ai-body">{data.aiBriefing}</div>
                </div>
              )}

              {data.coachNotes && (
                <div className="card">
                  <div className="card-label">Coach notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.coachNotes}</div>
                </div>
              )}
            </div>
          )}

          {tab === 'focus' && (
            <div className="pane on">
              {!data.focusPoints || data.focusPoints.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.7, padding: '24px 0' }}>
                  Focus points will be generated by GingAI before the session.
                </div>
              ) : role?.view === 'sailor' ? (
                <>
                  <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>{role.name} · personal focus areas for today</div>
                  {(data.focusPoints.find(f => f.sailor === role.name)?.points ?? []).map((p, i) => (
                    <div className="fp-card" key={i}>
                      <div className="fp-card-num">{i + 1}</div>
                      <div className="fp-card-body">
                        <div className="fp-card-title">{p}</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>Team · focus areas per sailor today</div>
                  {data.focusPoints.map(sailor => (
                    <div className="card" key={sailor.sailor} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div className="s-ava" style={{ color: 'var(--green)', borderColor: 'var(--gb)', background: 'var(--gg)' }}>
                          {sailor.sailor.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{sailor.sailor}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sailor.role}</div>
                        </div>
                      </div>
                      {sailor.points.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--yellow)', minWidth: 18, flexShrink: 0, lineHeight: 1.4 }}>{i + 1}</div>
                          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>{p}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'chat' && (
            <div className="pane on">
              {!data.chatMessages || data.chatMessages.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.7, padding: '24px 0' }}>
                  No messages yet. Thread will be active during the briefing session.
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="card-label" style={{ marginBottom: 0 }}>14:30 · Contextual Thread</div>
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>{data.chatMessages.length} messages</div>
                  </div>
                  {data.chatMessages.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 12, padding: '14px 16px',
                      borderBottom: i < data.chatMessages!.length - 1 ? '1px solid var(--line)' : 'none',
                      background: m.isAI ? 'var(--gg)' : 'transparent',
                    }}>
                      <div className="msg-ava" style={{ color: m.isAI ? 'var(--green)' : 'var(--text2)', background: m.isAI ? 'var(--bg2)' : undefined, borderColor: m.isAI ? 'var(--gb)' : undefined, flexShrink: 0 }}>
                        {m.isAI ? <IconStar size={11} /> : m.initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                          <span className="msg-who" style={{ color: m.isAI ? 'var(--green)' : undefined }}>{m.name}</span>
                          <span className="msg-ts">{m.time}</span>
                        </div>
                        <div className="msg-txt">{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
