import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

interface Props {
  open: boolean;
  onClose: () => void;
  onPairCalendar: () => void;
  onHistory: () => void;
}

export default function SidebarMenu({ open, onClose, onPairCalendar, onHistory }: Props) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const menuItems = [
    {
      label: 'Home',
      icon: '🏠',
      onClick: () => { onClose(); router.push('/calendar'); },
    },
    {
      label: 'Pair Calendar',
      icon: '💚',
      onClick: () => { onClose(); onPairCalendar(); },
    },
    {
      label: 'History',
      icon: '📋',
      onClick: () => { onClose(); onHistory(); },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: 'var(--color-surface)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 20px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        {/* Drawer header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--color-primary)',
          }}>
            Cally
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Menu items */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text)',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
