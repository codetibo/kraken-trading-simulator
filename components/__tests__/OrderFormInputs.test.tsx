/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderFormInputs } from '@/components/trade/order-entry/OrderFormInputs';

const defaultProps = {
  marketType: 'SPOT' as const,
  orderType: 'MARKET' as const,
  side: 'BUY' as const,
  selectedAsset: 'BTC/USD',
  quantity: '',
  limitPrice: '',
  triggerPrice: '',
  trailingOffsetType: 'PERCENT' as const,
  trailingOffsetValue: '',
  trailingLimitOffset: '',
  visibleQuantity: '',
  twapDuration: '',
  twapSlices: '',
  secondTriggerPrice: '',
  secondLimitPrice: '',
  cashBalance: 50000,
  assetHolding: 0.5,
  onQuantityChange: jest.fn(),
  onLimitPriceChange: jest.fn(),
  onTriggerPriceChange: jest.fn(),
  onTrailingOffsetTypeChange: jest.fn(),
  onTrailingOffsetValueChange: jest.fn(),
  onTrailingLimitOffsetChange: jest.fn(),
  onVisibleQuantityChange: jest.fn(),
  onTwapDurationChange: jest.fn(),
  onTwapSlicesChange: jest.fn(),
  onSecondTriggerPriceChange: jest.fn(),
  onSecondLimitPriceChange: jest.fn(),
};

describe('OrderFormInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quantity input for all order types', () => {
    render(<OrderFormInputs {...defaultProps} />);

    const quantityInput = screen.getByPlaceholderText('0.00');
    expect(quantityInput).toBeInTheDocument();
  });

  it('shows cash availability for SPOT BUY', () => {
    render(<OrderFormInputs {...defaultProps} side='BUY' />);

    expect(screen.getByText(/Avail:/)).toBeInTheDocument();
    expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
  });

  it('shows asset holding for SPOT SELL', () => {
    render(<OrderFormInputs {...defaultProps} side='SELL' />);

    expect(screen.getByText(/Avail:/)).toBeInTheDocument();
    expect(screen.getByText(/0\.5/)).toBeInTheDocument();
  });

  it('shows limit price input for LIMIT orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='LIMIT' />);

    // There should be 2 number inputs (quantity + limit price)
    const inputs = screen.getAllByPlaceholderText('0.00');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows trigger price input for STOP_LOSS orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='STOP_LOSS' />);

    const inputs = screen.getAllByPlaceholderText('0.00');
    expect(inputs.length).toBeGreaterThanOrEqual(2); // quantity + trigger
  });

  it('shows both limit and trigger for STOP_LOSS_LIMIT orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='STOP_LOSS_LIMIT' />);

    const inputs = screen.getAllByPlaceholderText('0.00');
    expect(inputs.length).toBeGreaterThanOrEqual(3); // quantity + limit + trigger
  });

  it('shows trailing offset controls for TRAILING_STOP orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='TRAILING_STOP' />);

    expect(screen.getByText('Offset Type')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('Fixed')).toBeInTheDocument();
  });

  it('shows PERCENT and FIXED toggle for trailing orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='TRAILING_STOP' />);

    const percentBtn = screen.getByText('%');
    const fixedBtn = screen.getByText('Fixed');

    expect(percentBtn).toBeInTheDocument();
    expect(fixedBtn).toBeInTheDocument();
  });

  it('shows visible quantity for ICEBERG orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='ICEBERG' />);

    expect(screen.getByText('Visible Quantity')).toBeInTheDocument();
  });

  it('shows TWAP inputs for TWAP orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='TWAP' />);

    expect(screen.getByText('Duration (seconds)')).toBeInTheDocument();
    expect(screen.getByText('Number of Slices')).toBeInTheDocument();
  });

  it('shows OCO fields for OCO orders', () => {
    render(<OrderFormInputs {...defaultProps} orderType='OCO' />);

    expect(screen.getByText('Second Trigger Price')).toBeInTheDocument();
    expect(screen.getByText('Second Limit Price')).toBeInTheDocument();
  });

  it('calls onQuantityChange when typing quantity', async () => {
    const user = userEvent.setup();
    const onQuantityChange = jest.fn();

    render(
      <OrderFormInputs {...defaultProps} onQuantityChange={onQuantityChange} />,
    );

    const input = screen.getByPlaceholderText('0.00');
    await user.type(input, '1.5');
    expect(onQuantityChange).toHaveBeenCalled();
  });

  it('calls onLimitPriceChange when typing limit price', async () => {
    const user = userEvent.setup();
    const onLimitPriceChange = jest.fn();

    render(
      <OrderFormInputs
        {...defaultProps}
        orderType='LIMIT'
        onLimitPriceChange={onLimitPriceChange}
      />,
    );

    const priceInputs = screen.getAllByPlaceholderText('0.00');
    // Second input is the limit price
    await user.type(priceInputs[1], '50000');
    expect(onLimitPriceChange).toHaveBeenCalled();
  });

  it('increments quantity on ArrowUp', () => {
    const onQuantityChange = jest.fn();

    render(
      <OrderFormInputs
        {...defaultProps}
        quantity='5'
        onQuantityChange={onQuantityChange}
      />,
    );

    const input = screen.getAllByPlaceholderText('0.00')[0];
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    // ArrowUp should trigger a change — the exact value depends on the component logic
    expect(onQuantityChange).toHaveBeenCalled();
  });

  it('decrements quantity on ArrowDown', () => {
    const onQuantityChange = jest.fn();

    render(
      <OrderFormInputs
        {...defaultProps}
        quantity='5'
        onQuantityChange={onQuantityChange}
      />,
    );

    const input = screen.getByPlaceholderText('0.00');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // ArrowDown with quantity=5 (between 1 and 10) should decrement by 1
    expect(onQuantityChange).toHaveBeenCalledWith('4.00');
  });

  it('switches trailing offset type on click', async () => {
    const user = userEvent.setup();
    const onTrailingOffsetTypeChange = jest.fn();

    render(
      <OrderFormInputs
        {...defaultProps}
        orderType='TRAILING_STOP'
        trailingOffsetType='PERCENT'
        onTrailingOffsetTypeChange={onTrailingOffsetTypeChange}
      />,
    );

    await user.click(screen.getByText('Fixed'));
    expect(onTrailingOffsetTypeChange).toHaveBeenCalledWith('FIXED');
  });

  it('does not crash with null cashBalance', () => {
    render(
      <OrderFormInputs
        {...defaultProps}
        cashBalance={null}
        side='BUY'
      />,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does not crash with null assetHolding', () => {
    render(
      <OrderFormInputs
        {...defaultProps}
        assetHolding={null}
        side='SELL'
      />,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows limit offset for TRAILING_STOP_LIMIT', () => {
    render(
      <OrderFormInputs
        {...defaultProps}
        orderType='TRAILING_STOP_LIMIT'
      />,
    );

    expect(screen.getByText('Limit Offset')).toBeInTheDocument();
  });
});
