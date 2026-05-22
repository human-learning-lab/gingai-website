'use client';

import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  hint: string;
}

export default function EmptyBlock({ icon, title, hint }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      gap: 10, padding: '32px 0',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'var(--bg3)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text4)',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.6, maxWidth: 340 }}>{hint}</div>
    </div>
  );
}
