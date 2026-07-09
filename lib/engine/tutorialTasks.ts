/**
 * Shared tutorial task definitions.
 * These are separated from the server action to avoid the 'use server'
 * directive, which cannot export non-function values.
 */

export interface TutorialTaskDef {
  taskKey: string;
  label: string;
  description: string;
}

export interface TutorialTaskDefWithInstructions extends TutorialTaskDef {
  instructions: string[];
}

export const TUTORIAL_TASKS: TutorialTaskDef[] = [
  {
    taskKey: 'market-buy-btc',
    label: 'Market Buy BTC',
    description: 'Buy 0.2 BTC with a Market order on the Trade page.',
  },
  {
    taskKey: 'limit-buy',
    label: 'Limit Buy Order',
    description: 'Create a Limit Buy order for ETH at a price below the current market.',
  },
  {
    taskKey: 'stop-loss',
    label: 'Place a Stop Loss',
    description: 'Place a Stop Loss order to protect a hypothetical position.',
  },
  {
    taskKey: 'take-profit',
    label: 'Set a Take Profit',
    description: 'Set a Take Profit order to lock in gains at a target price.',
  },
  {
    taskKey: 'open-long',
    label: 'Open a Long Position',
    description: 'Open a Long (margin) position with 2x leverage on SOL.',
  },
  {
    taskKey: 'open-short',
    label: 'Open a Short Position',
    description: 'Open a Short (margin) position with 3x leverage on XRP.',
  },
];

export const TUTORIAL_TASKS_WITH_INSTRUCTIONS: TutorialTaskDefWithInstructions[] = [
  {
    ...TUTORIAL_TASKS[0],
    instructions: [
      'Navigate to the Trade page',
      'Select BTC/USD pair from the watchlist',
      'Set order type to "Market"',
      'Enter quantity: 0.2',
      'Click "Buy BTC" to execute the order',
    ],
  },
  {
    ...TUTORIAL_TASKS[1],
    instructions: [
      'Navigate to the Trade page',
      'Select ETH/USD from the watchlist',
      'Change order type to "Limit"',
      'Set a limit price ~5% below the current market price',
      'Enter quantity: 1.0 ETH',
      'Click "Buy ETH" to place the limit order',
    ],
  },
  {
    ...TUTORIAL_TASKS[2],
    instructions: [
      'Navigate to the Trade page',
      'Select any pair (e.g., SOL/USD)',
      'Switch to Margin mode',
      'Set order type to "Stop Loss"',
      'Set a trigger price ~3% below the current market',
      'It will trigger a market order if price drops to that level',
    ],
  },
  {
    ...TUTORIAL_TASKS[3],
    instructions: [
      'Navigate to the Trade page',
      'Select DOGE/USD from the watchlist',
      'Set order type to "Take Profit"',
      'Set a target trigger price ~5% above current market',
      'Enter a quantity to sell',
      'Click submit to place the order',
    ],
  },
  {
    ...TUTORIAL_TASKS[4],
    instructions: [
      'Navigate to the Trade page',
      'Select SOL/USD from the watchlist',
      'Toggle to Margin mode',
      'Set leverage to 2x',
      'Set side to "Long"',
      'Choose order type "Market"',
      'Enter quantity: 5 SOL',
      'Click "Buy / Long" to open the position',
    ],
  },
  {
    ...TUTORIAL_TASKS[5],
    instructions: [
      'Navigate to the Trade page',
      'Select XRP/USD from the watchlist',
      'Toggle to Margin mode',
      'Set leverage to 3x',
      'Set side to "Short"',
      'Choose order type "Market"',
      'Enter quantity: 100 XRP',
      'Click "Sell / Short" to open the position',
    ],
  },
];
