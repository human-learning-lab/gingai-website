'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Timeline from '@/components/Timeline/Timeline';
import Block1430 from './views/Block1430';
import BlockContent from './BlockContent';
import StatusRail from './StatusRail';
import { getBlocks } from '@/data/blocks';

const REGATTAS = [
	{ id: 'perth',      city: 'Perth',          short: 'Perth',       dates: 'Jan 17–18',    start: '2026-01-17', end: '2026-01-18', lat: -31.95,  lon: 115.86,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'auckland',   city: 'Auckland',       short: 'Auckland',    dates: 'Feb 14–15',    start: '2026-02-14', end: '2026-02-15', lat: -36.85,  lon: 174.76,  photo: '/images/boat-auckland.jpg',     photoPos: 'center 60%',   days: ['Day 1', 'Day 2'] },
	{ id: 'sydney',     city: 'Sydney',         short: 'Sydney',      dates: 'Feb 28–Mar 1', start: '2026-02-28', end: '2026-03-01', lat: -33.87,  lon: 151.21,  photo: '/images/boat-sydney.jpg',       photoPos: 'center 40%',   days: ['Day 1', 'Day 2'] },
	{ id: 'rio',        city: 'Rio de Janeiro', short: 'Rio',         dates: 'Apr 11–12',    start: '2026-04-11', end: '2026-04-12', lat: -22.91,  lon: -43.17,  photo: '/images/boat-rio.jpg',          photoPos: 'center 70%',   days: ['Day 1', 'Day 2'] },
	{ id: 'bermuda',    city: 'Bermuda',        short: 'Bermuda',     dates: 'May 9–10',     start: '2026-05-09', end: '2026-05-10', lat:  32.30,  lon: -64.78,  photo: '/images/boat-bermuda.jpg',      photoPos: 'center 50%',   days: ['Day 1', 'Day 2'] },
	{ id: 'newyork',    city: 'New York',       short: 'New York',    dates: 'May 23–24',    start: '2026-05-23', end: '2026-05-24', lat:  40.65,  lon: -74.02,  photo: '/images/boat-newyork.jpg',      photoPos: 'center 70%',   days: ['Day 1', 'Day 2'] },
	{ id: 'halifax',    city: 'Halifax',        short: 'Halifax',     dates: 'Jun 13–14',    start: '2026-06-13', end: '2026-06-14', lat:  44.65,  lon: -63.58,  photo: '/images/boat-halifax.jpg',      photoPos: 'center 50%',   days: ['Day 1', 'Day 2'] },
	{ id: 'portsmouth', city: 'Portsmouth',     short: 'Portsmouth',  dates: 'Jul 18–19',    start: '2026-07-18', end: '2026-07-19', lat:  50.80,  lon:  -1.08,  photo: '/images/boat-portsmouth.jpg',   photoPos: 'center 50%',   days: ['Day 1', 'Day 2'] },
	{ id: 'sassnitz',   city: 'Sassnitz',       short: 'Sassnitz',    dates: 'Aug 8–9',      start: '2026-08-08', end: '2026-08-09', lat:  54.52,  lon:  13.64,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'valencia',   city: 'Valencia',       short: 'Valencia',    dates: 'Sep 5–6',      start: '2026-09-05', end: '2026-09-06', lat:  39.47,  lon:  -0.38,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'geneva',     city: 'Geneva',         short: 'Geneva',      dates: 'Sep 26–27',    start: '2026-09-26', end: '2026-09-27', lat:  46.20,  lon:   6.14,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'dubai',      city: 'Dubai',          short: 'Dubai',       dates: 'Nov 14–15',    start: '2026-11-14', end: '2026-11-15', lat:  25.08,  lon:  55.13,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'abudhabi',   city: 'Abu Dhabi',      short: 'Grand Final', dates: 'Dec 5–6',      start: '2026-12-05', end: '2026-12-06', lat:  24.47,  lon:  54.37,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
];

function getRegatResult(start: string, end: string): 'Past' | 'Active' | 'Upcoming' {
	const today = new Date(); today.setHours(0, 0, 0, 0);
	const s = new Date(start); const e = new Date(end); e.setHours(23, 59, 59, 999);
	if (today > e) return 'Past';
	if (today >= s) return 'Active';
	return 'Upcoming';
}

function getDefaultRegat(): string {
	const active = REGATTAS.find(r => getRegatResult(r.start, r.end) === 'Active');
	if (active) return active.id;
	const next = REGATTAS.find(r => getRegatResult(r.start, r.end) === 'Upcoming');
	return next?.id ?? REGATTAS[REGATTAS.length - 1].id;
}

const AGENT_BASE = "/api/agent"
const APP_NAME = 'gingai';

async function ensureSession(userId: string, sessionId: string) {
	await fetch(`${AGENT_BASE}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({}),
	});
}

async function* streamAgentResponse(userId: string, sessionId: string, text: string): AsyncGenerator<string> {
	const res = await fetch(`${AGENT_BASE}/run_sse`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
		body: JSON.stringify({
			appName: APP_NAME,
			userId,
			sessionId,
			newMessage: { role: 'user', parts: [{ text }] },
			streaming: true,
		}),
	});

	const reader = res.body?.getReader();
	if (!reader) return;
	const decoder = new TextDecoder();
	let buffer = '';

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
					if (typeof part.text === 'string' && part.text) yield part.text;
				}
			} catch {
				// skip non-JSON lines
			}
		}
	}
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

function RegatNav({ activeRegat, setActiveRegat }: { activeRegat: string; setActiveRegat: (id: string) => void }) {
	const [activeDay, setActiveDay] = useState(0);
	const tier1Ref = useRef<HTMLDivElement>(null);

	const regat = REGATTAS.find(r => r.id === activeRegat) ?? REGATTAS[0];
	const result = getRegatResult(regat.start, regat.end);

	useEffect(() => {
		const container = tier1Ref.current;
		if (!container) return;
		const activeBtn = container.querySelector<HTMLElement>('.regat-tab.on');
		if (!activeBtn) return;
		const containerRect = container.getBoundingClientRect();
		const btnRect = activeBtn.getBoundingClientRect();
		const scrollLeft = container.scrollLeft + btnRect.left - containerRect.left - (containerRect.width / 2) + (btnRect.width / 2);
		container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
	}, [activeRegat]);

	return (
		<div className="regat-nav">
		<div className="regat-header">
			SailGP 2026 — Season 6
			{result === 'Active' && (
				<span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--green)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>● Live</span>
			)}
			{result === 'Upcoming' && (
				<span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--yellow)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Next up</span>
			)}
		</div>
		<div className="regat-tier1" ref={tier1Ref}>
		{REGATTAS.map(r => {
			const res = getRegatResult(r.start, r.end);
			return (
				<button
				key={r.id}
				className={`regat-tab${activeRegat === r.id ? ' on' : ''}${res === 'Past' ? ' past' : ''}`}
				onClick={() => { setActiveRegat(r.id); setActiveDay(0); }}
				>
				<div className="regat-tab-city">{r.short}</div>
				<div className="regat-tab-result">{r.dates}</div>
				</button>
			);
		})}
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
	const [answer, setAnswer] = useState('');
	const [thinking, setThinking] = useState(false);
	const sessionReady = useRef(false);
	const sessionId = useRef(`ask-session-${Date.now()}`);
	const userId = 'user-1';

	const submit = useCallback(async (q?: string) => {
		const text = (q ?? query).trim();
		if (!text || thinking) return;
		if (q) setQuery(q);
		setThinking(true);
		setAnswer('');

		try {
			if (!sessionReady.current) {
				await ensureSession(userId, sessionId.current);
				sessionReady.current = true;
			}

			let accumulated = '';
			for await (const chunk of streamAgentResponse(userId, sessionId.current, text)) {
				accumulated += chunk;
				setAnswer(accumulated);
			}
			if (!accumulated) setAnswer('No response from GingAI — please try again.');
		} catch {
			setAnswer('Could not reach GingAI. Check that the agent is running.');
		} finally {
			setThinking(false);
		}
	}, [query, thinking]);

	function handleKey(e: React.KeyboardEvent) {
		if (e.key === 'Enter') submit();
	}

	return (
		<div className="ask-bar-wrap">
		<div className="ask-bar">
		<div className="ask-bar-logo">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
				<path d="M7 1L8.2 5.8L13 7L8.2 8.2L7 13L5.8 8.2L1 7L5.8 5.8L7 1Z" fill="var(--green)" opacity="0.85"/>
			</svg>
		</div>
		<input
		type="text"
		placeholder="Ask anything…"
		value={query}
		onChange={e => setQuery(e.target.value)}
		onKeyDown={handleKey}
		disabled={thinking}
		/>
		{thinking ? (
			<div style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '0 14px' }}>
			{[0, 1, 2].map(i => (
				<span key={i} style={{
					width: 4, height: 4, borderRadius: '50%', background: 'var(--green)',
					display: 'inline-block',
					animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
				}} />
			))}
			</div>
		) : (
			<button
				className="ask-bar-send"
				onClick={() => submit()}
				aria-label="Send"
				style={{ color: query.trim() ? 'var(--green)' : 'var(--line2)' }}
			>
			<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
			<path d="M6.5 11V2M3 5.5l3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			</button>
		)}
		</div>
		{answer && (
			<div className="ask-response">
			<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
				GingAI
			</div>
			<div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
				{answer}
			</div>
			</div>
		)}
		</div>
	);
}

function blockContentForPanel(panel: string, selectedId: string) {
	if (panel === '1430') return <Block1430 data={null} />;
	return <BlockContent panel={panel} selectedId={selectedId} />;
}

export default function DayBackbone() {
	const blocks = getBlocks();
	const nowBlock = blocks.find(b => b.status === 'now');
	const [selectedId, setSelectedId] = useState(nowBlock?.id ?? blocks[0]?.id ?? '1430');
	const userSelectedRef = useRef(false);
	const [activeRegat, setActiveRegat] = useState(getDefaultRegat);
	const activeVenue = REGATTAS.find(r => r.id === activeRegat) ?? REGATTAS[5];

	// Follow the live "now" block automatically unless the user has manually selected one
	useEffect(() => {
		if (userSelectedRef.current) return;
		const interval = setInterval(() => {
			const live = getBlocks().find(b => b.status === 'now');
			if (live) setSelectedId(live.id);
		}, 30_000);
		return () => clearInterval(interval);
	}, []);

	// Also sync immediately whenever blocks change (e.g. on mount after hydration)
	useEffect(() => {
		if (userSelectedRef.current) return;
		const live = getBlocks().find(b => b.status === 'now');
		if (live) setSelectedId(live.id);
	}, []);

	function handleSelect(id: string) {
		userSelectedRef.current = true;
		setSelectedId(id);
	}

	const selected = blocks.find(b => b.id === selectedId);
	const panel = selected?.panel ?? 'future';
	const blockContent = blockContentForPanel(panel, selectedId);

	function renderMobExpanded(blockId: string) {
		const b = blocks.find(bl => bl.id === blockId);
		if (!b) return null;
		return blockContentForPanel(b.panel, blockId);
	}

	return (
		<div className="s-backbone">

	{/* Mobile layout — inline expansion, no tabs */}
	<div className="mob-only mob-backbone">
	<RegatNav activeRegat={activeRegat} setActiveRegat={setActiveRegat} />
	<div style={{ padding: '0 0 4px' }}>
		<AskMeBar />
	</div>
	<div className="mob-bb-tl">
		<Timeline selectedId={selectedId} onSelect={handleSelect} renderExpanded={renderMobExpanded} />
	</div>
	</div>

	{/* Desktop layout */}
	<div className="desk-only" style={{ display: 'contents' }}>
	<Timeline selectedId={selectedId} onSelect={handleSelect} venueLat={activeVenue.lat} venueLon={activeVenue.lon} venueCity={activeVenue.city} />
	<div className="main">
	<RegatNav activeRegat={activeRegat} setActiveRegat={setActiveRegat} />
		<div className="block-view on">
		{blockContent}
		</div>
		<AskMeBar />
		</div>
		</div>

		<StatusRail />
		</div>
	);
}
