'use client';

import { useClerk } from '@clerk/nextjs';

export default function PendingPage() {
  const { signOut } = useClerk();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 40, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1,
      }}>
        Ging<span style={{ color: 'var(--green)' }}>AI</span>
      </div>

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '32px 28px', maxWidth: 360,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--yg)', border: '1px solid var(--yb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--yellow)', fontSize: 22,
        }}>
          ⏳
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 800, letterSpacing: '0.02em',
          marginBottom: 10,
        }}>
          Access Pending
        </div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
          You&apos;re signed in, but your team role hasn&apos;t been configured yet.
          Contact the team admin to get access assigned.
        </div>
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          style={{
            height: 38, padding: '0 20px', borderRadius: 6,
            border: '1px solid var(--line2)', background: 'transparent',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: 'var(--text2)', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text4)' }}>
        Mubadala Brazil SailGP · GingAI · 2026
      </div>
    </div>
  );
}
