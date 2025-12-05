import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'path';

const app = express();

//Allow requests from your frontend
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));

app.use(express.json());

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


export default app;
