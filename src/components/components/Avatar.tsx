interface AvatarProps {
  src?: string;
  initial: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export default function Avatar({ src, initial, size = 28, className, style, alt }: AvatarProps) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? initial}
        style={base}
        className={className}
        onError={e => {
          const el = e.currentTarget;
          el.style.display = 'none';
          const sibling = el.nextElementSibling as HTMLElement | null;
          if (sibling) sibling.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div
      className={className ?? 'rp-ava'}
      style={{ ...base, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: Math.max(8, size * 0.38), color: '#fff', background: 'var(--green)' }}
    >
      {initial}
    </div>
  );
}
