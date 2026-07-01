import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { generateRoute } from './routes/generate.js';
import { cardsRoute } from './routes/cards.js';
import { reviewsRoute } from './routes/reviews.js';
import { audioRoute } from './routes/audio.js';
import { usersRoute } from './routes/users.js';
import { homeRoute } from './routes/home.js';
import { streakRoute } from './routes/streak.js';

const app = new Hono();

app.route('/generate', generateRoute);
app.route('/cards', cardsRoute);
app.route('/reviews', reviewsRoute);
app.route('/audio', audioRoute);
app.route('/users', usersRoute);
app.route('/home', homeRoute);
app.route('/streak', streakRoute);

app.get('/health', (c) => c.json({ ok: true }));

const port = Number(process.env['PORT'] ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});
