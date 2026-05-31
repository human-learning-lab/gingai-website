'use client';

import { useState, useEffect, useRef } from 'react';
import { useRole } from '@/context/RoleContext';
import { IconWarn, IconStar, IconPlay } from '@/components/Icons';

// ─── Agenda types ────────────────────────────────────────────
interface ClassIcons {
  isNew: boolean; recurring: boolean; dataConfirmed: boolean; noData: boolean; inProtocol: boolean;
}
interface Topic {
  num: string; name: string; pct: number; ptColor: string; score: number;
  pts: string; sailors: string; mm: boolean; icons: ClassIcons;
}

const DEMO_TOPICS: Topic[] = [
  { num: '01', name: 'Tack timing at Mark 2',        pct: 94, ptColor: 'var(--red)',    score: 94, pts: '+3.2 pts', sailors: '4 sailors', mm: true,  icons: { isNew: false, recurring: true,  dataConfirmed: true,  noData: false, inProtocol: false } },
  { num: '02', name: 'Gybe communication',            pct: 71, ptColor: 'var(--yellow)', score: 71, pts: '+2.1 pts', sailors: '3 sailors', mm: false, icons: { isNew: true,  recurring: false, dataConfirmed: false, noData: true,  inProtocol: false } },
  { num: '03', name: 'Flight stability — zone entry', pct: 58, ptColor: 'var(--green)',  score: 58, pts: '+1.8 pts', sailors: '2 sailors', mm: false, icons: { isNew: false, recurring: true,  dataConfirmed: true,  noData: false, inProtocol: true  } },
  { num: '04', name: 'Pre-start alignment',           pct: 44, ptColor: 'var(--text3)',  score: 44, pts: '+1.2 pts', sailors: '2 sailors', mm: false, icons: { isNew: true,  recurring: false, dataConfirmed: false, noData: false, inProtocol: false } },
  { num: '05', name: 'Wing config — downwind',        pct: 32, ptColor: 'var(--text4)',  score: 32, pts: '+0.8 pts', sailors: '1 sailor',  mm: false, icons: { isNew: false, recurring: false, dataConfirmed: true,  noData: false, inProtocol: true  } },
];

function DemoBadge() {
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
      background: 'var(--yg)', border: '1px solid var(--yb)', color: 'var(--yellow)',
    }}>DEMO DATA</span>
  );
}

function ClassificationIcons({ icons }: { icons: ClassIcons }) {
  return (
    <div className="cls-icons">
      <span className={`cls-icon${icons.isNew ? ' active-new' : ''}`}>⚡ New</span>
      <span className={`cls-icon${icons.recurring ? ' active-recurring' : ''}`}>↩ Recurring</span>
      <span className={`cls-icon${icons.dataConfirmed ? ' active-data' : ''}`}>✓ Data</span>
      <span className={`cls-icon${icons.noData ? ' active-nodata' : ''}`}>✗ No Data</span>
      <span className={`cls-icon${icons.inProtocol ? ' active-protocol' : ''}`}>≡ Protocol</span>
    </div>
  );
}

