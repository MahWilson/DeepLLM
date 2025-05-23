import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Verify admin status
router.get('/verify-admin', authenticateToken, isAdmin, async (req, res) => {
  res.json({ isAdmin: true });
});

// Get incident statistics
router.get('/incidents', authenticateToken, isAdmin, async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        type: true,
        severity: true,
      },
    });

    const stats = {
      total: incidents.length,
      byType: {
        accidents: incidents.filter(i => i.type === 'accident').length,
        roadClosures: incidents.filter(i => i.type === 'road_closure').length,
        construction: incidents.filter(i => i.type === 'construction').length,
        hazards: incidents.filter(i => i.type === 'hazard').length,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching incident stats:', error);
    res.status(500).json({ error: 'Failed to fetch incident statistics' });
  }
});

// Get infrastructure status
router.get('/infrastructure', authenticateToken, isAdmin, async (req, res) => {
  try {
    const infrastructure = await prisma.infrastructure.findMany({
      select: {
        status: true,
      },
    });

    const stats = {
      active: infrastructure.filter(i => i.status === 'ACTIVE').length,
      planned: infrastructure.filter(i => i.status === 'PLANNED').length,
      completed: infrastructure.filter(i => i.status === 'COMPLETED').length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching infrastructure stats:', error);
    res.status(500).json({ error: 'Failed to fetch infrastructure statistics' });
  }
});

// Close road
router.post('/close-road', authenticateToken, isAdmin, async (req, res) => {
  const { roadId } = req.body;
  try {
    await prisma.road.update({
      where: { id: roadId },
      data: { status: 'CLOSED' },
    });
    res.json({ message: 'Road closed successfully' });
  } catch (error) {
    console.error('Error closing road:', error);
    res.status(500).json({ error: 'Failed to close road' });
  }
});

// Get traffic density data
router.get('/traffic-density', authenticateToken, isAdmin, async (req, res) => {
  try {
    const trafficData = await prisma.trafficData.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        density: true,
        timestamp: true,
      },
    });

    // Group data by hour
    const hourlyData = trafficData.reduce((acc, data) => {
      const hour = new Date(data.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + data.density;
      return acc;
    }, {});

    res.json(hourlyData);
  } catch (error) {
    console.error('Error fetching traffic density:', error);
    res.status(500).json({ error: 'Failed to fetch traffic density data' });
  }
});

export default router; 