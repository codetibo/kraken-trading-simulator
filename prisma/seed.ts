import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// ─── Seed Assets ───────────────────────────────────────────────────────────

const SEED_ASSETS = [
  { symbol: 'BTC/USD', base: 'BTC', quote: 'USD', name: 'Bitcoin' },
  { symbol: 'ETH/USD', base: 'ETH', quote: 'USD', name: 'Ethereum' },
  { symbol: 'SOL/USD', base: 'SOL', quote: 'USD', name: 'Solana' },
  { symbol: 'DOGE/USD', base: 'DOGE', quote: 'USD', name: 'Dogecoin' },
  { symbol: 'ADA/USD', base: 'ADA', quote: 'USD', name: 'Cardano' },
  { symbol: 'AVAX/USD', base: 'AVAX', quote: 'USD', name: 'Avalanche' },
  { symbol: 'DOT/USD', base: 'DOT', quote: 'USD', name: 'Polkadot' },
  { symbol: 'LINK/USD', base: 'LINK', quote: 'USD', name: 'Chainlink' },
  { symbol: 'MATIC/USD', base: 'MATIC', quote: 'USD', name: 'Polygon' },
  { symbol: 'UNI/USD', base: 'UNI', quote: 'USD', name: 'Uniswap' },
  { symbol: 'ATOM/USD', base: 'ATOM', quote: 'USD', name: 'Cosmos' },
  { symbol: 'XRP/USD', base: 'XRP', quote: 'USD', name: 'Ripple' },
] as const;

async function seedAssets() {
  for (const asset of SEED_ASSETS) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: asset,
    });
  }
  console.log(`Seeded ${SEED_ASSETS.length} assets.`);
}

// ─── Seed Demo User ────────────────────────────────────────────────────────

async function seedDemoUser() {
  const email = process.env.SEED_USER_EMAIL || 'demo@kraken-simulator.local';
  const password = process.env.SEED_USER_PASSWORD || 'demo123456';
  const name = process.env.SEED_USER_NAME || 'Demo Trader';
  const startingBalance = parseFloat(process.env.SEED_USER_BALANCE || '10000');

  if (password === 'demo123456') {
    console.warn(
      'WARNING: Using default password "demo123456". Set SEED_USER_PASSWORD env var for a secure password.',
    );
  }

  // ── Upsert user ──────────────────────────────────────────────────────
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    // Update existing user's name
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { name },
    });

    // Update password in the account table (if credential account exists)
    const hashedPassword = await bcrypt.hash(password, 12);
    const existingAccount = await prisma.account.findFirst({
      where: { userId: existingUser.id, providerId: 'credential' },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      // Create credential account for existing user
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          accountId: existingUser.id,
          providerId: 'credential',
          password: hashedPassword,
        },
      });
    }

    // Upsert wallet
    await prisma.wallet.upsert({
      where: { userId: existingUser.id },
      create: {
        userId: existingUser.id,
        cashBalance: startingBalance,
        startingBalance,
      },
      update: { cashBalance: startingBalance, startingBalance },
    });

    // Upsert settings
    await prisma.settings.upsert({
      where: { userId: existingUser.id },
      create: { userId: existingUser.id },
      update: {},
    });

    console.log(`Updated demo user: ${email} / ${password} (balance: $${startingBalance})`);
    return;
  }

  // ── Create new user ──────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      emailVerified: true,
      wallet: {
        create: {
          cashBalance: startingBalance,
          startingBalance,
        },
      },
      settings: {
        create: {},
      },
      accounts: {
        create: {
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
        },
      },
    },
  });

  console.log(`Created demo user: ${email} / ${password} (balance: $${startingBalance}, id: ${user.id})`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...');

  await seedAssets();

  if (process.env.SEED_CREATE_USER !== 'false') {
    await seedDemoUser();
  } else {
    console.log('Skipping user creation (SEED_CREATE_USER=false).');
  }

  console.log('Seed complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
