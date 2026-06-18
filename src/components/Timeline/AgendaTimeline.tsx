'use client';

import { WeatherPanel, TidePanel } from './ConditionsPanel';
import type { ScheduleEvent } from '@/types/schedule';

interface Props {
  items: ScheduleEvent[];
  dayLabel: string;
  venueCity?: string;
  venueLat?: number;
  venueLon?: number;
  selectedDate?: Date;
}

export default function AgendaTimeline({ items, dayLabel, venueCity, venueLat, venueLon, selectedDate }: Props) {
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

      <div className="tl-list">
        {timedItems.map((item, i) => (
          <div key={i} className="tl-item">
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
                <a
                  href={item.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Google Drive"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: 'var(--green)', background: 'var(--gg)',
                    borderRadius: 3, padding: '1px 5px', border: '1px solid var(--gb)',
                    textDecoration: 'none', marginTop: 3,
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Drive
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
