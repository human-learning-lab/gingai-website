import { useState, useEffect } from 'react';
import { BLOCKS } from '../../data/blocks';
import type { Block } from '../../types';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function Timeline({ selectedId, onSelect }: Props) {
  const [countdown, setCountdown] = useState(23 * 60 + 18);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');

  return (
    <div className="tl">
      <div className="tl-top">
        <div className="tl-eyebrow">Race Day 1</div>
        <div className="tl-day">São Paulo</div>
        <div className="tl-sub">12 Mar 2026</div>
      </div>
      <div className="tl-list">
        {BLOCKS.map(block => (
          <TimelineItem
            key={block.id}
            block={block}
            selected={selectedId === block.id}
            countdown={`00:${mm}:${ss}`}
            onClick={() => onSelect(block.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ block, selected, countdown, onClick }: {
  block: Block;
  selected: boolean;
  countdown: string;
  onClick: () => void;
}) {
  const classes = [
    'tl-item',
    block.status === 'past' ? 'past' : '',
    block.status === 'now' ? 'now' : '',
    selected ? 'sel' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} id={`tl-${block.id}`} onClick={onClick}>
      <div className="tl-time">{block.time}</div>
      <div className="tl-info">
        <div className="tl-name">{block.name}</div>
        {block.tag && (
          <div className="tl-tag" style={{ color: block.tagColor || 'var(--text3)' }}>
            {block.tag}
          </div>
        )}
        {block.status === 'now' && (
          <div className="tl-cd">
            <div className="pdot" />
            <div className="cd-txt">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
}
