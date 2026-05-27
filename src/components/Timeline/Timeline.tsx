'use client';

import { useState, useEffect, useRef } from 'react';
import { getBlocks } from '@/data/blocks';
import type { Block } from '@/types';
import { WeatherPanel, TidePanel } from './ConditionsPanel';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  renderExpanded?: (blockId: string) => React.ReactNode;
  venueLat?: number;
  venueLon?: number;
  venueCity?: string;
  blocks?: Block[];
}

function formatTZero(offset: number): string {
  const abs = Math.abs(offset);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (offset === 0) return 'T–0';
  if (offset > 0) return `T+${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
  return `T–${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
}

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

function useNow(intervalMs = 10000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Signed seconds relative to T-Zero: negative = before, positive = elapsed after */
function secsRelTZero(targetTime: string, now: Date): number {
  const [h, m] = targetTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.floor((now.getTime() - target.getTime()) / 1000);
}

export default function Timeline({ selectedId, onSelect, renderExpanded, venueLat, venueLon, venueCity, blocks: propBlocks }: Props) {
  const now = useNow();
  const blocks = propBlocks ?? getBlocks(now);
  const listRef = useRef<HTMLDivElement>(null);

  const tZeroBlock = blocks.find(b => b.tZeroOffset === 0);
  const [relSecs, setRelSecs] = useState(() =>
    tZeroBlock ? secsRelTZero(tZeroBlock.time, now) : -1
  );

  useEffect(() => {
    const t = setInterval(() => {
      if (tZeroBlock) setRelSecs(secsRelTZero(tZeroBlock.time, new Date()));
    }, 1000);
    return () => clearInterval(t);
  }, [tZeroBlock]);

  // Scroll "now" block into view on mount and whenever it changes
  useEffect(() => {
    const nowBlock = blocks.find(b => b.status === 'now');
    if (!nowBlock || !listRef.current) return;
    const el = listRef.current.querySelector(`#tl-${nowBlock.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.find(b => b.status === 'now')?.id]);

  // Before T-Zero: countdown (positive display). After T-Zero: elapsed with + prefix.
  const isElapsed = relSecs > 0;
  const absSecs = Math.abs(relSecs);
  const hh = String(Math.floor(absSecs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((absSecs % 3600) / 60)).padStart(2, '0');
  const ss = String(absSecs % 60).padStart(2, '0');
  const countdownStr = isElapsed ? `+${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;

  return (
    <div className="tl">
      <div className="tl-top">
        <div className="tl-eyebrow">Race Day 1 · Season 6</div>
        <div className="tl-day">{venueCity ?? 'Event'}</div>
        <div className="tl-sub">{venueCity ? `${venueCity} SailGP · 2026` : 'SailGP · 2026'}</div>
        <WeatherPanel lat={venueLat} lon={venueLon} city={venueCity} />
        <TidePanel />
        <EquipmentPanel />
      </div>
      <div className="tl-list" ref={listRef}>
        {blocks.map(block => (
          <div key={block.id}>
            <TimelineItem
              block={block}
              selected={selectedId === block.id}
              countdown={countdownStr}
              onClick={() => onSelect(block.id)}
            />
            {renderExpanded && selectedId === block.id && (
              <div style={{
                borderLeft: '2px solid var(--green)',
                marginLeft: 12,
                marginBottom: 4,
                background: 'var(--bg2)',
                borderRadius: '0 8px 8px 0',
                overflow: 'hidden',
              }}>
                {renderExpanded(block.id)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EquipmentPanel() {
  return (
    <div className="eq-section">
      <div className="eq-title">Equipment Config</div>
      <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
        Equipment selection will appear here when configured for the event.
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

  const showTZero = block.status !== 'past' && block.tZeroOffset !== undefined;
  const isRaceStart = block.tZeroOffset === 0;

  return (
    <div className={classes} id={`tl-${block.id}`} onClick={onClick}>
      <div style={{ minWidth: 38, marginTop: 1 }}>
        <div className="tl-time">{block.time}</div>
        {showTZero && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: isRaceStart ? 'var(--green)' : 'var(--text4)',
            marginTop: 2,
          }}>
            {formatTZero(block.tZeroOffset!)}
          </div>
        )}
      </div>
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
