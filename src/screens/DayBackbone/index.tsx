'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import LeftNav from '@/components/LeftNav/LeftNav';
import Timeline from '@/components/Timeline/Timeline';
import Block1430 from './views/Block1430';
import Block1330 from './views/Block1330';
import Block1818 from './views/Block1818';
import Block1500 from './views/Block1500';
import Block1550 from './views/Block1550';
import BlockGeneric from './views/BlockGeneric';
import StatusRail from './StatusRail';
import { BLOCKS } from '@/data/blocks';

const REGATTAS = [
  { id: 'perth',      city: 'Perth',          short: 'Perth',       dates: 'Jan 17–18',    result: 'Past',     photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
  { id: 'auckland',   city: 'Auckland',       short: 'Auckland',    dates: 'Feb 14–15',    result: 'Past',     photo: '/images/boat-auckland.jpg',     photoPos: 'center 60%',   days: ['Day 1', 'Day 2'] },
  { id: 'sydney',     city: 'Sydney',         short: 'Sydney',      dates: 'Feb 28–Mar 1', result: 'Past',     photo: '/images/boat-sydney.jpg',       photoPos: 'center 40%',   days: ['Day 1', 'Day 2'] },
  { id: 'rio',        city: 'Rio de Janeiro', short: 'Rio',         dates: 'Apr 11–12',    result: 'Past',     photo: '/images/boat-rio.jpg',          photoPos: 'center 70%',   days: ['Day 1', 'Day 2'] },
  { id: 'bermuda',    city: 'Bermuda',        short: 'Bermuda',     dates: 'May 9–10',     result: 'Active',   photo: '/images/boat-bermuda.jpg',      photoPos: 'center 50%',   days: ['Day 1', 'Day 2'] },
  { id: 'newyork',    city: 'New York',       short: 'New York',    dates: 'May 23–24',    result: 'Upcoming', photo: '/images/boat-newyork.jpg',      photoPos: 'center 70%',   days: ['Day 1', 'Day 2'] },
  { id: 'halifax',    city: 'Halifax',        short: 'Halifax',     dates: 'Jun 13–14',    result: 'Upcoming', photo: '/images/boat-halifax.jpg',      photoPos: 'center 50%',   days: ['Day 1', 'Day 2'] },
  { id: 'portsmouth', city: 'Portsmouth',     short: 'Portsmouth',  dates: 'Jul 18–19',    result: 'Upcoming', photo: '/images/boat-portsmouth.jpg',   photoPos: 'center 50%',   days: ['Day 1', 'Day 2'] },
  { id: 'sassnitz',   city: 'Sassnitz',       short: 'Sassnitz',    dates: 'Aug 8–9',      result: 'Upcoming', photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
  { id: 'valencia',   city: 'Valencia',       short: 'Valencia',    dates: 'Sep 5–6',      result: 'Upcoming', photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
  { id: 'geneva',     city: 'Geneva',         short: 'Geneva',      dates: 'Sep 26–27',    result: 'Upcoming', photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
  { id: 'dubai',      city: 'Dubai',          short: 'Dubai',       dates: 'Nov 14–15',    result: 'Upcoming', photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
  { id: 'abudhabi',   city: 'Abu Dhabi',      short: 'Grand Final', dates: 'Dec 5–6',      result: 'Upcoming', photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
];

const AGENT_BASE = 'https://adk-default-service-name-742926686826.europe-north1.run.app';
const APP_NAME = 'gingai';

async function ensureSession(userId: string, sessionId: string) {
  await fetch(`${AGENT_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

async function fetchAgentResponse(userId: string, sessionId: string, text: string): Promise<string> {
  const res = await fetch(`${AGENT_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: APP_NAME,
      userId,
      sessionId,
      newMessage: { role: 'user', parts: [{ text }] },
      streaming: false,
    }),
  });

  const reader = res.body?.getReader();
  if (!reader) return '';
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
        if (event.error) throw new Error(event.error);
        const parts = event?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text) fullText += part.text;
        }
      } catch {
        // skip non-JSON lines
      }
    }
  }
  return fullText;
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

