"use client";

import { useEffect, useState } from "react";
import Capture, {
  type CaptureValue,
  type PrimingMetric,
  type Sailor,
} from "./Capturing";
import { teamSailors } from '@/data/roles.hll';
import { shareBaseUrl } from '@/lib/appUrl';
import {
  fetchBriefing,
  fetchOwnGoals,
  fetchSailorContext,
  fetchSailorDay,
  fetchSquadGoals,
  fetchTeamContext,
  fetchTeamPicture,
  type BriefingContext,
  type SquadGoal,
} from '@/lib/carriedContext';
import { parseAgentJson } from '@/lib/agentJson';

/* ============================================================
   Example wiring. Replace local state with your own fetch/save
   and the handlers with real API calls.
   ============================================================ */

const BASE_SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Strategist" },
  { id: "pau", name: "Paul G.", role: "Helm" },
  { id: "pie", name: "Pietro", role: "Speed" },
  { id: "ras", name: "Rasmus", role: "Flight controller" },
  { id: "mrc", name: "Marco", role: "Trim" },
  { id: "bre", name: "Breno", role: "Trim" },
  { id: "mat", name: "Mateus", role: "G1"},
  { id: "mah", name: "Marina", role: "Spare Sailor"},
  { id: "jer", name: "Jeremy", role: "Performance coach"},
  { id: "ric", name: "Rich", role: "Strategy & performance" },
  { id: "nic", name: "Nico", role: "Data analyst" },
  { id: "chr", name: "Christian", role: "HuleLab" },
];

const SAILORS: Sailor[] = teamSailors(BASE_SAILORS);

/* Three, because the count is fixed once a set is sent and the backend
   validates a submission against it. The dropped opener was "What is the main
   thing on your mind?" — the three kept are the ones the capture reading
   actually measures against: their goal, where it broke, what carries. */
const DEFAULT_QUESTIONS = [
  "Did you achieve the goal you set this morning?",
  "Where did the plan break down most clearly?",
  "What should we take into tomorrow?",
];

const DEFAULT_PROMPT = `Write post-race capture questions for one sailor.

You are given: the squad goals agreed in the briefing, this sailor's own
goal from the morning, and their role.

Rules:
- Exactly three questions, no more and no fewer. They are standing on a
  dock and tired.
- One must ask directly about their own goal, in their own words.
- One must ask about a squad goal — the one closest to their role.
- Ask what happened, not how they felt about it.
- Never ask "how was it". Steer them to their own area.
- Plain language. No coaching vocabulary they wouldn't use themselves.`;

/* Starts empty on purpose: an absent entry means the sailor falls back to the
   team set. Pre-filling every sailor with the defaults meant a team-scope edit
   never reached them. */
const emptyPersonal: CaptureValue["personal"] = {};

const AGENT_BASE = '/api/agent';
const APP_NAME = 'generate_questions';


