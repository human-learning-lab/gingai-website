// Tidal stream predictions — Governors Island, New York
// Position: 40°41.4N 74°01.8W  Source: Admiralty Total Tide V23,1,0,110

export type TideEntry = { time: string; speed: number; dir: number };
export type TideDay   = { date: string; entries: TideEntry[] };

export const NYC_TIDES: TideDay[] = [
  {
    date: '2026-05-29',
    entries: [
      { time: '12:00', speed: 1.7, dir: 205 }, { time: '12:20', speed: 1.7, dir: 205 },
      { time: '12:40', speed: 1.5, dir: 205 }, { time: '13:00', speed: 1.4, dir: 205 },
      { time: '13:20', speed: 1.4, dir: 205 }, { time: '13:40', speed: 1.3, dir: 205 },
      { time: '14:00', speed: 1.1, dir: 205 }, { time: '14:20', speed: 1.0, dir: 205 },
      { time: '14:40', speed: 0.8, dir: 205 }, { time: '15:00', speed: 0.5, dir: 205 },
      { time: '15:20', speed: 0.2, dir: 205 }, { time: '15:40', speed: 0.1, dir: 30  },
      { time: '16:00', speed: 0.3, dir: 30  }, { time: '16:20', speed: 0.5, dir: 30  },
      { time: '16:40', speed: 0.7, dir: 30  }, { time: '17:00', speed: 0.8, dir: 30  },
      { time: '17:20', speed: 1.0, dir: 30  }, { time: '17:40', speed: 1.1, dir: 30  },
      { time: '18:00', speed: 1.1, dir: 30  },
    ],
  },
  {
    date: '2026-05-30',
    entries: [
      { time: '12:00', speed: 1.4, dir: 205 }, { time: '12:20', speed: 1.5, dir: 205 },
      { time: '12:40', speed: 1.6, dir: 205 }, { time: '13:00', speed: 1.6, dir: 205 },
      { time: '13:20', speed: 1.4, dir: 205 }, { time: '13:40', speed: 1.4, dir: 205 },
      { time: '14:00', speed: 1.3, dir: 205 }, { time: '14:20', speed: 1.2, dir: 205 },
      { time: '14:40', speed: 1.1, dir: 205 }, { time: '15:00', speed: 0.9, dir: 205 },
      { time: '15:20', speed: 0.7, dir: 205 }, { time: '15:40', speed: 0.5, dir: 205 },
      { time: '16:00', speed: 0.2, dir: 205 }, { time: '16:20', speed: 0.1, dir: 30  },
      { time: '16:40', speed: 0.3, dir: 30  }, { time: '17:00', speed: 0.5, dir: 30  },
      { time: '17:20', speed: 0.7, dir: 30  }, { time: '17:40', speed: 0.8, dir: 30  },
      { time: '18:00', speed: 0.9, dir: 30  },
    ],
  },
  {
    date: '2026-05-31',
    entries: [
      { time: '12:00', speed: 1.0, dir: 205 }, { time: '12:20', speed: 1.2, dir: 205 },
      { time: '12:40', speed: 1.3, dir: 205 }, { time: '13:00', speed: 1.4, dir: 205 },
      { time: '13:20', speed: 1.5, dir: 205 }, { time: '13:40', speed: 1.5, dir: 205 },
      { time: '14:00', speed: 1.4, dir: 205 }, { time: '14:20', speed: 1.3, dir: 205 },
      { time: '14:40', speed: 1.2, dir: 205 }, { time: '15:00', speed: 1.1, dir: 205 },
      { time: '15:20', speed: 1.0, dir: 205 }, { time: '15:40', speed: 0.9, dir: 205 },
      { time: '16:00', speed: 0.7, dir: 205 }, { time: '16:20', speed: 0.4, dir: 205 },
      { time: '16:40', speed: 0.1, dir: 205 }, { time: '17:00', speed: 0.1, dir: 30  },
      { time: '17:20', speed: 0.3, dir: 30  }, { time: '17:40', speed: 0.5, dir: 30  },
      { time: '18:00', speed: 0.6, dir: 30  },
    ],
  },
];

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Returns interpolated tide at `now`, or null if no data for today. */
export function getTideNow(now: Date = new Date()): {
  speed: number; dir: number; turningAt: string | null;
} | null {
  const dateStr = now.toISOString().slice(0, 10);
  const day = NYC_TIDES.find(d => d.date === dateStr);
  if (!day) return null;

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const entries = day.entries;

  // Find surrounding entries for interpolation
  let lo = entries[0], hi = entries[entries.length - 1];
  for (let i = 0; i < entries.length - 1; i++) {
    if (toMins(entries[i].time) <= nowMins && nowMins < toMins(entries[i + 1].time)) {
      lo = entries[i]; hi = entries[i + 1]; break;
    }
  }
  const loM = toMins(lo.time), hiM = toMins(hi.time);
  const frac = hiM > loM ? (nowMins - loM) / (hiM - loM) : 0;
  const speed = Math.round((lo.speed + frac * (hi.speed - lo.speed)) * 10) / 10;
  const dir   = lo.dir; // direction doesn't interpolate well across a turn

  // Find next direction change (slack water)
  const futureEntries = entries.filter(e => toMins(e.time) > nowMins);
  let turningAt: string | null = null;
  for (let i = 0; i < futureEntries.length - 1; i++) {
    if (futureEntries[i].dir !== futureEntries[i + 1].dir) {
      turningAt = futureEntries[i + 1].time;
      break;
    }
  }

  return { speed, dir, turningAt };
}
