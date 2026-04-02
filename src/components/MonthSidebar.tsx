const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  selectedMonth: number; // 1-indexed
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export default function MonthSidebar({ selectedMonth, selectedYear, onMonthChange, onYearChange }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <aside style={{ width: 76, display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 4px', borderLeft: '1px solid var(--color-border)', minHeight: '100%' }}>
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(Number(e.target.value))}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-btn)', padding: '4px 4px', color: 'var(--color-text)', marginBottom: 6, width: '100%', fontSize: '0.8rem' }}
      >
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      {MONTHS.map((m, i) => {
        const month = i + 1;
        const active = month === selectedMonth;
        return (
          <button
            key={m}
            onClick={() => onMonthChange(month)}
            style={{
              background: active ? 'var(--color-primary)' : 'transparent',
              color: active ? '#000' : 'var(--color-text)',
              fontWeight: active ? 700 : 400,
              border: '1px solid ' + (active ? 'var(--color-primary)' : 'transparent'),
              borderRadius: 'var(--radius-btn)',
              padding: '4px 0',
              fontSize: '0.78rem',
              transition: 'all 0.15s',
            }}
          >
            {m}
          </button>
        );
      })}
    </aside>
  );
}
