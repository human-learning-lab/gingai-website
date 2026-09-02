'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import Timeline from '@/components/Timeline/Timeline';
import AgendaTimeline from '@/components/Timeline/AgendaTimeline';
import Block1430 from './views/Block1430';
import BlockContent from './BlockContent';
import LiveMode from './LiveMode';
import ScheduleEditor from './ScheduleEditor';
import { MobConditionsBar } from '@/components/Timeline/ConditionsPanel';
import { getBlocks } from '@/data/blocks';
import { useRole } from '@/context/RoleContext';
import { loadSchedule, saveSchedule, seedFromBlocks, seedFromAgenda } from '@/lib/scheduleApi';
import type { ScheduleEvent } from '@/types/schedule';
import { REGATTAS, getRegatResult, getDefaultRegat, getDefaultDay, type RaceEntry } from '@/data/regattas';

const AGENT_BASE = "/api/agent"
const APP_NAME = 'assistant';

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
				onClick={() => setActiveRegat(r.id)}
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
function LocationCard({ ev }: { ev: ScheduleEvent }) {
	const isHotel = ev.tag === 'Hotel';
	const inner = (
		<>
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
				<div className="loc-card-type">{isHotel ? 'Hotel' : 'Tech Site'}</div>
				<div className="loc-card-name">{ev.label || (isHotel ? 'Hotel' : 'Venue')}</div>
				{ev.notes && <div className="loc-card-address">{ev.notes}</div>}
			</div>
			{ev.mapsUrl && (
				<div className="loc-card-arrow">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
						<polyline points="15 3 21 3 21 9"/>
						<line x1="10" y1="14" x2="21" y2="3"/>
					</svg>
				</div>
			)}
		</>
	);
	if (ev.mapsUrl) {
		return <a href={ev.mapsUrl} target="_blank" rel="noopener noreferrer" className="loc-card">{inner}</a>;
	}
	return <div className="loc-card" style={{ cursor: 'default' }}>{inner}</div>;
}

function DriveViewer({ url, title }: { url: string; title: string }) {
	return (
		<iframe
			src={driveEmbedUrl(url)}
			style={{ flex: 1, border: 'none', display: 'block', width: '100%', height: '100%' }}
			allow="autoplay"
			title={title}
		/>
	);
}

