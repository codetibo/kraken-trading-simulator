/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SideSelector } from '@/components/trade/order-entry/SideSelector';

// Mock the Kbd component from shadcn
jest.mock('@/components/ui/kbd', () => ({
  Kbd: ({ children }: { children: React.ReactNode }) => (
    <kbd data-testid='mock-kbd'>{children}</kbd>
  ),
}));

describe('SideSelector', () => {
  it('renders Buy and Sell buttons', () => {
    render(<SideSelector side='BUY' onSideChange={() => {}} />);

    expect(screen.getByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('Sell')).toBeInTheDocument();
  });

  it('highlights the selected side as BUY', () => {
    render(<SideSelector side='BUY' onSideChange={() => {}} />);

    const buyButton = screen.getByText('Buy').closest('button');
    const sellButton = screen.getByText('Sell').closest('button');

    expect(buyButton).toHaveClass('bg-positive/20');
    expect(sellButton).not.toHaveClass('bg-negative/20');
  });

  it('highlights the selected side as SELL', () => {
    render(<SideSelector side='SELL' onSideChange={() => {}} />);

    const buyButton = screen.getByText('Buy').closest('button');
    const sellButton = screen.getByText('Sell').closest('button');

    expect(sellButton).toHaveClass('bg-negative/20');
    expect(buyButton).not.toHaveClass('bg-positive/20');
  });

  it('calls onSideChange when Buy is clicked', async () => {
    const user = userEvent.setup();
    const onSideChange = jest.fn();

    render(<SideSelector side='SELL' onSideChange={onSideChange} />);

    await user.click(screen.getByText('Buy'));
    expect(onSideChange).toHaveBeenCalledWith('BUY');
  });

  it('calls onSideChange when Sell is clicked', async () => {
    const user = userEvent.setup();
    const onSideChange = jest.fn();

    render(<SideSelector side='BUY' onSideChange={onSideChange} />);

    await user.click(screen.getByText('Sell'));
    expect(onSideChange).toHaveBeenCalledWith('SELL');
  });

  it('shows a checkmark on the active side', () => {
    render(<SideSelector side='BUY' onSideChange={() => {}} />);

    expect(screen.getByText(/\u2713/)).toBeInTheDocument();
  });

  it('shows keyboard shortcut labels', () => {
    render(<SideSelector side='BUY' onSideChange={() => {}} />);

    const kbds = screen.getAllByTestId('mock-kbd');
    expect(kbds.length).toBe(2);
  });
});
