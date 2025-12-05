import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import connectDB from './config/db';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Inject io into Express app context for global access
app.set('io', io);

// Socket.IO handling
io.on('connection', (socket) => {
  console.log('📡 New client connected:', socket.id);

  // Join delivery tracking room
  socket.on('join-delivery-room', (deliveryId: string) => {
    socket.join(`delivery-${deliveryId}`);
    console.log(`✅ Client joined room delivery-${deliveryId}`);
  });

  // Receive location from driver and broadcast
  socket.on('send-location', ({ deliveryId, location }) => {
    io.to(`delivery-${deliveryId}`).emit('location-update', { deliveryId, location });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start server after DB is ready
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Delivery service running on port ${PORT}`);
  });
});
