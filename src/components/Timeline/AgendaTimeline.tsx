'use client';

import { WeatherPanel, TidePanel } from './ConditionsPanel';

interface AgendaItem {
  time: string;
  title: string;
  tag?: string;
  tagColor?: string;
}

interface Props {
  items: AgendaItem[];
  dayLabel: string;
  venueCity?: string;
  venueLat?: number;
  venueLon?: number;
  selectedDate?: Date;
}

export default function AgendaTimeline({ items, dayLabel, venueCity, venueLat, venueLon, selectedDate }: Props) {
  // Only show time-bearing items in the timeline (skip Hotel/Venue location rows)
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
              <div className="tl-name">{item.title}</div>
              {item.tag && (
                <div className="tl-tag" style={{ color: item.tagColor || 'var(--text3)' }}>
                  {item.tag}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
