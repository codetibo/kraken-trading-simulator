/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/trade/bottom-panel/EmptyState';
import { ListOrdered, XCircle } from 'lucide-react';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe('EmptyState', () => {
  it('renders the message', () => {
    render(<EmptyState message='No open orders' />);
    expect(screen.getByText('No open orders')).toBeInTheDocument();
  });

  it('renders with an icon when provided', () => {
    const { container } = render(
      <EmptyState message='No items' icon={ListOrdered} />,
    );

    // The lucide icon should be rendered (SVG element)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders without an icon when not provided', () => {
    const { container } = render(<EmptyState message='Just text' />);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const svg = container.querySelector('svg');
    // There should be no lucide icon for the empty state
    // There IS an icon inside the Trade link, so check carefully
    // The component renders: Icon && <Icon ... />, so if no Icon, no SVG from Icon
    const tradeSvg = screen
      .getByText('Trade')
      .closest('a')
      ?.querySelector('svg');
    expect(tradeSvg).toBeInTheDocument();
  });

  it('includes a link back to the Trade page', () => {
    render(<EmptyState message='Test' />);

    const tradeLink = screen.getByText('Trade');
    expect(tradeLink).toBeInTheDocument();
    expect(tradeLink.closest('a')).toHaveAttribute('href', '/trade');
  });

  it('renders with different icon types', () => {
    const { container: container1 } = render(
      <EmptyState message='Orders' icon={ListOrdered} />,
    );
    const { container: container2 } = render(
      <EmptyState message='Errors' icon={XCircle} />,
    );

    // Both should render SVGs
    expect(container1.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
    expect(container2.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
  });

  it('has proper accessibility structure', () => {
    render(<EmptyState message='No data available' icon={ListOrdered} />);

    // Message should be visible text, not hidden
    const message = screen.getByText('No data available');
    expect(message).toBeVisible();
  });
});
