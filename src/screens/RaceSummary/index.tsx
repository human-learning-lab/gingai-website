'use client';

import React, { useState } from 'react';

// ── Agent helpers ─────────────────────────────────────────────────────────────
const AGENT_BASE = '/api/agent';
const APP_NAME = 'event';

interface ActionItem {
  day: string;
  owner: string;
  action_item: string;
  notes: string;
}

interface EventSummary {
  event_name: string;
  event_dates: string;
  action_items: ActionItem[];
  key_wins: string[];
  open_questions: string[];
}

async function analyzeEvent(eventName: string): Promise<EventSummary> {
  const sessionId = `event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

  await fetch(`${AGENT_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: APP_NAME,
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text: `Analyze the ${eventName} event` }] },
      streaming: false,
    }),
  });

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const event = JSON.parse(raw);
        for (const part of event?.content?.parts ?? []) {
          if (typeof part.text === 'string') fullText += part.text;
        }
      } catch { /* skip */ }
    }
  }

  // Extract JSON from the response (may be wrapped in markdown code fences)
  const jsonMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? fullText.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1] ?? fullText;
  return JSON.parse(jsonStr.trim());
}

// ── Regatta list ──────────────────────────────────────────────────────────────
const EVENTS = [
  { id: 'perth',    name: 'Perth',       dates: 'Jan 17–18',    flag: '🇦🇺' },
  { id: 'auckland', name: 'Auckland',    dates: 'Feb 14–15',    flag: '🇳🇿' },
  { id: 'sydney',   name: 'Sydney',      dates: 'Feb 28–Mar 1', flag: '🇦🇺' },
  { id: 'rio',      name: 'Rio',         dates: 'Apr 11–12',    flag: '🇧🇷' },
  { id: 'bermuda',  name: 'Bermuda',     dates: 'May 10–11',    flag: '🇧🇲' },
  { id: 'newyork',  name: 'New York',    dates: 'May 28–Jun 1', flag: '🇺🇸' },
  { id: 'halifax',  name: 'Halifax',     dates: 'Jun 17–21',    flag: '🇨🇦' },
];

const DAY_ORDER = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Thursday', 'Wednesday', 'Tuesday'];

// ── Sub-components ────────────────────────────────────────────────────────────
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, background: 'var(--bg3)', borderRadius: 4, padding: '2px 6px' }}>
      {text}
    </span>
  );
}

function SummaryView({ data }: { data: EventSummary }) {
  const days = Array.from(new Set(data.action_items.map(i => i.day)))
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 4 }}>
          {data.event_dates}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{data.event_name}</div>
      </div>

      {/* Action items */}
      {data.action_items.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>Action items</div>
          {days.map(day => (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.action_items.filter(i => i.day === day).map((item, idx) => (
                  <div key={idx} style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: item.notes ? 4 : 0 }}>
                      <Pill text={item.owner} color="var(--navy)" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{item.action_item}</span>
                    </div>
                    {item.notes && <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.5 }}>{item.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Key wins */}
      {data.key_wins.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>Key wins</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.key_wins.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{w}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Open questions */}
      {data.open_questions.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>Open questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.open_questions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--yellow)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>?</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{q}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RaceSummary() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, EventSummary | { error: string }>>({});

  async function handleAnalyze(eventId: string, eventName: string) {
    setSelected(eventId);
    if (results[eventId]) return;
    setLoading(true);
    try {
      const data = await analyzeEvent(eventName);
      setResults(prev => ({ ...prev, [eventId]: data }));
    } catch (e) {
      setResults(prev => ({ ...prev, [eventId]: { error: e instanceof Error ? e.message : 'Failed to analyze event' } }));
    } finally {
      setLoading(false);
    }
  }

  const current = selected ? results[selected] : null;

  return (
    <div className="s-backbone" style={{ overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 4 }}>Season 6 · 2026</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Race Summary</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {EVENTS.map(ev => {
            const hasResult = !!results[ev.id];
            const isActive = selected === ev.id;
            return (
              <button
                key={ev.id}
                onClick={() => handleAnalyze(ev.id, ev.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit', background: isActive ? 'var(--gg)' : 'none',
                  borderLeft: `2px solid ${isActive ? 'var(--green)' : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span style={{ fontSize: 16 }}>{ev.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--green)' : 'var(--text2)' }}>{ev.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)' }}>{ev.dates}</div>
                </div>
                {hasResult && !('error' in results[ev.id]) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main panel ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--line)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--text4)' }}>Analyzing event…</div>
          </div>
        )}
        {!loading && !current && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--line2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <div style={{ fontSize: 13, color: 'var(--text4)' }}>Select an event to generate a summary</div>
          </div>
        )}
        {!loading && current && 'error' in current && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', maxWidth: 320 }}>{current.error}</div>
          </div>
        )}
        {!loading && current && !('error' in current) && (
          <SummaryView data={current} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
