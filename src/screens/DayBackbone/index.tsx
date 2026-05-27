'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Timeline from '@/components/Timeline/Timeline';
import AgendaTimeline from '@/components/Timeline/AgendaTimeline';
import Block1430 from './views/Block1430';
import BlockContent from './BlockContent';
import StatusRail from './StatusRail';
import { getBlocks } from '@/data/blocks';

type AgendaItem = { time: string; title: string; tag?: string; tagColor?: string };
type RaceEntry  = { id: string; start: string; end: string; final?: boolean };

interface Regatta {
	id: string; city: string; short: string; dates: string;
	start: string; end: string; lat: number; lon: number;
	photo: string; photoPos: string; days: string[];
	raceDayIndices?: number[];
	raceSchedule?: Record<number, { broadcast: string; races: RaceEntry[] }>;
	weekAgenda?:  Record<number, AgendaItem[]>;
}

const REGATTAS: Regatta[] = [
	{ id: 'perth',       city: 'Perth',          short: 'Perth',        dates: 'Jan 17–18',     start: '2026-01-17', end: '2026-01-18', lat: -31.95,  lon: 115.86,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'auckland',    city: 'Auckland',       short: 'Auckland',     dates: 'Feb 14–15',     start: '2026-02-14', end: '2026-02-15', lat: -36.85,  lon: 174.76,  photo: '/images/boat-auckland.jpg',     photoPos: 'center 60%',    days: ['Day 1', 'Day 2'] },
	{ id: 'sydney',      city: 'Sydney',         short: 'Sydney',       dates: 'Feb 28–Mar 1',  start: '2026-02-28', end: '2026-03-01', lat: -33.87,  lon: 151.21,  photo: '/images/boat-sydney.jpg',       photoPos: 'center 40%',    days: ['Day 1', 'Day 2'] },
	{ id: 'rio',         city: 'Rio de Janeiro', short: 'Rio',          dates: 'Apr 11–12',     start: '2026-04-11', end: '2026-04-12', lat: -22.91,  lon: -43.17,  photo: '/images/boat-rio.jpg',          photoPos: 'center 70%',    days: ['Day 1', 'Day 2'] },
	{ id: 'bermuda',     city: 'Bermuda',        short: 'Bermuda',      dates: 'May 10–11',     start: '2026-05-10', end: '2026-05-11', lat:  32.30,  lon: -64.78,  photo: '/images/boat-bermuda.jpg',      photoPos: 'center 50%',    days: ['Day 1', 'Day 2'] },
	{
		id: 'newyork', city: 'New York', short: 'New York', dates: 'May 28–Jun 1',
		start: '2026-05-28', end: '2026-06-01',
		lat: 40.65, lon: -74.02, photo: '/images/boat-newyork.jpg', photoPos: 'center 70%',
		days: ['Thu · 28', 'Fri · 29', 'Sat · 30', 'Sun · 31', 'Mon · 1'],
		raceDayIndices: [2, 3],
		raceSchedule: {
			2: {
				broadcast: '15:30–17:00',
				races: [
					{ id: 'R1', start: '15:39', end: '15:51' },
					{ id: 'R2', start: '15:58', end: '16:10' },
					{ id: 'R3', start: '16:18', end: '16:30' },
					{ id: 'R4', start: '16:40', end: '16:52' },
				],
			},
			3: {
				broadcast: '15:30–17:00',
				races: [
					{ id: 'R5', start: '15:38', end: '15:50' },
					{ id: 'R6', start: '15:58', end: '16:10' },
					{ id: 'R7', start: '16:18', end: '16:30' },
					{ id: 'Final', start: '16:39', end: '16:50', final: true },
				],
			},
		},
		weekAgenda: {
			0: [
				{ time: '—',     title: 'Hotel: NU Hotel Brooklyn\n85 Smith St, Brooklyn NY 11201', tag: 'Hotel', tagColor: 'var(--text3)' },
				{ time: '—',     title: 'Tech site: 210 Clinton Wharf, Brooklyn NY 11231',          tag: 'Venue', tagColor: 'var(--yellow)' },
				{ time: '14:30', title: 'Simulator session 1',                                      tag: 'Sim',   tagColor: 'var(--text3)' },
				{ time: '15:00', title: 'Simulator session 2',                                      tag: 'Sim',   tagColor: 'var(--text3)' },
				{ time: '16:00', title: 'SailGP team meeting — Hilton Hotel',                       tag: 'Team',  tagColor: 'var(--text3)' },
				{ time: '20:00', title: 'Team dinner — Hilton Hotel',                               tag: 'Team',  tagColor: 'var(--text3)' },
			],
			1: [
				{ time: '08:30', title: 'Simulator session 1',               tag: 'Sim',    tagColor: 'var(--text3)' },
				{ time: '09:00', title: 'Morning team meeting — NYC brief',  tag: 'Team',   tagColor: 'var(--text3)' },
				{ time: '10:30', title: 'Sim & strategy session',            tag: 'Learn',  tagColor: 'var(--text3)' },
				{ time: '15:00', title: 'Venue walk & media obligations',    tag: 'Media',  tagColor: 'var(--text4)' },
				{ time: '17:30', title: 'Simulator session 2',               tag: 'Sim',    tagColor: 'var(--text3)' },
			],
			4: [
				{ time: '09:00', title: 'Full weekend debrief',                                  tag: 'Debrief',  tagColor: 'var(--text3)' },
				{ time: '11:00', title: 'Data & video review',                                   tag: 'Learn',    tagColor: 'var(--text3)' },
				{ time: '15:00', title: 'Travel home',                                           tag: 'Travel',   tagColor: 'var(--text4)' },
			],
		},
	},
	{ id: 'halifax',     city: 'Halifax',        short: 'Halifax',      dates: 'Jun 20–21',     start: '2026-06-20', end: '2026-06-21', lat:  44.65,  lon: -63.58,  photo: '/images/boat-halifax.jpg',      photoPos: 'center 50%',    days: ['Day 1', 'Day 2'] },
	{ id: 'portsmouth',  city: 'Portsmouth',     short: 'Portsmouth',   dates: 'Jul 25–26',     start: '2026-07-25', end: '2026-07-26', lat:  50.80,  lon:  -1.08,  photo: '/images/boat-portsmouth.jpg',   photoPos: 'center 50%',    days: ['Day 1', 'Day 2'] },
	{ id: 'sassnitz',    city: 'Sassnitz',       short: 'Sassnitz',     dates: 'Aug 22–23',     start: '2026-08-22', end: '2026-08-23', lat:  54.52,  lon:  13.64,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'valencia',    city: 'Valencia',       short: 'Valencia',     dates: 'Sep 5–6',       start: '2026-09-05', end: '2026-09-06', lat:  39.47,  lon:  -0.38,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'geneva',      city: 'Geneva',         short: 'Geneva',       dates: 'Sep 19–20',     start: '2026-09-19', end: '2026-09-20', lat:  46.20,  lon:   6.14,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'dubai',       city: 'Dubai',          short: 'Dubai',        dates: 'Nov 21–22',     start: '2026-11-21', end: '2026-11-22', lat:  25.08,  lon:  55.13,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
	{ id: 'abudhabi',    city: 'Abu Dhabi',      short: 'Grand Final',  dates: 'Nov 28–29',     start: '2026-11-28', end: '2026-11-29', lat:  24.47,  lon:  54.37,  photo: '',                              photoPos: 'center center', days: ['Day 1', 'Day 2'] },
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

function RegatNav({ activeRegat, setActiveRegat, activeDay, setActiveDay }: {
	activeRegat: string; setActiveRegat: (id: string) => void;
	activeDay: number;   setActiveDay:   (i: number)  => void;
}) {
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
		{regat.days.map((d, i) => {
			const isRace = regat.raceDayIndices?.includes(i);
			return (
				<button
				key={d}
				className={`regat-day-tab${activeDay === i ? ' on' : ''}${isRace ? ' race-day' : ''}`}
				onClick={() => setActiveDay(i)}
				>
				{isRace && <span className="rd-dot" />}
				{d}
				</button>
			);
		})}
		</div>
		</div>
	);
}

/* ─── Agenda view for non-race days ─────────────────────────── */
const LOCATION_CARDS: Record<string, { type: string; name: string; address: string; mapsUrl: string }> = {
	'Hotel': {
		type: 'Hotel',
		name: 'NU Hotel Brooklyn',
		address: '85 Smith St, Brooklyn NY 11201',
		mapsUrl: 'https://maps.google.com/?q=NU+Hotel+Brooklyn+85+Smith+St+Brooklyn+NY',
	},
	'Venue': {
		type: 'Tech Site',
		name: 'Clinton Wharf — Tech Base',
		address: '210 Clinton Wharf, Brooklyn NY 11231',
		mapsUrl: 'https://maps.app.goo.gl/mNCCdT1XGTAGJhKcA',
	},
};

function LocationCard({ loc }: { loc: typeof LOCATION_CARDS[string] }) {
	const isHotel = loc.type === 'Hotel';
	return (
		<a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="loc-card">
			<div className="loc-card-icon">
				{isHotel ? (
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
				) : (
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
						<path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
						<circle cx="12" cy="10" r="3"/>
					</svg>
				)}
			</div>
			<div className="loc-card-body">
				<div className="loc-card-type">{loc.type}</div>
				<div className="loc-card-name">{loc.name}</div>
				<div className="loc-card-address">{loc.address}</div>
			</div>
			<div className="loc-card-arrow">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
					<polyline points="15 3 21 3 21 9"/>
					<line x1="10" y1="14" x2="21" y2="3"/>
				</svg>
			</div>
		</a>
	);
}

function AgendaDayView({ items, dayLabel, showLocations }: { items: AgendaItem[]; dayLabel: string; showLocations?: boolean }) {
	const regularItems = items.filter(i => i.tag !== 'Hotel' && i.tag !== 'Venue');
	return (
		<div className="agenda-day-wrap">
			<div className="agenda-day-header">
				<div className="agenda-day-title">{dayLabel}</div>
				<div className="agenda-day-sub">Day agenda · indicative schedule</div>
			</div>

			{/* Location cards — Thu explicitly, Fri/others via showLocations prop */}
			{(items.some(i => i.tag === 'Hotel' || i.tag === 'Venue') || showLocations) && (
				<div className="loc-cards-row">
					<LocationCard loc={LOCATION_CARDS['Hotel']} />
					<LocationCard loc={LOCATION_CARDS['Venue']} />
				</div>
			)}

			<div className="agenda-day-list">
				{regularItems.map((item, i) => (
					<div key={i} className="agenda-day-row">
						<div className="agenda-day-time">{item.time}</div>
						<div className="agenda-day-body">
							<div className="agenda-day-name">{item.title}</div>
							{item.tag && (
								<span className="agenda-day-tag" style={{ color: item.tagColor || 'var(--text4)' }}>
									{item.tag}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/* ─── Race schedule card shown on race days ─────────────────── */
function RaceScheduleCard({ races, broadcast, dayLabel }: {
	races: RaceEntry[];
	broadcast: string;
	dayLabel: string;
}) {
	return (
		<div className="race-sched-card">
			<div className="race-sched-header">
				<div>
					<div className="race-sched-title">{dayLabel} · Race Schedule</div>
					<div className="race-sched-sub">Broadcast {broadcast} · Times indicative</div>
				</div>
			</div>
			<div className="race-sched-list">
				{races.map((r) => (
					<div key={r.id} className={`race-sched-row${r.final ? ' final' : ''}`}>
						<div className="rs-id">{r.id}</div>
						<div className="rs-bar">
							<div className="rs-bar-fill" style={{ width: `${Math.round(((parseInt(r.end.replace(':','')) - parseInt(r.start.replace(':',''))) / 100) * 6)}%` }} />
						</div>
						<div className="rs-times">{r.start} — {r.end}</div>
					</div>
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

function blockContentForPanel(panel: string, selectedId: string, blocks?: import('@/types').Block[]) {
	if (panel === '1430') return <Block1430 data={null} />;
	return <BlockContent panel={panel} selectedId={selectedId} blocks={blocks} />;
}

export default function DayBackbone() {
	const [activeRegat, setActiveRegat] = useState(getDefaultRegat);
	const [activeDay, setActiveDay]     = useState(0);
	const activeVenue = REGATTAS.find(r => r.id === activeRegat) ?? REGATTAS[5];

	// Blocks depend on which regatta + day is selected
	const blocks = getBlocks(new Date(), activeRegat, activeDay);
	const nowBlock = blocks.find(b => b.status === 'now');
	const [selectedId, setSelectedId] = useState(nowBlock?.id ?? blocks[0]?.id ?? '1430');
	const userSelectedRef = useRef(false);

	// Derived: is the selected day a non-race agenda day?
	const isAgendaDay = !!(
		activeVenue.weekAgenda?.[activeDay] &&
		!activeVenue.raceDayIndices?.includes(activeDay)
	);
	const agendaItems  = activeVenue.weekAgenda?.[activeDay];
	const raceSchedule = activeVenue.raceSchedule?.[activeDay];

	// Reset selection when regatta or day changes
	useEffect(() => {
		userSelectedRef.current = false;
		const freshBlocks = getBlocks(new Date(), activeRegat, activeDay);
		const live = freshBlocks.find(b => b.status === 'now');
		setSelectedId(live?.id ?? freshBlocks[0]?.id ?? '1430');
	}, [activeRegat, activeDay]);

	// Follow the live "now" block automatically unless the user has manually selected one
	useEffect(() => {
		const interval = setInterval(() => {
			if (userSelectedRef.current) return;
			const live = getBlocks(new Date(), activeRegat, activeDay).find(b => b.status === 'now');
			if (live) setSelectedId(live.id);
		}, 30_000);
		return () => clearInterval(interval);
	}, [activeRegat, activeDay]);

	function handleSelect(id: string) {
		userSelectedRef.current = true;
		setSelectedId(id);
	}

	const selected = blocks.find(b => b.id === selectedId);
	const panel = selected?.panel ?? 'future';
	const blockContent = blockContentForPanel(panel, selectedId, blocks);

	function renderMobExpanded(blockId: string) {
		const b = blocks.find(bl => bl.id === blockId);
		if (!b) return null;
		return blockContentForPanel(b.panel, blockId, blocks);
	}

	return (
		<div className="s-backbone">

	{/* Mobile layout */}
	<div className="mob-only mob-backbone">
	<RegatNav activeRegat={activeRegat} setActiveRegat={setActiveRegat} activeDay={activeDay} setActiveDay={setActiveDay} />
	<div style={{ padding: '0 0 4px' }}>
		<AskMeBar />
	</div>
	{isAgendaDay && agendaItems ? (
		<div style={{ padding: '12px 16px' }}>
			<AgendaDayView items={agendaItems} dayLabel={activeVenue.days[activeDay]} showLocations={activeDay === 1} />
		</div>
	) : (
		<div className="mob-bb-tl">
			<Timeline selectedId={selectedId} onSelect={handleSelect} renderExpanded={renderMobExpanded} blocks={blocks} />
		</div>
	)}
	</div>

	{/* Desktop layout */}
	<div className="desk-only" style={{ display: 'contents' }}>
	{isAgendaDay && agendaItems ? (
		<AgendaTimeline
			items={agendaItems}
			dayLabel={activeVenue.days[activeDay]}
			venueCity={activeVenue.city}
			venueLat={activeVenue.lat}
			venueLon={activeVenue.lon}
		/>
	) : (
		<Timeline selectedId={selectedId} onSelect={handleSelect} venueLat={activeVenue.lat} venueLon={activeVenue.lon} venueCity={activeVenue.city} blocks={blocks} />
	)}
	<div className="main">
	<RegatNav activeRegat={activeRegat} setActiveRegat={setActiveRegat} activeDay={activeDay} setActiveDay={setActiveDay} />
		<div className="block-view on">
		{isAgendaDay && agendaItems ? (
			<AgendaDayView items={agendaItems} dayLabel={activeVenue.days[activeDay]} showLocations={activeDay === 1} />
		) : blockContent}
		</div>
		<AskMeBar />
		</div>
		</div>

		<StatusRail regatId={activeRegat} dayIndex={activeDay} />
		</div>
	);
}
