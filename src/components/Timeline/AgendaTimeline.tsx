'use client';

import type React from 'react';

function driveFileType(url: string): string {
  if (/docs\.google\.com\/document/.test(url)) return 'Doc';
  if (/docs\.google\.com\/spreadsheets/.test(url)) return 'Sheet';
  if (/docs\.google\.com\/presentation/.test(url)) return 'Slides';
  if (/docs\.google\.com\/forms/.test(url)) return 'Form';
  const ext = url.match(/\.([a-z]{2,5})(?:[?#]|$)/i)?.[1]?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'Sheet';
  if (ext === 'docx' || ext === 'doc') return 'Doc';
  if (ext === 'pptx' || ext === 'ppt') return 'Slides';
  return 'File';
}
import { WeatherPanel, TidePanel } from './ConditionsPanel';
import type { ScheduleEvent } from '@/types/schedule';

interface Props {
  items: ScheduleEvent[];
  dayLabel: string;
  venueCity?: string;
  venueLat?: number;
  venueLon?: number;
  selectedDate?: Date;
  editControls?: React.ReactNode;
  onSelect?: (item: ScheduleEvent) => void;
  selectedId?: string;
}

export default function AgendaTimeline({ items, dayLabel, venueCity, venueLat, venueLon, selectedDate, editControls, onSelect, selectedId }: Props) {
  const timedItems = items.filter(item => item.time !== '—');

  return (
    <div className="tl">
      <div className="tl-top">
        <div className="tl-eyebrow">Team Schedule</div>
        <div className="tl-day">{venueCity ?? 'Event'}</div>
        <div className="tl-sub">{dayLabel} · SailGP 2026</div>
        <WeatherPanel lat={venueLat} lon={venueLon} city={venueCity} />
        <TidePanel date={selectedDate} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 4px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)' }}>
          Events
        </div>
        {editControls}
      </div>

      <div className="tl-list">
        {timedItems.map((item, i) => (
          <div
            key={i}
            className="tl-item"
            onClick={() => onSelect?.(item)}
            style={{ cursor: 'pointer', background: selectedId === item.id ? 'var(--gg)' : undefined }}
          >
            <div style={{ minWidth: 38, marginTop: 1 }}>
              <div className="tl-time">{item.time}</div>
            </div>
            <div className="tl-info">
              <div className="tl-name">{item.label}</div>
              {item.tag && (
                <div className="tl-tag" style={{ color: item.tagColor || 'var(--text3)' }}>
                  {item.tag}
                </div>
              )}
              {item.driveUrl && (
                <span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--green)', background: 'var(--gg)', borderRadius: 3, padding: '1px 5px', border: '1px solid var(--gb)', marginTop: 3 }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {driveFileType(item.driveUrl)}
                </span>
              )}
              {item.mapsUrl && (
                <a href={item.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", color: '#ea4335', background: 'rgba(234,67,53,0.08)', borderRadius: 3, padding: '1px 5px', border: '1px solid rgba(234,67,53,0.25)', textDecoration: 'none', marginTop: 3 }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Maps
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
