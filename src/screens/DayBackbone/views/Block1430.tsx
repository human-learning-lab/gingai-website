'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import { IconStar } from '@/components/Icons';

const AGENT_BASE = 'https://adk-default-service-name-742926686826.europe-north1.run.app';
const APP_NAME = 'gingai';

type ChatMessage = {
  init: string;
  name: string;
  ts: string;
  ai: boolean;
  color: string;
  txt: string;
};

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
        // non-JSON or empty lines — skip
      }
    }
  }
}

const DOCS = [
  { name: 'Bermuda — Race Analysis R1–R4', meta: 'Updated 2h ago · 14 pages', type: 'Data',    badge: 'doc-badge-data' },
  { name: 'Team Golden Rules — Current Season', meta: '12 active rules',          type: 'Memory',  badge: 'doc-badge-memory' },
  { name: 'Video — Mark 2 Tack Comparison (R3 vs Fleet)', meta: '2:34 · Auto-clipped', type: 'Video', badge: 'doc-badge-video' },
  { name: 'Open Action Items — R3/R4 Debrief', meta: '4 open · 2 done',           type: 'Actions', badge: 'doc-badge-actions' },
];

const FOCUS_ATHLETE = [
  { n: 1, t: 'Tack at Mark 2 — commit early, own the call', d: "Trigger within 3 BL of the mark. Your read to own — don't wait for a secondary signal.", stat: '-8.3% VMG loss yesterday', m: 'Target: <15s tack duration · Rule #7' },
  { n: 2, t: 'Flight stability entering the zone',           d: 'R4 showed 3 foil touchdowns in the pre-start zone. Height management 200m before the line.',       stat: '3 touchdowns in R4', m: 'Watch: Rudder aggression index' },
  { n: 3, t: 'Gybe call at offset — read fleet first',       d: '10 kts = marginal lift. Read fleet proximity before committing. "Hold" or "Go" — two options only.', stat: '10 kts marginal window', m: 'Signal: "Hold" / "Go" · Rule #11' },
];

const FOCUS_TEAM = [
  { name: 'Martine', role: 'Helm / Driver',      init: 'MG', points: ['Boat speed — foil height in pre-start zone', 'Start line bias · positioning off the line'] },
  { name: 'Rasmus',  role: 'Flight Controller',  init: 'RK', points: ['Tack at Mark 2 — commit within 3 BL', 'Flight stability entering the zone', 'Gybe call at offset — read fleet first'] },
  { name: 'Pietro',  role: 'Wing Trimmer',       init: 'PS', points: ['Wing cant at 78–80° · marginal lift conditions', 'Start sequence comms — two-word calls only'] },
  { name: 'Mateus',  role: 'Grinder G1',         init: 'MI', points: ['Grinder load management · foil transitions', 'Support Rasmus on flight height cues'] },
  { name: 'Marco',   role: 'Grinder G2',         init: 'MC', points: ['Port gybe timing · consistent load', 'Communication with Mateus on foil transitions'] },
  { name: 'Paul G.', role: 'Strategist',         init: 'PG', points: ['Start line bias read · port vs starboard layline', 'Fleet positioning call — offset gybe timing'] },
];

const INITIAL_CHAT: ChatMessage[] = [
  { init: 'PB', name: 'Paul B.',  ts: '13:58', ai: false, color: 'var(--text2)', txt: 'Briefing pack is live. Wind reading 9.8–11.2 at the course, SSW, consistent. Read the mark 2 tack analysis before we start.' },
  { init: 'G',  name: 'GingAI',  ts: '14:02', ai: true,  color: 'var(--green)', txt: 'Oracle telemetry + wind data: 10 kts SSW matches the marginal flight window for the Brazil F50. Recommend wing cant at 78–80° for max stability. The tack at mark 2 in similar conditions (R1, Bermuda Day 2) cost 11.3m.' },
  { init: 'RK', name: 'Rasmus',  ts: '14:18', ai: false, color: 'var(--green)', txt: 'Good call on the cant. I want to settle who calls the gybe at the offset today before we go on the water.' },
  { init: 'PS', name: 'Pietro',  ts: '14:21', ai: false, color: 'var(--yellow)', txt: "Rasmus owns the offset call. I'll handle wing cant through the mark. 3 BL = go, no confirmation?" },
];