export default function CapturePage({
  runId
}:{
  runId: string
}) {
  const [value, setValue] = useState<CaptureValue>({
    teamQuestions: [...DEFAULT_QUESTIONS],
	teamPrompt: DEFAULT_PROMPT,
    personal: emptyPersonal,
  });

  /* What the morning filed, read back: the goals as agreed in the briefing and
     each sailor's own goal from priming. Both start empty and simply stay so
     for a run with no morning record — the same rendering as before, but a run
     that has one now writes its questions against it. */
  const [squadGoals, setSquadGoals] = useState<SquadGoal[]>([]);
  const [ownGoals, setOwnGoals] = useState<Record<string, string>>({});
  const [teamContext, setTeamContext] = useState<string | null>(null);
  const [teamPicture, setTeamPicture] = useState<unknown | null>(null);
  const [briefing, setBriefing] = useState<BriefingContext | null>(null);
  const [loaded, setLoaded] = useState(false);
  /* Whether this race day has a capture set on file. Nothing is normal — a day
     whose capture has not been sent — but the screen otherwise shows the
     built-in defaults, which looks the same as a set that failed to load. */
  const [hasSent, setHasSent] = useState(false);
  /* Tracked apart from `loaded`: the questions and the day's context are two
     fetches, and the screen should wait for both before offering to generate. */
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  /* The capture set that was actually sent for this day. Read with kind=capture:
     the morning's priming set lives in its own fields, and loading that here
     would show the coach the wrong questions entirely. Only sent sets are
     filed, since the mirror runs on the send path and never on generate.

     A sailor marked fromTeamSet was sent the team set, so they are left out of
     `personal` — an absent entry means they fall back to it, and writing one
     would turn a shared set into a personal override the coach never made. */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/day-questions?runId=${encodeURIComponent(runId)}&kind=capture`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setQuestionsLoaded(true); return; }
        const day = await res.json().catch(() => null);
        if (!day || cancelled) { setQuestionsLoaded(true); return; }

        const personal: CaptureValue["personal"] = {};
        for (const [name, set] of Object.entries(day.sailors ?? {})) {
          const sailorSet = set as { questions?: string[]; prompt?: string; fromTeamSet?: boolean };
          if (sailorSet.fromTeamSet || !sailorSet.questions?.length) continue;
          personal[name] = {
            questions: sailorSet.questions,
            prompt: sailorSet.prompt ?? DEFAULT_PROMPT,
          };
        }

        setValue({
          teamQuestions: day.teamQuestions?.length ? day.teamQuestions : [...DEFAULT_QUESTIONS],
          teamPrompt: day.teamPrompt || DEFAULT_PROMPT,
          personal,
        });
        setHasSent(true);
        setQuestionsLoaded(true);
      })
      .catch(() => { if (!cancelled) setQuestionsLoaded(true); });

    return () => { cancelled = true; };
  }, [runId]);

  /* Everything the evening questions are written against: the squad's standing
     context file from Storage, and what the morning filed against this race day
     — the team picture, the briefing record and the goals it agreed. Loaded
     once here rather than per generate, so a coach pressing generate twice does
     not re-read the same five things. */
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchSquadGoals(runId),
      fetchOwnGoals(runId),
      fetchTeamContext(),
      fetchTeamPicture(runId),
      fetchBriefing(runId),
    ]).then(([goals, own, ctx, picture, brief]) => {
      if (cancelled) return;
      setSquadGoals(goals);
      setOwnGoals(own);
      setTeamContext(ctx);
      setTeamPicture(picture);
      setBriefing(brief);
      setLoaded(true);
    }).catch(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [runId]);

  /* Not live yet. Wire this to Nico's feed once the per-role
     metrics are defined, then flip primingDataLive to true. */
  //const [primingData] = useState<Record<string, PrimingMetric[]>>({});

  async function handleGenerate(args: {
    prompt: string;
    scope: "team" | "personal";
    sailor?: Sailor;
    squadGoals: SquadGoal[];
    ownGoal?: string;
  }): Promise<string[]> {
  const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

  /* Everything the prompt says the agent is given, actually given. The old
     call sent `text: prompt` — the global window.prompt function, which
     JSON.stringify drops — so the agent received no instructions at all.

     Team scope is written against the squad: its standing context file, the
     morning's picture, and what the briefing settled. Personal scope swaps the
     squad file for the sailor's own and adds what this race day holds for them
     — the questions they were sent and their answers as condensed. The briefing
     stays in both, because the evening is answering against what the room
     agreed either way. */
  const sailorDay = args.sailor
    ? await fetchSailorDay(runId, args.sailor.name)
    : null;
  const sailorContext = args.sailor
    ? await fetchSailorContext(args.sailor.name)
    : null;

  const briefingBlock = briefing
    ? [
        briefing.decisions.length
          ? `\nDecisions from the briefing:\n${briefing.decisions.map((d) => `- ${d}`).join('\n')}`
          : '',
        briefing.sections.length
          ? `\nThe briefing record:\n${briefing.sections
              .map((sec) => {
                const body = [sec.body, ...(sec.items ?? []).map((i) => `  - ${i}`)]
                  .filter(Boolean).join('\n');
                return `${sec.heading}${sec.tone === 'open' ? ' (left open)' : ''}\n${body}`;
              })
              .join('\n\n')}`
          : '',
      ].filter(Boolean).join('\n')
    : '';

  const text = [
    args.prompt,
    /* The change note travels with each goal. A goal the room reworded, added
       or never addressed is different context from one carried through
       untouched, and the evening's questions should know which it is. */
    args.squadGoals.length
      ? `\nSquad goals agreed in the briefing:\n${args.squadGoals
          .map((g) => `- ${g.text}${g.change ? `\n    (${g.change})` : ''}`)
          .join('\n')}`
      : '\nNo squad goals are on file for this run.',
    briefingBlock,

    args.sailor
      ? [
          `\nSailor: ${args.sailor.name} (${args.sailor.role})`,
          args.ownGoal ? `Their own goal from this morning: ${args.ownGoal}` : '',
          sailorContext
            ? `\nTheir context file — who they are on the water and what they are working on:\n${sailorContext}`
            : '',
          sailorDay?.questions.length
            ? `\nWhat they were asked this morning:\n${sailorDay.questions.map((q) => `- ${q}`).join('\n')}`
            : '',
          sailorDay?.distilled.length
            ? `\nWhat they said, condensed:\n${sailorDay.distilled.map((d) => `- ${d}`).join('\n')}`
            : '',
        ].filter(Boolean).join('\n')
      : [
          teamContext
            ? `\nThe squad context file — who this team is and what it is working on:\n${teamContext}`
            : '',
          teamPicture
            ? `\nThe team picture from this morning:\n${JSON.stringify(teamPicture)}`
            : '',
        ].filter(Boolean).join('\n'),
  ].filter(Boolean).join('\n');

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
      newMessage: { role: 'user', parts: [{ text }] },
      streaming: false,
    }),
  });
  if (!res.ok) throw new Error("Could not generate questions");

  const reader = res.body?.getReader();
  if (!reader) return [];
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
        const parts = event?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text && !part.thought) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }
  const questions = parseAgentJson<{ questions: string[] }>(fullText);
  return questions.questions;
  }

  /* Freeze the version, mint a token link per sailor, open WhatsApp.
     In personal scope each link carries that sailor's own set; anyone
     without one falls back to the team questions. */
  async function handleSend(
    recipients: string[],
    scope: "team" | "personal"
  ) {
    const res = await fetch(`/api/capture-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        kind: "capture",
        scope,
        recipients,
        value,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      /* A 500 here is the backend refusing the write, and in practice it has
         been the placeholder set every time — so say the thing the coach can
         act on rather than "Upstream 500". The real error still goes to the
         console, because the cause is not actually proven and a bare friendly
         message would hide the next one that is something else. */
      if (res.status === 500) {
        console.error("[send] upstream 500:", data?.error ?? "(no detail)");
        throw new Error(
          "The questions being sent look like the placeholder set. Generate new " +
          "questions and try again.",
        );
      }
      throw new Error(data?.error ?? "Could not create the capture run");
    }

	/* The deployed origin when there is one, so a link sent from alpha opens
	   alpha. On localhost it falls back to NEXT_PUBLIC_APP_URL. */
	const base = shareBaseUrl();

    /* One link per sailor in personal scope, carrying their name — otherwise
       the response page falls back to the Clerk first name of whoever opens
       it. Popup blockers allow the first window but not the rest, so the
       others follow on a stagger. */
    const links = scope === "personal"
      ? recipients.map((name) => ({
          name,
          url: `${base}/capturing?id=${encodeURIComponent(runId)}&sailor=${encodeURIComponent(name)}`,
        }))
      : [{ name: null, url: `${base}/capturing?id=${encodeURIComponent(runId)}` }];

    links.forEach(({ name, url }, i) => {
      const text = encodeURIComponent(
        `${name ? `${name} — capture` : "Capture"} while it's fresh — a few questions. Voice or text, whatever suits.\n${url}`,
      );
      const open = () => window.open(`https://wa.me/?text=${text}`, "_blank");
      if (i === 0) open();
      else setTimeout(open, i * 600);
    });
  }

  /* Held back until the context resolves, so the screen does not offer to
     generate against a squad file and briefing it has not read yet. */
  if (!loaded || !questionsLoaded) {
    return (
      <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22, color: "#8E877A", fontSize: 13 }}>
        Loading the day&rsquo;s context…
      </div>
    );
  }

  return (
    <div className="phase-pad" style={{ background: "#F7F4ED", minHeight: "100%", padding: 22 }}>
      {!hasSent && (
        <p
          style={{
            margin: "0 0 14px",
            padding: "9px 12px",
            borderRadius: 6,
            border: "1px solid #DDD5C4",
            background: "#FFFDF8",
            color: "#6B6459",
            fontSize: 12.5,
            lineHeight: 1.45,
          }}
        >
          Nothing sent for this day yet — these are the default questions. Anything
          you send is filed against this race day and comes back when you return.
        </p>
      )}

      <Capture
        sailors={SAILORS}
        squadGoals={squadGoals}
        ownGoals={ownGoals}
        value={value}
        onChange={setValue}
        onGenerate={handleGenerate}
        onSend={handleSend}
        defaultQuestions={DEFAULT_QUESTIONS}
      />
    </div>
  );
}
