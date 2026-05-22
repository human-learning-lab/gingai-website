'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Timeline from '@/components/Timeline/Timeline';
import Block1430 from './views/Block1430';
import Block1330 from './views/Block1330';
import Block1818 from './views/Block1818';
import Block1500 from './views/Block1500';
import Block1550 from './views/Block1550';
import BlockGeneric from './views/BlockGeneric';
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
					padding: '9px 13px', fontSize: 13,
					color: entry.role === 'user' ? '#fff' : 'var(--text2)',
					lineHeight: 1.65,
				}}>
				{entry.role === 'ai' ? (
					<div className="gingai-md"><ReactMarkdown>{entry.text}</ReactMarkdown></div>
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
		<div className="ask-bar-logo">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
				<path d="M7 1L8.2 5.8L13 7L8.2 8.2L7 13L5.8 8.2L1 7L5.8 5.8L7 1Z" fill="var(--green)" opacity="0.85"/>
			</svg>
		</div>
		<input
		type="text"
		placeholder={hasHistory ? 'Ask a follow-up…' : 'Ask anything…'}
		value={query}
		onChange={e => setQuery(e.target.value)}
		onKeyDown={e => { if (e.key === 'Enter') submit(); }}
		disabled={thinking}
		/>
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
		</div>

		</div>
	);
}

function blockContentForPanel(panel: string, selectedId: string) {
	return (
		<>
		{panel === '1430' && <Block1430 data={null} />}
		{panel === '1330' && <Block1330 data={null} />}
		{panel === '1818' && <Block1818 data={null} />}
		{panel === '1500' && <Block1500 data={null} />}
		{panel === '1550' && <Block1550 data={null} />}
		{(panel === 'past' || panel === 'future') && <BlockGeneric selectedId={selectedId} />}
		</>
	);
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
