import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecret } from './src/gcp-secrets.js';
import { getCrowdAdvice } from './src/gemini-service.js';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve Vite frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/traffic', async (req, res) => {
  try {
    res.json({ status: "success", traffic: "high" }); 
  } catch (error) {
    res.status(500).json({ error: 'Traffic service error' });
  }
});

app.post('/api/advice', async (req, res) => {
  try {
    const { trafficLevel, userLocation } = req.body;
    const advice = await getCrowdAdvice(trafficLevel || 'Medium', userLocation || 'Entrance');
    res.json({ advice });
  } catch (error) {
    res.status(500).json({ error: 'AI Advice unavailable' });
  }
});

// React fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
