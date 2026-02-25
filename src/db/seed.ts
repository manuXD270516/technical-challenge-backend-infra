import crypto from 'crypto';
import { getPool, closePool } from './index';
import { runMigrations } from './migrate';

const SEED_USERS = [
  {
    email: 'basic@vibepeak.com',
    apiKey: 'vp_test_basic_key_123456',
    webhookSecret: 'whsec_basic_test_secret_abcdef',
    plan: 'basic',
    credits: 10,
  },
  {
    email: 'pro@vibepeak.com',
    apiKey: 'vp_test_pro_key_789012',
    webhookSecret: 'whsec_pro_test_secret_ghijkl',
    plan: 'pro',
    credits: 100,
  },
  {
    email: 'nocredits@vibepeak.com',
    apiKey: 'vp_test_nocredits_key_345678',
    webhookSecret: 'whsec_nocredits_test_secret_mnopqr',
    plan: 'basic',
    credits: 0,
  },
];

async function seed(): Promise<void> {
  await runMigrations();

  const pool = getPool();

  for (const user of SEED_USERS) {
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(user.apiKey)
      .digest('hex');

    await pool.query(
      `INSERT INTO users (email, api_key_hash, webhook_secret, plan, credits)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (api_key_hash) DO UPDATE SET
         credits = $5,
         plan = $4`,
      [user.email, apiKeyHash, user.webhookSecret, user.plan, user.credits]
    );

    console.log(`Seeded user: ${user.email} (plan: ${user.plan}, credits: ${user.credits})`);
    console.log(`  API Key: ${user.apiKey}`);
    console.log(`  API Key Hash: ${apiKeyHash}`);
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('\nSeed completed');
      return closePool();
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

export { seed, SEED_USERS };
