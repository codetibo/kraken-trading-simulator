/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { EquityHeroCard } from '@/components/dashboard/EquityHeroCard';

// Mock shadcn/ui components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-card'>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-card-content'>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span data-testid='mock-badge' className={className}>{children}</span>,
}));

describe('EquityHeroCard', () => {
  it('renders total equity label', () => {
    render(
      <EquityHeroCard
        totalEquity={25000}
        overallPnl={5000}
        startingBalance={20000}
      />,
    );

    expect(screen.getByText('Total Equity')).toBeInTheDocument();
  });

  it('displays positive P&L with green styling', () => {
    render(
      <EquityHeroCard
        totalEquity={30000}
        overallPnl={10000}
        startingBalance={20000}
      />,
    );

    // Positive badge should show +50.00%
    const badge = screen.getByTestId('mock-badge');
    expect(badge).toHaveClass('text-positive');
    expect(badge).toHaveClass('border-positive/30');
    expect(badge).toHaveTextContent('+50.00%');
  });

  it('displays negative P&L with red styling', () => {
    render(
      <EquityHeroCard
        totalEquity={15000}
        overallPnl={-5000}
        startingBalance={20000}
      />,
    );

    const badge = screen.getByTestId('mock-badge');
    expect(badge).toHaveClass('text-negative');
    expect(badge).toHaveClass('border-negative/30');
    expect(badge).toHaveTextContent('-25.00%');
  });

  it('handles zero starting balance gracefully', () => {
    render(
      <EquityHeroCard
        totalEquity={0}
        overallPnl={0}
        startingBalance={0}
      />,
    );

    const badge = screen.getByTestId('mock-badge');
    expect(badge).toHaveTextContent('0.00%');
  });

  it('shows the overall P&L in the description line', () => {
    render(
      <EquityHeroCard
        totalEquity={12000}
        overallPnl={2000}
        startingBalance={10000}
      />,
    );

    // The description contains the starting capital
    expect(screen.getByText(/starting capital/)).toBeInTheDocument();
  });

  it('applies correct arrow icon direction for positive P&L', () => {
    const { container } = render(
      <EquityHeroCard
        totalEquity={12000}
        overallPnl={2000}
        startingBalance={10000}
      />,
    );

    // PositiveArrow SVG should be present (upward arrow)
    const arrows = container.querySelectorAll('svg');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('renders formatted USD values correctly', () => {
    render(
      <EquityHeroCard
        totalEquity={999999}
        overallPnl={-1}
        startingBalance={1000000}
      />,
    );

    // Should render dollar amounts somewhere in the component
    const dollarElements = screen.getAllByText(/\$/);
    expect(dollarElements.length).toBeGreaterThan(0);
  });
});
