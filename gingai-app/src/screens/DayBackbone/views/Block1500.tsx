const EXERCISES = [
  { name: 'Lacrosse Ball — Foot',         vid: '1gAVanUJVtQ', url: 'https://youtu.be/1gAVanUJVtQ' },
  { name: 'Calf Foam Roll',               vid: 'zn1tcngoD8U', url: 'https://youtu.be/zn1tcngoD8U' },
  { name: 'Hip Flexor Stretch',           vid: 'kFTBp0DCxaM', url: 'https://youtu.be/kFTBp0DCxaM' },
  { name: 'Thoracic Rotation',            vid: 'lqkQ5iRL-t4', url: 'https://youtu.be/lqkQ5iRL-t4' },
  { name: 'Band Pull-Apart',              vid: 'rr76JqLCUX4', url: 'https://youtu.be/rr76JqLCUX4' },
  { name: 'Glute Bridge',                 vid: '8bbE64NuDTU', url: 'https://youtu.be/8bbE64NuDTU' },
  { name: 'Deep Squat Hold',              vid: 'HMIaFYVJi0c', url: 'https://youtu.be/HMIaFYVJi0c' },
  { name: 'Cat-Cow Mobilisation',         vid: '6mJFI-mNsD8', url: 'https://youtu.be/6mJFI-mNsD8' },
  { name: 'Shoulder Circle Warm-Up',      vid: '3YQIG7fLLBE', url: 'https://youtu.be/3YQIG7fLLBE' },
  { name: 'Leg Swing — Front & Lateral',  vid: 'ZNrKkq4vIDk', url: 'https://youtu.be/ZNrKkq4vIDk' },
];

export default function Block1500() {
  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 16 }}>
        15:00 — Warm Up
      </div>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Exercise Library</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text2)' }}>
        10 pre-race mobility exercises. Tap any card to watch the video.
      </p>
      <div className="warmup-grid">
        {EXERCISES.map(ex => (
          <button
            key={ex.vid}
            className="warmup-card"
            onClick={() => window.open(ex.url, '_blank', 'noopener')}
          >
            <div className="warmup-thumb">
              <img
                src={`https://img.youtube.com/vi/${ex.vid}/hqdefault.jpg`}
                alt={ex.name}
                loading="lazy"
              />
              <div className="warmup-play">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
            <div className="warmup-name">{ex.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