export default function Block1430() {
  const [tab, setTab] = useState<'briefing' | 'focus' | 'chat'>('briefing');
  const { role } = useRole();

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sessionReady = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = useRef(`session-${Date.now()}`);
  const userId = 'user-1';

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const now = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { init: 'DU', name: 'Du', ts: now, ai: false, color: 'var(--text2)', txt: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      if (!sessionReady.current) {
        await ensureSession(userId, sessionId.current);
        sessionReady.current = true;
      }

      const aiMsg: ChatMessage = { init: 'G', name: 'GingAI', ts: now, ai: true, color: 'var(--green)', txt: '' };
      setMessages(prev => [...prev, aiMsg]);

      let accumulated = '';
      for await (const chunk of streamAgentResponse(userId, sessionId.current, text)) {
        accumulated += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...aiMsg, txt: accumulated };
          return updated;
        });
      }

      if (!accumulated) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...aiMsg, txt: '(Ingen svar fra agenten)' };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...prev[prev.length - 1], txt: 'Kunne ikke nå GingAI — prøv igjen.' };
        return updated;
      });
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  return (
    <>
      <div className="main-top">
        <div className="eyebrow">14:30 · Phase 1 — Prime</div>
        <div className="page-title">
          Brief the Day <span className="ptag ptag-g">Prime</span>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'briefing' ? ' on' : ''}`} onClick={() => setTab('briefing')}>Briefing Pack</div>
        <div className={`tab${tab === 'focus' ? ' on' : ''}`} onClick={() => setTab('focus')}>
          {role?.view === 'sailor' ? 'My Focus Points' : 'Focus Points'}
        </div>
        <div className={`tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}>
          Chat <span style={{ color: 'var(--green)', marginLeft: 3, fontSize: 10 }}>3</span>
        </div>
      </div>

      {tab === 'briefing' && (
        <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="cond-card">
            <div className="cond-cell">
              <div className="cond-lbl">Wind</div>
              <div className="cond-val">10–12</div>
              <div className="cond-unit">kts</div>
            </div>
            <div className="cond-cell cond-cell-mid">
              <div className="cond-lbl">Direction</div>
              <div className="cond-val" style={{ color: 'var(--text2)' }}>SSW</div>
              <div className="cond-unit">steady</div>
            </div>
            <div className="cond-cell">
              <div className="cond-lbl">Course</div>
              <div className="cond-val" style={{ color: 'var(--yellow)' }}>Course 2</div>
              <div className="cond-unit">Mark A upwind</div>
            </div>
          </div>

          <div className="card">
            <div className="card-label">Documents</div>
            {DOCS.map((doc, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < DOCS.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer',
              }}>
                <span className={`doc-badge ${doc.badge}`}>{doc.type}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-n" style={{ marginBottom: 2 }}>{doc.name}</div>
                  <div className="doc-m">{doc.meta}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--line2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>

          <div className="card card-g">
            <div className="card-label" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconStar /> GingAI · Race Briefing
            </div>
            <div className="ai-body">
              10 knot SSW favors early commitment at mark 2 — teams tacking within 3 boat lengths gain ~12m on average.
              Based on R3 data, Bermuda's tack timing was 5.2s behind the fleet median. At 10 kts with current wing
              configuration (80° cant), foil lift margin is tight — conservative gybe decisions recommended at the offset
              mark. Two open items from yesterday's debrief are directly relevant today:{' '}
              <strong style={{ color: 'var(--text)' }}>decision trigger for mark 2 tack</strong>, and{' '}
              <strong style={{ color: 'var(--text)' }}>comms protocol during the start sequence.</strong>
            </div>
          </div>
        </div>
      )}

      {tab === 'focus' && (
        <div className="pane on">
          {role?.view === 'sailor' ? (
            <>
              <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>{role.name} · personal focus areas for today</div>
              {FOCUS_ATHLETE.map(fp => (
                <div className="fp-card" key={fp.n}>
                  <div className="fp-card-num">{fp.n}</div>
                  <div className="fp-card-body">
                    <div className="fp-card-title">{fp.t}</div>
                    <div className="fp-card-desc">{fp.d}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 4, padding: '3px 8px', marginBottom: 6 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}>{fp.stat}</span>
                    </div>
                    <div className="fp-card-meta">
                      <span style={{ color: 'var(--text4)', fontWeight: 400, letterSpacing: 0 }}>→</span> {fp.m}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>Team · focus areas per sailor today</div>
              {FOCUS_TEAM.map(sailor => (
                <div className="card" key={sailor.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="s-ava" style={{ color: 'var(--green)', borderColor: 'var(--gb)', background: 'var(--gg)' }}>{sailor.init}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sailor.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sailor.role}</div>
                    </div>
                  </div>
                  {sailor.points.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--yellow)', minWidth: 18, flexShrink: 0, lineHeight: 1.4 }}>{i + 1}</div>
                      <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>{p}</div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div className="card-label" style={{ marginBottom: 0 }}>14:30 · Contextual Thread</div>
              <div style={{ fontSize: 11, color: 'var(--text4)' }}>{messages.length} meldinger</div>
            </div>

            <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '14px 16px',
                  borderBottom: i < messages.length - 1 ? '1px solid var(--line)' : 'none',
                  background: m.ai ? 'var(--gg)' : 'transparent',
                }}>
                  <div className="msg-ava" style={{ color: m.color, background: m.ai ? 'var(--bg2)' : undefined, borderColor: m.ai ? 'var(--gb)' : undefined, flexShrink: 0 }}>
                    {m.ai ? <IconStar size={11} /> : m.init}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                      <span className="msg-who" style={{ color: m.ai ? 'var(--green)' : undefined }}>{m.name}</span>
                      <span className="msg-ts">{m.ts}</span>
                    </div>
                    <div className="msg-txt" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.txt || (m.ai && sending ? <span style={{ color: 'var(--text4)' }}>GingAI skriver…</span> : '')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--bg2)' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Spør GingAI…"
                disabled={sending}
                style={{
                  flex: 1, background: 'var(--bg)', border: '1px solid var(--line2)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 14,
                  color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                  opacity: sending ? 0.6 : 1,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                style={{
                  background: sending || !input.trim() ? 'var(--bg3)' : 'var(--green)',
                  color: sending || !input.trim() ? 'var(--text4)' : '#fff',
                  border: 'none', borderRadius: 8, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600, cursor: sending || !input.trim() ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
