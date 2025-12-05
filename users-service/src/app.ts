import express from 'express';
import cors from 'cors'; 
import authRoutes from './routes/users.routes';

const app = express();

//Allow requests from your frontend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Your routes
app.use('/api/auth', authRoutes);

export default app;