// ─── Agenda tab ───────────────────────────────────────────────
function AgendaTab() {
  const [activeTopic, setActiveTopic] = useState(0);
  const { role } = useRole();
  const t = DEMO_TOPICS[activeTopic];

  return (
    <div className="s-intel">
      <div className="intel-left">
        <div className="il-top">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="il-title" style={{ marginBottom: 0 }}>Debrief Agenda</div>
            <DemoBadge />
          </div>
          <div className="synth-prog"><div className="synth-fill" /></div>
          <div className="synth-lbl">4/6 sailors synthesised · Post R5–R7</div>
        </div>
        <div className="t-list">
          {DEMO_TOPICS.map((topic, i) => (
            <div
              key={topic.num}
              className={`t-row${activeTopic === i ? ' on' : ''}`}
              onClick={() => setActiveTopic(i)}
            >
              <div className="t-num">{topic.num}</div>
              <div className="t-info">
                <div className="t-name">
                  {topic.name}
                  {topic.mm && <span style={{ color: 'var(--yellow)', fontSize: 11, marginLeft: 4 }}><IconWarn /></span>}
                </div>
                <div className="t-bar-row">
                  <div className="t-bar-bg">
                    <div className="t-bar-fill" style={{ width: `${topic.pct}%`, background: topic.ptColor }} />
                  </div>
                  <div className="t-score" style={{ color: topic.ptColor }}>{topic.score}</div>
                </div>
                <div className="t-chips">
                  <div className="t-pts">{topic.pts}</div>
                  <div className="t-sailors">{topic.sailors}</div>
                  {topic.mm && <div className="t-mm">mismatch</div>}
                </div>
                <ClassificationIcons icons={topic.icons} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="intel-right">
        <div className="ir-top">
          <div className="ir-eyebrow">Topic #{t.num} · Debrief Agenda</div>
          <div className="ir-title">
            {t.name}
            {t.mm && <IconWarn size={16} />}
          </div>
          <div className="ir-chips">
            <span className="chip chip-r">Impact {t.score}</span>
            <span className="chip chip-g">{t.pts}</span>
            <span className="chip chip-y">{t.sailors}</span>
          </div>
          <ClassificationIcons icons={t.icons} />
        </div>
        <div className="ir-scroll">
          {(role?.view === 'analyst' || role?.view === 'developer') && (
            <div className="role-banner analyst" style={{ marginBottom: 20, borderRadius: 3 }}>
              <IconStar /> Analyst view — full data + root cause enabled
            </div>
          )}
          {t.mm && (
            <div className="mm-section">
              <div className="mm-head"><IconWarn /> Perception Mismatch — 2 sailors, opposite reads</div>
              <div className="mm-q"><strong>Rasmus:</strong> &ldquo;We committed too late — I was waiting for a call that never came&rdquo;</div>
              <div className="mm-q"><strong>Pietro:</strong> &ldquo;The call was on time — it was a boat speed issue, not timing&rdquo;</div>
              <div className="mm-note">Surface this before showing data. Same event, two different mental models — EDGE scenario.</div>
            </div>
          )}
          <div className="d-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div className="sec-title" style={{ color: 'var(--text3)', marginBottom: 0 }}>Data Evidence — Oracle Telemetry R5</div>
              <DemoBadge />
            </div>
            <div className="d-stats">
              <div><div className="d-val" style={{ color: 'var(--red)' }}>-8.3%</div><div className="d-lbl">VMG loss at mark 2</div></div>
              <div><div className="d-val" style={{ color: 'var(--yellow)' }}>23s</div><div className="d-lbl">Tack duration (target: 18s)</div></div>
              <div><div className="d-val" style={{ color: 'var(--red)' }}>3 BL</div><div className="d-lbl">Lost vs fleet median</div></div>
            </div>
            <div className="vid-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0, width: 96, height: 54, borderRadius: 4, overflow: 'hidden', background: 'var(--line2)' }}>
                <img src="/images/thumbnail.jpg" alt="Video preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                  <IconPlay />
                </div>
              </div>
              <div style={{ paddingTop: 4 }}>
                <div className="vid-name">Mark 2 tack — Race 5 · VMG overlay · auto-clipped</div>
                <div className="vid-dur">0:34</div>
              </div>
            </div>
          </div>
          <div className="q-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div className="sec-title" style={{ color: 'var(--text3)', marginBottom: 0 }}>Sailor Inputs — 4/6 captured</div>
              <DemoBadge />
            </div>
            <div className="q-grid">
              {[
                { i: 'R',  n: 'Rasmus',  r: 'Flight Controller', q: '"Waited for a call. Had the angle. Nobody owns this decision clearly."', hl: true },
                { i: 'P',  n: 'Pietro',  r: 'Wing Trimmer',      q: '"Call was on time. Speed was already lost from the gate."', hl: true },
                { i: 'Mt', n: 'Mateus',  r: 'Grinder G1',        q: '"Felt the hesitation. Agree with Rasmus — someone needed to commit."' },
                { i: 'Mc', n: 'Marco',   r: 'Grinder G2',        q: '"Speed was already down from the gate. Maybe two separate problems."' },
              ].map(s => (
                <div key={s.n} className="q-card" style={s.hl ? { borderTopColor: 'var(--yellow)' } : undefined}>
                  <div className="q-who">
                    <div className="q-ava">{s.i}</div>
                    <div><div className="q-name">{s.n}</div><div className="q-role">{s.r}</div></div>
                  </div>
                  <div className="q-txt">{s.q}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hyp-section">
            <div className="hyp-head"><IconStar /> GingAI · 5 Whys Root Cause</div>
            <div className="hyp-txt">
              If <em>the decision rule for tack trigger at mark 2 is not explicitly assigned to one person</em>, then{' '}
              <em>Rasmus and Pietro each wait for the other to call</em>, because{' '}
              <em>the existing protocol doesn&apos;t define who has authority in marginal conditions.</em>
            </div>
          </div>
          <div className="sec-title" style={{ marginTop: 20, marginBottom: 10 }}>Suggested Actions</div>
          <div className="act-row">
            <div className="act-chk" />
            <div>
              <div className="act-txt">Define tack trigger: &ldquo;Rasmus calls within 3 BL — no confirmation needed&rdquo;</div>
              <div className="act-meta">→ Golden Rule · Owner: Rasmus</div>
            </div>
          </div>
          <div className="act-row" style={{ borderBottom: 'none' }}>
            <div className="act-chk" />
            <div>
              <div className="act-txt">Simulator scenario: replicate R5 mark 2 — test new rule</div>
              <div className="act-meta">→ Next sim brief · Owner: Paul G.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Session tab ──────────────────────────────────────────────
interface SessionTabProps {
  transcriptLines?: string[];
  sentimentPts?: number[];
  topics?: string[];
  onRecordingChange?: (recording: boolean) => void;
}

function SessionTab({ transcriptLines: transcriptLines, sentimentpts: _sentimentpts, topics: _topics, onRecordinChange: onRecordingChange }: sessiontabprops) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const lines = transcriptLines ?? [];
  const [interim] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, interim]);

  function toggleRecording() {
    const next = !recording;
    setRecording(next);
    if (!next) setElapsed(0);
    onRecordingChange?.(next);
  }

  const m   = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const sec = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="db-wrap" style={{ flex: 1, minHeight: 0 }}>
      <div className="dbd-topbar">
        <div className="dbd-title-group">
          <div className="db-ttl">Team Debrief <span className="sub">· Live Session</span></div>
          <div className="dbd-subtitle">Post R5/R6/R7 · 6 sailors · Coach: Paul Brotherson</div>
        </div>
        <div className="dbd-controls">
          <div className={`dbd-timer${recording ? ' active' : ''}`}>{m}:{sec}</div>
          <button className={`dbd-rec-btn${recording ? ' recording' : ''}`} onClick={toggleRecording}>
            <span className="dbd-rec-dot" />
            {recording ? 'Stop' : 'Record'}
          </button>
        </div>
      </div>

      <div className="db-body">
        <div className="dbd-transcript-wrap">
          <div className="dbd-transcript-card">
            <div className="dbd-transcript-header">
              <span className="dbs-lbl" style={{ margin: 0 }}>Live Transcription</span>
              {recording && <span className="dbd-live-badge">LIVE</span>}
            </div>
            <div className="dbd-transcript" ref={scrollRef}>
              {lines.length === 0 && !interim && !recording && (
                <div className="dbd-empty">Press <strong>Record</strong> to start capturing the session transcript.</div>
              )}
              {lines.length === 0 && !interim && recording && (
                <div className="dbd-empty dbd-listening">Listening…</div>
              )}
              {lines.map((line, i) => <p key={i} className="dbd-line">{line}</p>)}
              {interim && <p className="dbd-line dbd-interim">{interim}</p>}
            </div>
          </div>
        </div>

        <div className="db-side">
          <div className="dbs-sec">
            <div className="dbs-lbl">Talking Time</div>
            <div className="dbd-graph-card">
              <div className="dbd-placeholder-note">{recording ? 'Waiting for data…' : 'Start recording to see talking time'}</div>
            </div>
          </div>
          <div className="dbs-sec">
            <div className="dbs-lbl">Sentiment Trend</div>
            <div className="dbd-graph-card">
              <div className="dbd-placeholder-note">{recording ? 'Waiting for data…' : 'Start recording to see sentiment'}</div>
            </div>
          </div>
          <div className="dbs-sec">
            <div className="dbs-lbl">Topics Detected</div>
            <div className="dbd-graph-card">
              <div className="dbd-placeholder-note">{recording ? 'Waiting for topics…' : 'Topics appear as recording runs'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────
interface TeamDebriefProps {
  transcriptLines?: string[];
  topics?: string[];
  sentimentPts?: number[];
  onRecordingChange?: (recording: boolean) => void;
}

export default function TeamDebrief({ transcriptLines, topics, sentimentPts, onRecordingChange }: TeamDebriefProps = {}) {
  const [tab, setTab] = useState<'agenda' | 'session'>('session');

  return (
    <div className="s-debrief">

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <div className="tabs" style={{ flexShrink: 0, borderBottom: '1px solid var(--line)', padding: '0 24px' }}>
          <div className={`tab${tab === 'session' ? ' on' : ''}`} onClick={() => setTab('session')}>Session</div>
          <div className={`tab${tab === 'agenda'  ? ' on' : ''}`} onClick={() => setTab('agenda')}>Agenda</div>
        </div>
        {tab === 'agenda'  && <AgendaTab />}
        {tab === 'session' && (
          <SessionTab
            transcriptLines={transcriptLines}
            topics={topics}
            sentimentPts={sentimentPts}
            onRecordingChange={onRecordingChange}
          />
        )}
      </div>
    </div>
  );
}
