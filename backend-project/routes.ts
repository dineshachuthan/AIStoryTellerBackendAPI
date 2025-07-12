import { Router } from "express";
import { db } from "./db";
import { stories, users, userEsmRecordings } from "./schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User routes
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json({ data: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Story routes
router.get('/stories', async (req, res) => {
  try {
    const allStories = await db.select().from(stories).orderBy(desc(stories.createdAt));
    res.json({ data: allStories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

router.post('/stories', async (req, res) => {
  try {
    const insertSchema = createInsertSchema(stories).omit({ id: true, createdAt: true });
    const validatedData = insertSchema.parse(req.body);
    
    const [newStory] = await db.insert(stories).values(validatedData).returning();
    res.status(201).json({ data: newStory });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

router.get('/stories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    res.json({ data: story });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// Voice recording routes
router.get('/user/:userId/voice-recordings', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const recordings = await db.select()
      .from(userEsmRecordings)
      .where(eq(userEsmRecordings.userId, userId));
    
    res.json({ data: recordings });
  } catch (error) {
    console.error('Error fetching voice recordings:', error);
    res.status(500).json({ error: 'Failed to fetch voice recordings' });
  }
});

// API documentation
router.get('/docs', (req, res) => {
  res.json({
    title: 'AI Storytelling Backend API',
    version: '1.0.0',
    description: 'RESTful API for collaborative storytelling platform',
    endpoints: {
      'GET /api/health': 'Health check',
      'GET /api/users': 'Get all users',
      'GET /api/stories': 'Get all stories',
      'POST /api/stories': 'Create a new story',
      'GET /api/stories/:id': 'Get story by ID',
      'GET /api/user/:userId/voice-recordings': 'Get user voice recordings'
    }
  });
});

export function registerRoutes() {
  return router;
}