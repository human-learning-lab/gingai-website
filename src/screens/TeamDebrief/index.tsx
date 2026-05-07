import { useState, useEffect, useRef } from 'react';
import LeftNav from '../../components/LeftNav/LeftNav';
import type { ScreenId } from '../../types';

interface Props {
	activeScreen: ScreenId;
	onNavigate: (s: ScreenId) => void;
	transcriptLines?: string[];
	interimText?: string;
	topics?: string[];
	sentimentPts?: number[];
	onRecordingChange?: (recording: boolean) => void;
}




export default function TeamDebrief({
	activeScreen,
	onNavigate,
	transcriptLines,
	interimText,
	topics,
	sentimentPts,
	onRecordingChange,
}: Props) {
	const [recording, setRecording] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const [internalLines] = useState<string[]>([]);
	const [internalInterim] = useState('');
	const scrollRef = useRef<HTMLDivElement>(null);

	const lines   = transcriptLines ?? internalLines;
	const interim = interimText    ?? internalInterim;

	// Session timer
	useEffect(() => {
		if (!recording) return;
		const id = setInterval(() => setElapsed(s => s + 1), 1000);
		return () => clearInterval(id);
	}, [recording]);

	// Auto-scroll on new content
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [lines, interim]);

	function toggleRecording() {
		const next = !recording;
		setRecording(next);
		if (!next) setElapsed(0);
		onRecordingChange?.(next);
	}

	function formatElapsed(s: number) {
		const m   = Math.floor(s / 60).toString().padStart(2, '0');
		const sec = (s % 60).toString().padStart(2, '0');
		return `${m}:${sec}`;
	}

	// SVG polyline points for sentiment graph
	const SVG_W = 200;
	const SVG_H = 56;
	const activeSentiment = sentimentPts && sentimentPts.length > 1 ? sentimentPts : [];
	const sentPts = activeSentiment.map((v, i) => {
		const x = (i / (activeSentiment.length - 1)) * SVG_W;
		const y = SVG_H - (v / 100) * SVG_H;
		return `${x},${y}`;
	}).join(' ');

	return (
		<div className="s-debrief">
		<LeftNav activeScreen={activeScreen} onNavigate={onNavigate} />

		<div className="db-wrap">

		{/* ── Top bar ── */}
		<div className="dbd-topbar">
		<div className="dbd-title-group">
		<div className="db-ttl">
		Team Debrief <span className="sub">· Live Session</span>
		</div>
		<div className="dbd-subtitle">Post R5/R6/R7 · 6 sailors · Coach: Paul Brotherson</div>
		</div>

		<div className="dbd-controls">
		<div className={`dbd-timer${recording ? ' active' : ''}`}>
		{formatElapsed(elapsed)}
		</div>
		<button
		className={`dbd-rec-btn${recording ? ' recording' : ''}`}
		onClick={toggleRecording}
		title={recording ? 'Stop recording' : 'Start recording'}
		>
		<span className="dbd-rec-dot" />
		{recording ? 'Stop' : 'Record'}
		</button>
		</div>
		</div>

		{/* ── Body ── */}
		<div className="db-body">

		{/* Transcript window */}
		<div className="dbd-transcript-wrap">
		<div className="dbd-transcript-card">
		<div className="dbd-transcript-header">
		<span className="dbs-lbl" style={{ margin: 0 }}>Live Transcription</span>
		{recording && <span className="dbd-live-badge">LIVE</span>}
		</div>

		<div className="dbd-transcript" ref={scrollRef}>
		{lines.length === 0 && !interim && !recording && (
			<div className="dbd-empty">
			Press <strong>Record</strong> to start capturing the session transcript.
				</div>
		)}
		{lines.length === 0 && !interim && recording && (
			<div className="dbd-empty dbd-listening">Listening…</div>
		)}
		{lines.map((line, i) => (
			<p key={i} className="dbd-line">{line}</p>
		))}
		{interim && (
			<p className="dbd-line dbd-interim">{interim}</p>
		)}
		</div>
		</div>
		</div>

		{/* ── Sidebar ── */}
		<div className="db-side">

		{/* Talking time */}
		<div className="dbs-sec">
		<div className="dbs-lbl">Talking Time</div>
		<div className="dbd-graph-card">
		<div className="dbd-placeholder-note">No data yet</div>
		</div>
		</div>

		{/* Sentiment trend */}
		<div className="dbs-sec">
		<div className="dbs-lbl">Sentiment Trend</div>
		<div className="dbd-graph-card">
		{activeSentiment.length > 1 ? (
			<>
			<svg
			viewBox={`0 0 ${SVG_W} ${SVG_H}`}
			className="dbd-svg"
			preserveAspectRatio="none"
			>
			<defs>
			<linearGradient id="sent-grad" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%"   stopColor="var(--green)" stopOpacity="0.20" />
			<stop offset="100%" stopColor="var(--green)" stopOpacity="0"    />
			</linearGradient>
			</defs>
			<polygon
			points={`0,${SVG_H} ${sentPts} ${SVG_W},${SVG_H}`}
			fill="url(#sent-grad)"
			/>
			<polyline
			points={sentPts}
			fill="none"
			stroke="var(--green)"
			strokeWidth="1.5"
			strokeLinejoin="round"
			strokeLinecap="round"
			/>
			</svg>
			<div className="dbd-sentiment-labels">
			<span>Start</span>
			<span>Now</span>
			</div>
			</>
		) : (
		<div className="dbd-placeholder-note">No data yet</div>
		)}
		</div>
		</div>

		{/* Topics detected */}
		<div className="dbs-sec">
		<div className="dbs-lbl">Topics Detected</div>
		<div className="dbd-graph-card">
		<div className="dbd-topics">
		{topics && topics.length > 0
			? topics.map(t => (
				<span key={t} className="dbd-topic-tag">{t}</span>
			))
				: <span className="dbd-placeholder-note">No topics yet</span>
		}
		</div>
		<div className="dbd-placeholder-note">Detected from transcript</div>
		</div>
		</div>

		</div>
		</div>
		</div>
		</div>
	);
}
