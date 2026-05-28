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

interface ApiEvent {
  eventid: number;
  name: string;
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

export async function fetchAllTranscripts(): Promise<Transcript[]> {
  const res = await fetch('/api/transcripts', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load (${res.status})`);

  const { races, debriefs, captures, events, error } = await res.json();
  if (error) throw new Error(error);

  const eventMap = new Map<number, string>(
    (events as ApiEvent[]).map(e => [e.eventid, e.name])
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

  return [...raceTranscripts, ...debriefTranscripts, ...captureTranscripts];
}
