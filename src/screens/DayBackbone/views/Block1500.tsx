'use client';

export interface WarmUpBlockData {
  exercises?: { name: string; url?: string; duration?: string }[];
  notes?: string;
}

interface Props { data?: WarmUpBlockData | null }

export default function Block1500({ data }: Props) {
  return (
    <>
      <div className="main-top">
        <div className="eyebrow">15:00 · Warm Up</div>
        <div className="page-title">Warm Up</div>
      </div>
      <div className="gen-panel">
        {!data || (!data.exercises?.length && !data.notes) ? (
          <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.7 }}>
            Warm-up protocol will be set by the coaching staff before the session.
          </div>
        ) : (
          <>
            {data.notes && (
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20 }}>
                {data.notes}
              </div>
            )}
            {data.exercises && data.exercises.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.exercises.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < data.exercises!.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: ex.url ? 'pointer' : 'default',
                    }}
                    onClick={() => ex.url && window.open(ex.url, '_blank', 'noopener')}
                  >
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{ex.name}</div>
                      {ex.duration && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{ex.duration}</div>}
                    </div>
                    {ex.url && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--line2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
