import { Hono } from 'hono';
import { db, users } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';

export const usersRoute = new Hono();

usersRoute.get('/me', async (c) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, V0_USER_ID) });
  if (!user) return c.json({ error: 'user not found' }, 404);

  return c.json({
    id: user.id,
    name: user.display_name,
    audio_speed: user.audio_speed,
  });
});