function RegatNav() {
  const [activeRegat, setActiveRegat] = useState('bermuda');
  const [activeDay, setActiveDay] = useState(0);

  const regat = REGATTAS.find(r => r.id === activeRegat) ?? REGATTAS[0];

  return (
    <div className="regat-nav">
      <div className="regat-header">SailGP 2026 — Season 6</div>
      <div className="regat-tier1">
        {REGATTAS.map(r => (
          <button
            key={r.id}
            className={`regat-tab${activeRegat === r.id ? ' on' : ''}${r.result === 'Past' ? ' past' : ''}`}
            onClick={() => { setActiveRegat(r.id); setActiveDay(0); }}
          >
            <div className="regat-tab-city">{r.short}</div>
            <div className="regat-tab-result">{r.dates}</div>
          </button>
        ))}
      </div>
      <div className="regat-photo">
        {REGATTAS.filter(r => r.photo).map(r => (
          <img
            key={r.id}
            src={r.photo}
            alt={r.city}
            style={{
              objectPosition: r.photoPos,
              opacity: r.id === activeRegat ? 1 : 0,
              transition: 'opacity 0.25s ease',
            }}
          />
        ))}
      </div>
      <div className="regat-tier2">
        {regat.days.map((d, i) => (
          <button
            key={d}
            className={`regat-day-tab${activeDay === i ? ' on' : ''}`}
            onClick={() => setActiveDay(i)}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

const ASK_SUGGESTIONS = [
  "When did we last sail in similar conditions?",
  "What did we decide about tack timing at mark 2?",
  "What's the plan for today?",
];

type ChatEntry = { role: 'user' | 'ai'; text: string };

function AskMeBar() {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [thinking, setThinking] = useState(false);
  const sessionReady = useRef(false);
  const sessionId = useRef(`ask-session-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = 'user-1';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, thinking]);

  const submit = useCallback(async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text || thinking) return;
    setQuery('');
    setThinking(true);
    setHistory(prev => [...prev, { role: 'user', text }]);

    try {
      if (!sessionReady.current) {
        await ensureSession(userId, sessionId.current);
        sessionReady.current = true;
      }
      const answer = await fetchAgentResponse(userId, sessionId.current, text);
      setHistory(prev => [...prev, { role: 'ai', text: answer || 'No response from GingAI — please try again.' }]);
    } catch {
      setHistory(prev => [...prev, { role: 'ai', text: 'Could not reach GingAI. Check that the agent is running.' }]);
    } finally {
      setThinking(false);
    }
  }, [query, thinking]);

  const hasHistory = history.length > 0;

  return (
    <div className="ask-bar-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        Ask GingAI
      </div>

      {hasHistory && (
        <div ref={scrollRef} style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10, paddingRight: 2 }}>
          {history.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: entry.role === 'user' ? 'row-reverse' : 'row' }}>
              {entry.role === 'ai' && (
                <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--gg)', border: '1px solid var(--gb)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--green)">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                </div>
              )}
              <div style={{
                maxWidth: '85%',
                background: entry.role === 'user' ? 'var(--navy)' : 'var(--gg)',
                border: `1px solid ${entry.role === 'user' ? 'transparent' : 'var(--gb)'}`,
                borderRadius: entry.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '9px 13px',
                fontSize: 13,
                color: entry.role === 'user' ? '#fff' : 'var(--text2)',
                lineHeight: 1.65,
              }}>
                {entry.role === 'ai' ? (
                  <div className="gingai-md">
                    <ReactMarkdown>{entry.text}</ReactMarkdown>
                  </div>
                ) : entry.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--gg)', border: '1px solid var(--gb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--green)">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
              <div style={{ background: 'var(--gg)', border: '1px solid var(--gb)', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ask-bar">
        <input
          type="text"
          placeholder={hasHistory ? 'Ask a follow-up…' : 'Just ask me'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          disabled={thinking}
        />
        <button className="ask-bar-mic" title="Voice input" aria-label="Voice input">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="1" width="6" height="9" rx="3" fill="currentColor" />
            <path d="M3 8a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button className="ask-bar-send" onClick={() => submit()} aria-label="Send" disabled={thinking || !query.trim()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 12V2M3 6l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {!hasHistory && (
        <div className="ask-chips">
          {ASK_SUGGESTIONS.map(s => (
            <button key={s} className="ask-chip" onClick={() => submit(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DayBackbone() {
  const nowBlock = BLOCKS.find(b => b.status === 'now');
  const [selectedId, setSelectedId] = useState(nowBlock?.id ?? '1430');
  const [mobTab, setMobTab] = useState<'schedule' | 'now'>('schedule');

  const selected = BLOCKS.find(b => b.id === selectedId);
  const panel = selected?.panel ?? 'future';

  function handleMobSelect(id: string) {
    setSelectedId(id);
    setMobTab('now');
  }

  const blockContent = (
    <>
      {panel === '1430' && <Block1430 />}
      {panel === '1330' && <Block1330 />}
      {panel === '1818' && <Block1818 />}
      {panel === '1500' && <Block1500 />}
      {panel === '1550' && <Block1550 />}
      {(panel === 'past' || panel === 'future') && <BlockGeneric selectedId={selectedId} />}
    </>
  );

  return (
    <div className="s-backbone">
      <LeftNav />

      {/* Mobile layout */}
      <div className="mob-only mob-backbone">
        <div className="mob-bb-tabs">
          <button
            className={`mob-bb-tab${mobTab === 'schedule' ? ' on' : ''}`}
            onClick={() => setMobTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`mob-bb-tab${mobTab === 'now' ? ' on' : ''}`}
            onClick={() => setMobTab('now')}
          >
            {selected ? `${selected.time} · ${selected.name}` : 'Now'}
          </button>
        </div>

        {mobTab === 'schedule' && (
          <div className="mob-bb-tl">
            <Timeline selectedId={selectedId} onSelect={handleMobSelect} />
          </div>
        )}

        {mobTab === 'now' && (
          <div className="mob-bb-detail">
            {blockContent}
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <Timeline selectedId={selectedId} onSelect={setSelectedId} />

      <div className="main">
        <RegatNav />
        <AskMeBar />
        <div className="block-view on">
          {blockContent}
        </div>
      </div>

      <StatusRail />
    </div>
  );
}
