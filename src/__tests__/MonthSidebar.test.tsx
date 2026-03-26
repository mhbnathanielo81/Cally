import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthSidebar from '@/components/MonthSidebar';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const baseProps = {
  selectedMonth: 3,
  selectedYear: 2026,
  onMonthChange: jest.fn(),
  onYearChange: jest.fn(),
};

afterEach(() => jest.clearAllMocks());

describe('MonthSidebar', () => {
  it('renders all 12 month buttons', () => {
    render(<MonthSidebar {...baseProps} />);
    MONTHS.forEach((m) => {
      expect(screen.getByText(m)).toBeInTheDocument();
    });
  });

  it('renders a year selector with the current year selected', () => {
    render(<MonthSidebar {...baseProps} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('2026');
  });

  it('calls onMonthChange with the correct month when a month button is clicked', () => {
    render(<MonthSidebar {...baseProps} />);
    fireEvent.click(screen.getByText('Jun'));
    expect(baseProps.onMonthChange).toHaveBeenCalledWith(6);
  });

  it('calls onYearChange when a different year is selected', () => {
    render(<MonthSidebar {...baseProps} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2027' } });
    expect(baseProps.onYearChange).toHaveBeenCalledWith(2027);
  });

  it('shows the year dropdown with 5 consecutive years', () => {
    render(<MonthSidebar {...baseProps} />);
    const select = screen.getByRole('combobox');
    const options = Array.from((select as HTMLSelectElement).options).map((o) => Number(o.value));
    expect(options).toHaveLength(5);
    for (let i = 1; i < options.length; i++) {
      expect(options[i]).toBe(options[i - 1] + 1);
    }
  });
});
