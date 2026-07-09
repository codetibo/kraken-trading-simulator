/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { OrderSettings } from '@/components/trade/order-entry/OrderSettings';

const defaultProps = {
  orderType: 'LIMIT' as const,
  postOnly: false,
  timeInForce: 'GTC' as const,
  triggerType: 'LAST_PRICE' as const,
  selectedPositionId: '',
  openPositions: [] as Array<{ id: string; assetSymbol: string; side: string; size: number }>,
  onPostOnlyChange: jest.fn(),
  onTimeInForceChange: jest.fn(),
  onTriggerTypeChange: jest.fn(),
  onSelectedPositionIdChange: jest.fn(),
  onRefreshPositions: jest.fn<() => Promise<void>>(),
};

describe('OrderSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders TimeInForce and TriggerType for LIMIT orders', () => {
    render(<OrderSettings {...defaultProps} orderType='LIMIT' />);

    expect(screen.getByText('Time In Force')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
  });

  it('renders TimeInForce and TriggerType for STOP_LOSS orders', () => {
    render(<OrderSettings {...defaultProps} orderType='STOP_LOSS' />);

    expect(screen.getByText('Time In Force')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
  });

  it('renders TimeInForce and TriggerType for TAKE_PROFIT orders', () => {
    render(<OrderSettings {...defaultProps} orderType='TAKE_PROFIT' />);

    expect(screen.getByText('Time In Force')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
  });

  it('renders TimeInForce and TriggerType for STOP_LOSS_LIMIT orders', () => {
    render(<OrderSettings {...defaultProps} orderType='STOP_LOSS_LIMIT' />);

    expect(screen.getByText('Time In Force')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
  });

  it('renders TimeInForce and TriggerType for TAKE_PROFIT_LIMIT orders', () => {
    render(<OrderSettings {...defaultProps} orderType='TAKE_PROFIT_LIMIT' />);

    expect(screen.getByText('Time In Force')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
  });

  it('renders TimeInForce and TriggerType for OCO orders', () => {
    render(<OrderSettings {...defaultProps} orderType='OCO' />);

    expect(screen.getByText('Time In Force')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
  });

  it('does NOT render TimeInForce/TriggerType for MARKET orders', () => {
    render(<OrderSettings {...defaultProps} orderType='MARKET' />);

    expect(screen.queryByText('Time In Force')).not.toBeInTheDocument();
  });

  it('does NOT render TimeInForce/TriggerType for ICEBERG orders', () => {
    render(<OrderSettings {...defaultProps} orderType='ICEBERG' />);

    expect(screen.queryByText('Time In Force')).not.toBeInTheDocument();
    expect(screen.queryByText('Trigger Type')).not.toBeInTheDocument();
  });

  it('renders Post Only toggle for ICEBERG orders', () => {
    render(<OrderSettings {...defaultProps} orderType='ICEBERG' />);

    expect(screen.getByText('Post Only')).toBeInTheDocument();
  });

  it('renders Post Only toggle for LIMIT orders', () => {
    render(<OrderSettings {...defaultProps} orderType='LIMIT' />);

    expect(screen.getByText('Post Only')).toBeInTheDocument();
  });

  it('does NOT render Post Only for MARKET orders', () => {
    render(<OrderSettings {...defaultProps} orderType='MARKET' />);

    expect(screen.queryByText('Post Only')).not.toBeInTheDocument();
  });
});
