import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>

      {/* Top navigation bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <Link href="/calendar" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Cally</span>
          <span style={{ fontSize: '1.35rem', fontStyle: 'italic', color: 'var(--color-primary)', fontFamily: "'Great Vibes', cursive", letterSpacing: '0.03em', background: 'linear-gradient(90deg, #1DB954, #a8f5c8, #1DB954)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>living together</span>
        </Link>
        <button
          className="btn-ghost"
          onClick={() => router.back()}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          ← Back
        </button>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 64px', gap: 40, maxWidth: 700, margin: '0 auto', width: '100%' }}>

        {/* Portrait */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'conic-gradient(from 0deg, #1DB954, #9B59B6, #1DB954)', opacity: 0.5, animation: 'spin 6s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <img
            src="https://github.com/user-attachments/assets/20c66a0d-843c-4c14-9fc1-6aaa399d2f7c"
            alt="Cally — your personal calendar consultant"
            width={220}
            height={280}
            style={{ borderRadius: 20, objectFit: 'cover', position: 'relative', zIndex: 1, display: 'block', border: '2px solid var(--color-primary)', boxShadow: '0 0 40px rgba(29, 185, 84, 0.35)' }}
          />
        </div>

        {/* Name badge */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 6px' }}>Cally</h1>
          <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--color-primary)', margin: 0, opacity: 0.8 }}>Personal Calendar Organizer &amp; Consultant</p>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

        {/* Who is Cally */}
        <section style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Who is Cally?</h2>
          <p style={{ margin: 0, lineHeight: 1.8, fontSize: '1.05rem', color: 'var(--color-text)' }}>
            Cally is a personal calendar organizer and consultant. She knows your calendar better than you do. Have a question about your calendar? Ask Cally.
          </p>
        </section>

        {/* Couple-linking superpower */}
        <section style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>💚 Linked Calendars — Her Greatest Power</h2>
          <p style={{ margin: 0, lineHeight: 1.8, fontSize: '1.05rem', color: 'var(--color-text)' }}>
            Cally&apos;s most remarkable ability is bridging the gap between two schedules and turning them into one living, breathing plan. When you pair your calendar with your significant other&apos;s, Cally instantly sees both worlds at once — your commitments, their commitments, and every shared moment that sits between them. She highlights conflicts before they become arguments, surfaces windows of free time you didn&apos;t know you both had, and colour-codes each partner&apos;s events so the shared view is always crystal-clear at a glance. Whether it&apos;s a dinner reservation you almost double-booked or a rare weekend that&apos;s magically open for the two of you, Cally spots it first.
          </p>
        </section>

        {/* Call to action */}
        <Link
          href="/calendar"
          style={{
            display: 'inline-block',
            background: 'var(--color-primary)',
            color: '#000',
            fontWeight: 700,
            fontSize: '1rem',
            padding: '14px 32px',
            borderRadius: 'var(--radius-btn)',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.85')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
        >
          Open My Calendar
        </Link>
      </main>
    </div>
  );
}
