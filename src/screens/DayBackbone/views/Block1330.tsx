'use client';

import type { DebriefBlockData } from '@/types/block-content';

interface Props {
  data: DebriefBlockData | null;
}

function EmptyState() {
  return (
    <div className="gen-panel">
      <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.7 }}>
        Debrief summary will appear after the session completes.
      </div>
    </div>
  );
}

export default function Block1330({ data }: Props) {
  return (
    <>
      <div className="main-top">
        <div className="eyebrow">13:30 · Past · Phase 5 — Learn</div>
        <div className="page-title" style={{ opacity: data ? 1 : 0.6 }}>Debrief &amp; Sim Brief</div>
      </div>

      {!data ? (
        <EmptyState />
      ) : (
        <div className="gen-panel">
          {data.aiBriefSummary && (
            <>
              <div className="sec-title">GingAI Debrief Summary</div>
              <div className="ai-body" style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
                {data.durationMinutes && (
                  <span style={{ color: 'var(--text3)', display: 'block', marginBottom: 6, fontSize: 11 }}>
                    Session duration: {data.durationMinutes} min
                  </span>
                )}
                {data.aiBriefSummary}
              </div>
            </>
          )}

          {data.actionItems && data.actionItems.length > 0 && (
            <>
              <div className="sec-title">Action Items Logged</div>
              {data.actionItems.map((a, i) => (
                <div
                  className="past-action-row"
                  key={i}
                  style={i === data.actionItems!.length - 1 ? { borderBottom: 'none' } : undefined}
                >
                  <div className="pa-dot" style={{ background: a.priority === 'high' ? 'var(--green)' : 'var(--yellow)' }} />
                  <div>
                    <div className="pa-txt">{a.text}</div>
                    <div className="pa-meta">Owner: {a.owner} · Due: {a.due}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {data.goldenRulesPromoted && data.goldenRulesPromoted.length > 0 && (
            <>
              <div className="sec-title" style={{ marginTop: 24 }}>Golden Rules Promoted</div>
              {data.goldenRulesPromoted.map((r, i) => (
                <div className="ai-body" key={i}>
                  Rule #{r.ruleNumber} — &ldquo;{r.text}&rdquo; was promoted from this session.
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
        </div>
      )}
    </>
  );
}
