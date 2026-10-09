import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Retain API is running' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  const status = err.status === 400 ? 400 : 500;
  res.status(status).json({
    message: status === 400 ? 'Invalid request body' : 'Internal server error',
  });
});

app.listen(port, () => {
  console.log(`Retain API running at http://localhost:${port}`);
});
