'use client';

import { getBlocks } from '@/data/blocks';

interface Props { selectedId: string; }

export default function BlockGeneric({ selectedId }: Props) {
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === selectedId);
  if (!block) return null;

  const isPast = block.status === 'past';
  const nextContentBlock = blocks.find(b =>
    b.status !== 'past' && !['past', 'future'].includes(b.panel)
  );

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">
          {block.time}{block.tag ? ` · ${block.tag}` : ''} · {isPast ? 'Past' : 'Upcoming'}
        </div>
        <div className="page-title" style={isPast ? { opacity: 0.5 } : undefined}>
          {block.name}
        </div>
      </div>
      <div className="gen-panel">
        {isPast ? (
          <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.7 }}>
            Session complete.
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              GingAI will surface relevant content when this block opens.
            </div>
            {nextContentBlock && (
              <>
                <div className="sec-title">Day Backbone continues</div>
                <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>
                  The next active block is{' '}
                  <strong style={{ color: 'var(--text)' }}>{nextContentBlock.time} — {nextContentBlock.name}</strong>.
                  Select it in the timeline to view details.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
