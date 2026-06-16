import type { Transcript, TranscriptLine } from '@/data/transcripts';

interface ApiRace {
  raceid: number;
  eventid: number;
  racenum: number;
  team: string;
  content: string;
}

interface ApiDebrief {
  debriefid: number;
  event: string;
  content: string;
}

interface ApiCapture {
  captureid: number;
  username: string;
  content: string;
}

interface ApiUpload{
  uploadid: number;
  username: string;
  title: string;
  content: string;
}

interface ApiEvent {
  eventid: number;
  name: string;
  season: number;
}

function parseContent(content: string, defaultSpeaker: string): TranscriptLine[] {
  const lines = content.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < 40) {
      return {
        speaker: line.slice(0, colonIdx).trim(),
        text: line.slice(colonIdx + 1).trim(),
      };
    }
    return { speaker: defaultSpeaker, text: line.trim() };
  });
}

/** Parse "source-id" → { type, numericId } — only for DB-backed transcripts */
function parseDbId(id: string): { type: string; numericId: string } | null {
  const match = id.match(/^(race|capture|debrief)-(\d+)$/);
  if (!match) return null;
  return { type: match[1], numericId: match[2] };
}

function linesToContent(lines: TranscriptLine[]): string {
  return lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
}

export async function deleteTranscript(id: string): Promise<void> {
  const parsed = parseDbId(id);
  if (!parsed) return; // local-only (live capture / upload), nothing to delete in DB
  const res = await fetch(`/api/transcripts?type=${parsed.type}&id=${parsed.numericId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export async function updateTranscript(t: Transcript): Promise<void> {
  const parsed = parseDbId(t.id);
  if (!parsed) return; // local-only, nothing to persist
  const content = linesToContent(t.lines);

  let body: Record<string, unknown>;
  if (parsed.type === 'race') {
    const raceNum = parseInt(t.race.replace(/\D/g, '')) || 0;
    body = { eventid: 0, racenum: raceNum, team: t.team, content };
  } else if (parsed.type === 'capture') {
    body = { user: t.team || 'unknown', text: content };
  } else {
    body = { event: t.regatta || t.title, summary: t.title, content, metadata: {} };
  }

  const res = await fetch(`/api/transcripts?type=${parsed.type}&id=${parsed.numericId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Update failed (${res.status})`);
}

export async function fetchAllTranscripts(): Promise<Transcript[]> {
  const res = await fetch('/api/transcripts', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load (${res.status})`);

  const { races, debriefs, captures, uploads, events, error } = await res.json();
  if (error) throw new Error(error);

  const eventMap = new Map<number, string>(
    (events as ApiEvent[]).map(e => [e.eventid, e.name + " S" + e.season])
  );

  const raceTranscripts: Transcript[] = (races as ApiRace[]).map(r => ({
    id: `race-${r.raceid}`,
    source: 'race',
    regatta: eventMap.get(r.eventid) ?? `Event ${r.eventid}`,
    race: `R${r.racenum}`,
    team: r.team,
    title: 'Post-Race Debrief',
    duration: '—',
    lines: parseContent(r.content, r.team),
  }));

  const debriefTranscripts: Transcript[] = (debriefs as ApiDebrief[]).map(d => ({
    id: `debrief-${d.debriefid}`,
    source: 'debrief',
    regatta: d.event,
    race: '',
    team: '',
    title: d.event,
    duration: '—',
    lines: parseContent(d.content, d.event),
  }));

  const captureTranscripts: Transcript[] = (captures as ApiCapture[]).map(c => ({
    id: `capture-${c.captureid}`,
    source: 'capture',
    regatta: '',
    race: '',
    team: c.username,
    title: c.username,
    duration: '—',
    lines: parseContent(c.content, c.username),
  }));


  const uploadTranscripts: Transcript[] = (uploads as ApiUpload[]).map(c => ({
	id: `upload-${c.uploadid}`,
    source: 'upload',
    regatta: '',
    race: '',
    team: c.username,
    title: c.title,
    duration: '—',
    lines: parseContent(c.content, c.username),
  }));

  return [...raceTranscripts, ...debriefTranscripts, ...captureTranscripts, ...uploadTranscripts];
}
