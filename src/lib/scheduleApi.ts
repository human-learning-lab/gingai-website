import type { ScheduleEvent } from '@/types/schedule';
import type { Block } from '@/types';

const LS_KEY = (regattaId: string, day: number) => `schedule:${regattaId}:${day}`;

// ── Backend API ───────────────────────────────────────────────────────────────

export async function loadSchedule(regattaId: string, day: number): Promise<ScheduleEvent[] | null> {
  try {
    const res = await fetch(`/api/schedule?regatta=${encodeURIComponent(regattaId)}&day=${day}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Refresh local cache
        _lsSet(regattaId, day, data);
        return data as ScheduleEvent[];
      }
    }
  } catch {
    // Network unavailable — fall through to local cache
  }

  // Fallback: local cache
  return _lsGet(regattaId, day);
}

export async function saveSchedule(regattaId: string, day: number, events: ScheduleEvent[]): Promise<void> {
  // Optimistically write to local cache immediately so UI is never stale
  _lsSet(regattaId, day, events);

  try {
    await fetch(`/api/schedule?regatta=${encodeURIComponent(regattaId)}&day=${day}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    });
  } catch {
    // Silently ignore — local cache is the source of truth until next sync
  }
}

// ── Local cache helpers ───────────────────────────────────────────────────────

function _lsGet(regattaId: string, day: number): ScheduleEvent[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LS_KEY(regattaId, day));
    return raw ? (JSON.parse(raw) as ScheduleEvent[]) : null;
  } catch { return null; }
}

function _lsSet(regattaId: string, day: number, events: ScheduleEvent[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LS_KEY(regattaId, day), JSON.stringify(events));
  } catch { /* quota */ }
}

// ── ID helper ─────────────────────────────────────────────────────────────────

let _uid = 0;
export function newId(): string {
  return `sev-${Date.now()}-${++_uid}`;
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

export function seedFromBlocks(blocks: Block[]): ScheduleEvent[] {
  return blocks.map(b => ({
    id: b.id,
    time: b.time,
    label: b.name,
    tag: b.tag ?? '',
    tagColor: b.tagColor,
    panelKey: b.panel !== 'future' ? b.panel : undefined,
    tZeroOffset: b.tZeroOffset,
  }));
}

export function seedFromAgenda(
  items: { time: string; title: string; tag?: string; tagColor?: string }[],
): ScheduleEvent[] {
  return items
    .filter(i => i.tag !== 'Hotel' && i.tag !== 'Venue')
    .map((item, idx) => ({
      id: `agenda-${idx}`,
      time: item.time,
      label: item.title,
      tag: item.tag ?? '',
      tagColor: item.tagColor,
    }));
}
