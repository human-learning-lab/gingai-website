import { useState } from 'react';
import LeftNav from '../../components/LeftNav/LeftNav';
import Timeline from '../../components/Timeline/Timeline';
import Block1430 from './views/Block1430';
import Block1330 from './views/Block1330';
import Block1818 from './views/Block1818';
import BlockGeneric from './views/BlockGeneric';
import StatusRail from './StatusRail';
import type { ScreenId } from '../../types';
import { BLOCKS } from '../../data/blocks';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
}

/* ── 2026 SailGP Season Calendar ── */
const REGATTAS = [
  { id: 'rio',       city: 'Rio de Janeiro', short: 'Rio',       result: 'Upcoming',  days: ['Day 1', 'Day 2', 'Day 3'] },
  { id: 'bermuda',   city: 'Bermuda',        short: 'Bermuda',   result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'newyork',   city: 'New York',       short: 'New York',  result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'halifax',   city: 'Halifax',        short: 'Halifax',   result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'portsmouth',city: 'Portsmouth',     short: 'Portsmouth',result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'sassnitz',  city: 'Sassnitz',       short: 'Sassnitz',  result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'tropez',    city: 'Saint-Tropez',   short: 'St-Tropez', result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'dubai',     city: 'Dubai',          short: 'Dubai',     result: 'Upcoming',  days: ['Day 1', 'Day 2'] },
  { id: 'abudhabi',  city: 'Abu Dhabi',      short: 'Grand Final',result: 'Upcoming', days: ['Day 1', 'Day 2'] },
];

const CANNED_RESPONSES: Record<string, { answer: string; source: string }> = {
  default: {
    answer: 'Based on team records from Bermuda and Auckland, the most common issue flagged in post-race captures was tack decision ownership — specifically who calls in marginal upwind conditions. This came up 4 times across the last 6 regattas.',
    source: 'Sources: Bermuda Debrief D2, Auckland R3 capture, Saint-Tropez R7 — Season 5',
  },
  rudder: {
    answer: 'Last confirmed rudder angle discussion: Rasmus and Horacio discussed 3.2° vs 3.5° exit angle on tacks with LAB2s during the Auckland simulator session, Day 2. Decision leaned 3.2° for light air. No formal protocol update recorded yet.',
    source: 'Source: Auckland Sim Brief · Day 2 · Season 5',
  },
  plan: {
    answer: 'Today is Race Day 1, Rio de Janeiro. Key milestones: Brief the Day (now, 14:30), Warm Up at 15:00, Dock Off at 16:20. Race 1 (R5) starts at 17:38 (T–0). Equipment predicted: 27.5m wing, LAB2 daggerboards. Course 2 pending RC confirmation.',
    source: 'Source: Rio 2026 · Day 1 schedule',
  },
};

function getResponse(q: string): { answer: string; source: string } {
  const lower = q.toLowerCase();
  if (lower.includes('rudder') || lower.includes('angle') || lower.includes('horacio')) return CANNED_RESPONSES.rudder;
  if (lower.includes('plan') || lower.includes('today') || lower.includes('schedule')) return CANNED_RESPONSES.plan;
  return CANNED_RESPONSES.default;
}

function RegatNav() {
  const [activeRegat, setActiveRegat] = useState('rio');
  const [activeDay, setActiveDay] = useState(0);

  const regat = REGATTAS.find(r => r.id === activeRegat) ?? REGATTAS[0];

  return (
    <div className="regat-nav">
      <div className="regat-header">SailGP 2026 — Season 6</div>
      <div className="regat-tier1">
        {REGATTAS.map(r => (
          <button
            key={r.id}
            className={`regat-tab${activeRegat === r.id ? ' on' : ''}`}
            onClick={() => { setActiveRegat(r.id); setActiveDay(0); }}
          >
            <div className="regat-tab-city">{r.short}</div>
            <div className="regat-tab-result">{r.result}</div>
          </button>
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

function AskMeBar() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<{ answer: string; source: string } | null>(null);
  const [thinking, setThinking] = useState(false);

  function submit() {
    if (!query.trim()) return;
    setThinking(true);
    setResponse(null);
    setTimeout(() => {
      setResponse(getResponse(query));
      setThinking(false);
    }, 900);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div className="ask-bar-wrap">
      <div className="ask-bar">
        <input
          type="text"
          placeholder="Just ask me"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="ask-bar-mic" title="Voice input" aria-label="Voice input">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="1" width="6" height="9" rx="3" fill="currentColor" />
            <path d="M3 8a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button className="ask-bar-send" onClick={submit} aria-label="Send">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 12V2M3 6l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {thinking && (
        <div className="ask-response" style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
          Searching team memory…
        </div>
      )}
      {response && (
        <div className="ask-response">
          {response.answer}
          <div className="ask-response-src">{response.source}</div>
        </div>
      )}
    </div>
  );
}

export default function DayBackbone({ activeScreen, onNavigate }: Props) {
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
      {(panel === 'past' || panel === 'future') && <BlockGeneric selectedId={selectedId} />}
    </>
  );

  return (
    <div className="s-backbone">
      <LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

      {/* ── Mobile layout ── */}
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

      {/* ── Desktop layout ── */}
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
