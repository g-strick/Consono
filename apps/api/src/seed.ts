import { db, users } from '@portuguese-app/db';
import { V0_USER_ID } from './lib/constants.js';

await db
  .insert(users)
  .values({ id: V0_USER_ID, display_name: 'Grayson', audio_speed: 1.0 })
  .onConflictDoNothing();

console.log(`V0 user seeded: ${V0_USER_ID}`);
process.exit(0);