function driveFileType(url: string): string {
	if (/docs\.google\.com\/document/.test(url)) return 'Doc';
	if (/docs\.google\.com\/spreadsheets/.test(url)) return 'Sheet';
	if (/docs\.google\.com\/presentation/.test(url)) return 'Slides';
	if (/docs\.google\.com\/forms/.test(url)) return 'Form';
	// Try to detect extension from filename in URL
	const ext = url.match(/\.([a-z]{2,5})(?:[?#]|$)/i)?.[1]?.toLowerCase();
	if (ext === 'pdf') return 'PDF';
	if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'Sheet';
	if (ext === 'docx' || ext === 'doc') return 'Doc';
	if (ext === 'pptx' || ext === 'ppt') return 'Slides';
	return 'File';
}

function driveEmbedUrl(url: string): string {
	// Google Docs / Sheets / Slides — replace /edit or /view with /preview
	if (/docs\.google\.com\/(document|spreadsheets|presentation|forms)/.test(url)) {
		return url.replace(/\/(edit|view|htmlview)(\?.*)?$/, '/preview');
	}
	// drive.google.com/file/d/ID/...
	const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
		?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
	if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
	return url;
}

function AgendaDayView({ items, dayLabel, onOpenDrive }: { items: ScheduleEvent[]; dayLabel: string; onOpenDrive: (url: string, title: string) => void }) {
	const locationItems = items.filter(i => i.tag === 'Hotel' || i.tag === 'Venue');
	const regularItems = items.filter(i => i.tag !== 'Hotel' && i.tag !== 'Venue');
	return (
		<div className="agenda-day-wrap">
			<div className="agenda-day-header">
				<div className="agenda-day-title">{dayLabel}</div>
				<div className="agenda-day-sub">Day agenda · indicative schedule</div>
			</div>

			{locationItems.length > 0 && (
				<div className="loc-cards-row">
					{locationItems.map((ev, i) => <LocationCard key={i} ev={ev} />)}
				</div>
			)}

		<div className="agenda-day-list">
			{regularItems.map((item, i) => (
				<div key={i}>
					<div className="agenda-day-row">
						<div className="agenda-day-time">{item.time}</div>
						<div className="agenda-day-body">
							<div className="agenda-day-name">{item.label}</div>
							{item.tag && (
								<span className="agenda-day-tag" style={{ color: item.tagColor || 'var(--text4)' }}>
									{item.tag}
								</span>
							)}
							<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
							{item.driveUrl && (
								<button
									onClick={() => onOpenDrive(item.driveUrl!, item.label)}
									style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--green)', background: 'var(--gg)', borderRadius: 3, padding: '2px 6px', border: '1px solid var(--gb)', cursor: 'pointer' }}
								>
								<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
								{driveFileType(item.driveUrl!)}
							</button>
							)}
							{item.mapsUrl && (
								<a href={item.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
									style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", color: '#ea4335', background: 'rgba(234,67,53,0.08)', borderRadius: 3, padding: '2px 6px', border: '1px solid rgba(234,67,53,0.25)', textDecoration: 'none' }}
								>
									<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
									Maps
								</a>
							)}
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
		</div>
	);
}

/* ─── Desktop agenda main panel ──────────────────────────────── */
function AgendaMainPanel({ items, selectedEvent }: { items: ScheduleEvent[]; selectedEvent: ScheduleEvent | null }) {
	const locationItems = items.filter(i => i.tag === 'Hotel' || i.tag === 'Venue');

	if (selectedEvent) {
		const isLocation = selectedEvent.tag === 'Hotel' || selectedEvent.tag === 'Venue';
		return (
			<div style={{ padding: '24px 28px' }}>
				{isLocation ? (
					<LocationCard ev={selectedEvent} />
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						<div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)' }}>
							{selectedEvent.time && selectedEvent.time !== '—' ? selectedEvent.time : ''}
						</div>
						<div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{selectedEvent.label}</div>
						{selectedEvent.tag && (
							<span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: selectedEvent.tagColor || 'var(--text4)', fontFamily: "'Barlow Condensed', sans-serif" }}>
								{selectedEvent.tag}
							</span>
						)}
						{selectedEvent.notes && (
							<div style={{ marginTop: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{selectedEvent.notes}</div>
						)}
						{selectedEvent.mapsUrl && (
							<a href={selectedEvent.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ea4335', textDecoration: 'none' }}>
								<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
								Open in Maps
							</a>
						)}
					</div>
				)}
			</div>
		);
	}

	return null;
}

/* ─── Race schedule card shown on race days ─────────────────── */
function RaceScheduleCard({ races, broadcast, dayLabel }: {
	races: RaceEntry[];
	broadcast: string;
	dayLabel: string;
}) {
	return (
		<div className="race-sched-card">
			<div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 8 }}>
				Event Schedule
			</div>
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

function blockContentForPanel(panel: string, selectedId: string, blocks?: import('@/types').Block[]) {
	if (panel === '1430') return <Block1430 data={null} />;
	return <BlockContent panel={panel} selectedId={selectedId} blocks={blocks} />;
}

function canEditSchedule(role: import('@/types').Role | null): boolean {
	return role?.view === 'coach' || role?.view === 'developer' || role?.id === 'rasmus' || role?.id === 'christian';
}

export default function DayBackbone() {
	const { role } = useRole();
	const [activeRegat, setActiveRegat] = useState(getDefaultRegat);
	const [activeDay, setActiveDay]     = useState(() => getDefaultDay(getDefaultRegat()));

	function selectRegat(id: string) {
		setActiveRegat(id);
		setActiveDay(getDefaultDay(id));
	}
	const [isLiveMode, setIsLiveMode]   = useState(false);
	const [simMode]                     = useState(false);
	const [editMode, setEditMode]       = useState(false);
	const [schedule, setSchedule]       = useState<ScheduleEvent[] | null>(null);
	const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

	const activeVenue = REGATTAS.find(r => r.id === activeRegat) ?? REGATTAS[5];
	const venueTimezone = activeVenue.timezone;

	// In sim mode, always use sim-camp blocks regardless of regatta selection
	const effectiveRegatId = simMode ? 'sim-camp' : activeRegat;
	const blocks = getBlocks(new Date(), effectiveRegatId, activeDay, venueTimezone, schedule ?? undefined);
	const nowBlock = blocks.find(b => b.status === 'now');
	const [selectedId, setSelectedId] = useState(nowBlock?.id ?? blocks[0]?.id ?? '1430');
	const userSelectedRef = useRef(false);

	// Derived: agenda days don't apply in sim mode
	const isAgendaDay = !simMode && !!(
		activeVenue.weekAgenda?.[activeDay] &&
		!activeVenue.raceDayIndices?.includes(activeDay)
	);
	// Use dynamic schedule for agenda items; fall back to hardcoded for race days
	const agendaItems: ScheduleEvent[] | undefined = isAgendaDay
		? (schedule ?? undefined)
		: undefined;
	const raceSchedule = activeVenue.raceSchedule?.[activeDay];
	const raceScheduleOverride = !isAgendaDay && !simMode ? (schedule ?? undefined) : undefined;

	// Load schedule from backend (with localStorage fallback) on regatta/day change
	useEffect(() => {
		setEditMode(false);
		setSelectedEvent(null);
		let cancelled = false;

		function applyFallback() {
			if (cancelled) return;
			const agendaRaw = activeVenue.weekAgenda?.[activeDay];
			const isAgenda = !simMode && !!agendaRaw && !activeVenue.raceDayIndices?.includes(activeDay);
			if (isAgenda && agendaRaw) {
				setSchedule(seedFromAgenda(agendaRaw));
			} else if (!simMode) {
				setSchedule(seedFromBlocks(getBlocks(new Date(), effectiveRegatId, activeDay, venueTimezone)));
			} else {
				setSchedule(null);
			}
		}

		loadSchedule(effectiveRegatId, activeDay).then(saved => {
			if (cancelled) return;
			if (saved) setSchedule(saved);
			else applyFallback();
		}).catch(applyFallback);

		return () => { cancelled = true; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeRegat, activeDay, simMode]);

	// Reset selection when regatta, day, or sim mode changes
	useEffect(() => {
		userSelectedRef.current = false;
		const freshBlocks = getBlocks(new Date(), effectiveRegatId, activeDay, venueTimezone);
		const live = freshBlocks.find(b => b.status === 'now');
		setSelectedId(live?.id ?? freshBlocks[0]?.id ?? '1430');
	}, [activeRegat, activeDay, simMode]); // eslint-disable-line react-hooks/exhaustive-deps

	// Follow the live "now" block automatically unless the user has manually selected one
	useEffect(() => {
		const interval = setInterval(() => {
			if (userSelectedRef.current) return;
			const live = getBlocks(new Date(), effectiveRegatId, activeDay, venueTimezone).find(b => b.status === 'now');
			if (live) setSelectedId(live.id);
		}, 30_000);
		return () => clearInterval(interval);
	}, [activeRegat, activeDay, simMode]); // eslint-disable-line react-hooks/exhaustive-deps

	function handleScheduleSave(events: ScheduleEvent[]) {
		setSchedule(events);
		setEditMode(false);
		saveSchedule(effectiveRegatId, activeDay, events); // fire-and-forget (also writes localStorage)
	}

	function handleSelect(id: string) {
		userSelectedRef.current = true;
		setSelectedId(id);
	}

	async function handleEnterLive() {
		try {
			await document.documentElement.requestFullscreen();
		} catch (_) { /* fullscreen may be blocked */ }
		setIsLiveMode(true);
	}

	function handleExitLive() {
		setIsLiveMode(false);
	}

	const selected = blocks.find(b => b.id === selectedId);
	const panel = selected?.panel ?? 'future';
	const blockContent = blockContentForPanel(panel, selectedId, blocks);

	// Date for the selected regatta day (used for tides lookup)
	const selectedDate = new Date(activeVenue.start);
	selectedDate.setDate(selectedDate.getDate() + activeDay);

	const isRaceDay = simMode || !isAgendaDay;

	// Edit controls rendered inside the Event Schedule sidebar section
	const scheduleEditSrc = isAgendaDay ? (schedule ?? agendaItems ?? []) : (schedule ?? seedFromBlocks(blocks));
	const scheduleEditCtrl = canEditSchedule(role) && !simMode ? (
		editMode
			? <ScheduleEditor events={scheduleEditSrc} onSave={handleScheduleSave} onCancel={() => setEditMode(false)} />
			: <EditScheduleBtn onClick={() => setEditMode(true)} />
	) : undefined;

	function renderMobExpanded(blockId: string) {
		const b = blocks.find(bl => bl.id === blockId);
		if (!b) return null;
		return blockContentForPanel(b.panel, blockId, blocks);
	}

	return (
		<div className="s-backbone">

	{isLiveMode && (
		<LiveMode
			regatId={effectiveRegatId}
			dayIndex={activeDay}
			venueCity={simMode ? 'Simulator' : activeVenue.city}
			venueLat={activeVenue.lat}
			venueLon={activeVenue.lon}
			venueTimezone={venueTimezone}
			selectedDate={selectedDate}
			onExit={handleExitLive}
			renderContent={(blockId) => blockContentForPanel(
				blocks.find(b => b.id === blockId)?.panel ?? 'future',
				blockId,
				blocks,
			)}
		/>
	)}

	{/* Mobile layout */}
	<div className="mob-only mob-backbone">
	<RegatNav activeRegat={activeRegat} setActiveRegat={selectRegat} activeDay={activeDay} setActiveDay={setActiveDay} />
	<div style={{ padding: '0 0 4px' }}>
		<AskMeBar />
	</div>
	{isRaceDay && !simMode && (
	<button className="mob-live-btn" onClick={handleEnterLive}>
		<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
		Live Mode
	</button>
	)}
	<MobConditionsBar lat={activeVenue.lat} lon={activeVenue.lon} city={activeVenue.city} />
	{isAgendaDay && agendaItems ? (
		<div style={{ padding: '12px 16px' }}>
			<AgendaDayView items={agendaItems} dayLabel={activeVenue.days[activeDay]} onOpenDrive={(url, title) => setSelectedEvent({ id: url, label: title, driveUrl: url, time: '', tag: '' })} />
			{scheduleEditCtrl}
		</div>
	) : (
		<div className="mob-bb-tl">
			{raceSchedule && !simMode && (
				<div style={{ padding: '12px 16px 0' }}>
					<RaceScheduleCard races={raceSchedule.races} broadcast={raceSchedule.broadcast} dayLabel={activeVenue.days[activeDay]} />
				</div>
			)}
			<Timeline selectedId={selectedId} onSelect={handleSelect} renderExpanded={renderMobExpanded} blocks={blocks} onLive={isRaceDay && !simMode ? handleEnterLive : undefined} scheduleOverride={raceScheduleOverride} editControls={scheduleEditCtrl} />
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
			selectedDate={selectedDate}
			editControls={scheduleEditCtrl}
			onSelect={(ev) => setSelectedEvent(prev => prev?.id === ev.id ? null : ev)}
			selectedId={selectedEvent?.id}
		/>
	) : (
		<Timeline selectedId={selectedId} onSelect={handleSelect} venueLat={activeVenue.lat} venueLon={activeVenue.lon} venueCity={activeVenue.city} blocks={blocks} selectedDate={selectedDate} onLive={isRaceDay && !simMode ? handleEnterLive : undefined} raceScheduleNode={raceSchedule && !simMode ? <RaceScheduleCard races={raceSchedule.races} broadcast={raceSchedule.broadcast} dayLabel={activeVenue.days[activeDay]} /> : undefined} scheduleOverride={raceScheduleOverride} editControls={scheduleEditCtrl} />
	)}
	<div className="main" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
		<RegatNav activeRegat={activeRegat} setActiveRegat={selectRegat} activeDay={activeDay} setActiveDay={setActiveDay} />
		{isAgendaDay && agendaItems && selectedEvent?.driveUrl ? (
			<DriveViewer url={selectedEvent.driveUrl} title={selectedEvent.label} />
		) : (
			<>
			<div key={`${activeRegat}-${activeDay}`} className="block-view on">
			{isAgendaDay && agendaItems ? (
				<AgendaMainPanel items={agendaItems} selectedEvent={selectedEvent} />
			) : blockContent}
			</div>
			<AskMeBar />
			</>
		)}
		</div>
	</div>

		</div>
	);
}

function EditScheduleBtn({ onClick }: { onClick: () => void }) {
	return (
	<button
		onClick={onClick}
		style={{
			display: 'inline-flex', alignItems: 'center', gap: 5,
			padding: '3px 8px', borderRadius: 5,
			border: '1px solid var(--line)', background: 'none',
			fontSize: 10, fontWeight: 600, cursor: 'pointer',
			fontFamily: 'inherit', color: 'var(--text4)',
			flexShrink: 0,
		}}
	>
		<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
		</svg>
		Edit
	</button>
	);
}
