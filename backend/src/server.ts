import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './middleware/auth';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      return next(new Error('Unauthorized'));
    }

    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('Admin connected:', socket.data.user.email);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Admin disconnected:', socket.data.user.email);
  });
});

// Function to broadcast updates to all connected admin clients
export const broadcastUpdate = (event: string, data: any) => {
  io.emit(event, data);
};

// Example usage in other parts of the application:
// When a new incident is created:
// broadcastUpdate('incidentUpdate', newIncidentData);
// When traffic data is updated:
// broadcastUpdate('trafficUpdate', newTrafficData);
// When infrastructure status changes:
// broadcastUpdate('infrastructureUpdate', newInfrastructureData);

export { app, httpServer }; 