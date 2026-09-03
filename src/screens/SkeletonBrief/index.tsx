"use client";

import { useEffect, useState } from "react";
import { Sailor } from "@/types"
import SkeletonBrief, {
  type SkeletonBriefValue,
} from "./SkeletonBrief";
import { teamSailors } from '@/data/roles.hll';
import { shareBaseUrl } from '@/lib/appUrl';

/* ============================================================
   Example wiring. Replace the local state with your own
   fetch/save, and the two handlers with real API calls.
   ============================================================ */

const BASE_SAILORS: Sailor[] = [
  { id: "mar", name: "Martine", role: "Helm" },
  { id: "pau", name: "Paul", role: "Strategist" },
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

const DEFAULT_QUESTIONS = [
  "What should be the team's area of focus tomorrow?",
  "What are your uncertainties?",
  "What are your personal goals for the day?",
];

const DEFAULT_PROMPT = `Generate priming questions for a SailGP sailor ahead of a race day.

Draw on: the forecast, expected course, boat configuration, and the action
items carried forward from the last debrief.

Rules:
- Ask what the sailor already knows. Do not teach or suggest answers.
- Exactly three questions, no more and no fewer.
- Each must be answerable in under a minute of speaking.
- Plain language. No jargon the sailor wouldn't use themselves.`;

/* Starts empty on purpose. Per SkeletonBriefValue, an absent entry means the
   sailor falls back to the team set; pre-filling every sailor with the
   defaults meant a team-scope edit never reached them. */
const emptyPersonal: SkeletonBriefValue["personal"] = {};

// GingaAI agent apis
const AGENT_BASE = '/api/agent';
const APP_NAME = 'generate_questions';

export default function SkeletonBriefPage({
  runId
}: {
  runId: string
}) {
  const [value, setValue] = useState<SkeletonBriefValue>({
    teamQuestions: [...DEFAULT_QUESTIONS],
	teamPrompt: DEFAULT_PROMPT,
    personal: emptyPersonal,
  });
  const [loaded, setLoaded] = useState(false);
  /* Whether this race day has anything on file. Nothing is a normal state — a
     day not yet briefed — but the screen otherwise shows the built-in defaults,
     which is indistinguishable from a set that failed to load. */
  const [hasSent, setHasSent] = useState(false);

  /* What was actually sent for this run. Only sent sets are filed — the mirror
     runs on the send path, never on generate — so reopening shows what the
     sailors received rather than the last draft.

     A sailor marked fromTeamSet was sent the team set, so they are deliberately
     left out of `personal`: an absent entry means they fall back to the team
     questions, and writing one would turn a shared set into a personal override
     that the coach never made. */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/day-questions?runId=${encodeURIComponent(runId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setLoaded(true); return; }
        const day = await res.json().catch(() => null);
        if (!day || cancelled) { setLoaded(true); return; }
        setHasSent(true);

        const personal: SkeletonBriefValue["personal"] = {};
        for (const [name, set] of Object.entries(day.sailors ?? {})) {
          const s = set as { questions?: string[]; prompt?: string; fromTeamSet?: boolean };
          if (s.fromTeamSet || !s.questions?.length) continue;
          personal[name] = { questions: s.questions, prompt: s.prompt ?? DEFAULT_PROMPT };
        }

        setValue({
          teamQuestions: day.teamQuestions?.length ? day.teamQuestions : [...DEFAULT_QUESTIONS],
          teamPrompt: day.teamPrompt || DEFAULT_PROMPT,
          personal,
        });
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [runId]);

  /* Ask the model for questions. Server route keeps the API key off the client. */
  async function handleGenerate({
    prompt,
    scope,
    sailor,
  }: {
    prompt: string;
    scope: "team" | "personal";
    sailor?: Sailor;
  }): Promise<string[]> {
  /* Both scopes are written against a context file: the sailor's for personal,
     the squad's for team. Without one there is nothing to write against, so
     fail rather than quietly producing generic questions that read as though
     they were informed. */
  const isPersonal = scope === 'personal';
  if (isPersonal && !sailor) throw new Error('Select a sailor first.');

  const profileRes = await fetch(
    isPersonal
      ? `/api/sailor-profile?sailor=${encodeURIComponent(sailor!.name)}`
      : '/api/team-profile',
  );
  const data = await profileRes.json().catch(() => null);
  if (!profileRes.ok) {
    throw new Error(
      data?.error ??
        (isPersonal
          ? `No profile on file for ${sailor!.name}.`
          : 'No team context file on file.'),
    );
  }
  const profile = data.content as string;

  const text = isPersonal
    ? `${prompt}\n\nWrite these questions for ${sailor!.name} specifically, using their context file below. Draw on what they are actually working on, in their own language.\n\nTHEIR CONTEXT FILE:\n${profile}`
    : `${prompt}\n\nWrite these questions for the squad as a whole, using the team context file below. Draw on the shared development areas and the themes the squad converges on. Where the file records a divergence, a question may probe it — do not resolve it.\n\nTEAM CONTEXT FILE:\n${profile}`;

  const sessionId = `summarize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = 'user-1';

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
          if (typeof part.text === 'string' && part.text) fullText += part.text;
        }
      } catch { /* skip non-JSON lines */ }
    }
  }
  const { questions } = JSON.parse(fullText) as { questions: string[] };

  /* Not filed here. A generated set is a draft — it reaches Firestore when the
     coach sends it, mirrored from /api/capture-runs, so what is on record is
     what the sailors were actually asked. */
  return questions;
  }

  /* Freeze the version, mint one token link per sailor, open WhatsApp. */
  async function handleSend(
	runId: string,
    recipients: string[],
    scope: "team" | "personal"
  ) {
    const res = await fetch("/api/capture-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({runId, kind: "priming", scope, recipients, value }),
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
	   alpha. On localhost it falls back to NEXT_PUBLIC_APP_URL — a localhost
	   link is not something the recipient can open. */
	const base = shareBaseUrl();

    /* In personal scope each sailor gets their own link, carrying their name.
       Without it the response page falls back to the Clerk first name of
       whoever opens it, so a forwarded link — or a second person on the same
       device — answers against someone else's questions.

       wa.me opens WhatsApp with the message ready; no business account
       needed. Popup blockers allow the first window without a gesture but
       not the rest, so the others follow on a short stagger. */
    const links = scope === "personal"
      ? recipients.map((name) => ({
          name,
          url: `${base}/priming?id=${encodeURIComponent(runId)}&sailor=${encodeURIComponent(name)}`,
        }))
      : [{ name: null, url: `${base}/priming?id=${encodeURIComponent(runId)}` }];

    links.forEach(({ name, url }, i) => {
      const text = encodeURIComponent(
        `${name ? `${name} — priming` : "Priming"} for tomorrow — three quick questions. Voice or text, whatever suits.\n${url}`,
      );
      const open = () => window.open(`https://wa.me/?text=${text}`, "_blank");
      if (i === 0) open();
      else setTimeout(open, i * 600);
    });
  }

  /* Held back until the fetch resolves, so a run with questions already sent
     does not flash the defaults before filling in. */
  if (!loaded) {
    return (
      <div style={{ background: "#F7F4ED", minHeight: "100%", padding: 22, color: "#8E877A", fontSize: 13 }}>
        Loading the question sets…
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

      <SkeletonBrief
	    runId={runId}
        sailors={SAILORS}
        value={value}
        onChange={setValue}
        onGenerate={handleGenerate}
        onSend={handleSend}
        defaultQuestions={DEFAULT_QUESTIONS}
        hasResponses={false}
      />
    </div>
  );
}
