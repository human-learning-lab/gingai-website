import { BLOCKS } from '../../../data/blocks';

interface Props {
  selectedId: string;
}

export default function BlockGeneric({ selectedId }: Props) {
  const block = BLOCKS.find(b => b.id === selectedId);
  if (!block) return null;

  const isPast = block.status === 'past';

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
            Session complete. No linked GingAI content for this block.
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              This block is not yet active. GingAI will surface relevant content when it opens.
            </div>
            <div className="sec-title">Day Backbone continues</div>
            <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>
              The next active block is{' '}
              <strong style={{ color: 'var(--text)' }}>14:30 — Brief the Day</strong>. Select it in the timeline
              to view the full briefing pack, focus points, and team chat.
            </div>
          </>
        )}
      </div>
    </>
  );
}
