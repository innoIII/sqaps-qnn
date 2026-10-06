import express from 'express';
import { apiRouter } from '../src/api/server-router.ts';

const app = express();
app.use(express.json());

// Enable CORS so external dashboards and secondary websites can fetch from the API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Mount API routes
app.use('/api', apiRouter);

export default app;
