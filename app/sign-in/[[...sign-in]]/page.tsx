import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: '40px 24px',
    }}>
      {/* Brand header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: '0.04em',
          lineHeight: 1,
          marginBottom: 8,
        }}>
          Ging<span style={{ color: 'var(--green)' }}>AI</span>
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text4)',
          marginBottom: 4,
        }}>
          Mubadala Brazil SailGP · 2026
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
          Team intelligence &amp; debrief platform
        </div>
      </div>

      {/* Clerk sign-in component */}
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#009B3A',
            colorBackground: '#F7F2EA',
            colorInputBackground: '#ffffff',
            colorText: '#1A1610',
            colorInputText: '#1A1610',
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: '8px',
          },
          elements: {
            card: {
              boxShadow: '0 4px 24px rgba(10,22,40,0.10)',
              border: '1px solid #CFC4B0',
            },
            headerTitle: {
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '22px',
              letterSpacing: '0.02em',
            },
            headerSubtitle: {
              color: '#6B5F4E',
            },
            socialButtonsBlockButton: {
              border: '1px solid #CFC4B0',
              background: '#ffffff',
            },
          },
        }}
      />

      <div style={{
        fontSize: 11,
        color: 'var(--text4)',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 1.6,
      }}>
        Access is restricted to the Brazil SailGP team.
        Sign in with your team Google account.
      </div>
    </div>
  );
}
