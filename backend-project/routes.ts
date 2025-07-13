import { Router } from "express";
import { db } from "./db.js";
import { stories, users, userEsmRecordings } from "./schema.js";
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

// Get stories for a specific user
router.get('/stories/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const userStories = await db.select().from(stories)
      .where(eq(stories.authorId, userId))
      .orderBy(desc(stories.createdAt));
    
    res.json({ data: userStories });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({ error: 'Failed to fetch user stories' });
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

// Authentication routes
router.get('/auth/user', async (req, res) => {
  try {
    if (req.isAuthenticated() && req.user) {
      res.json({ data: req.user });
    } else {
      res.json({ data: null });
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

router.get('/auth/facebook', async (req, res) => {
  try {
    // TODO: Implement Facebook OAuth
    const frontendUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : process.env.FRONTEND_URL;
    res.send(`
      <html>
        <head><title>OAuth Success</title></head>
        <body>
          <h2>OAuth Success</h2>
          <p>Authentication successful! This window will close automatically.</p>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'facebook' }, '*');
              window.close();
            } else {
              // Fallback redirect
              window.location.href = '${frontendUrl}/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in Facebook OAuth:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    // TODO: Implement proper authentication
    res.json({ data: { id: 1, name: 'Demo User', email: 'demo@example.com' } });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    // TODO: Implement proper authentication
    res.json({ data: { id: 1, name: 'Demo User', email: 'demo@example.com' } });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    // TODO: Implement proper authentication
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// OAuth routes
router.get('/auth/google', (req, res) => {
  // Google OAuth initialization
  res.redirect('https://accounts.google.com/oauth/authorize?client_id=demo&redirect_uri=demo&response_type=code&scope=profile email');
});

router.get('/auth/google/callback', (req, res) => {
  // Handle OAuth callback and send success message to parent window
  res.send(`
    <script>
      window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'google' }, window.location.origin);
      window.close();
    </script>
  `);
});

router.get('/auth/facebook', (req, res) => {
  // Facebook OAuth initialization
  res.redirect('https://www.facebook.com/v18.0/dialog/oauth?client_id=demo&redirect_uri=demo&response_type=code&scope=email');
});

router.get('/auth/facebook/callback', (req, res) => {
  // Handle OAuth callback and send success message to parent window
  res.send(`
    <script>
      window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'facebook' }, window.location.origin);
      window.close();
    </script>
  `);
});

router.get('/auth/microsoft', (req, res) => {
  // Microsoft OAuth initialization
  res.redirect('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=demo&redirect_uri=demo&response_type=code&scope=user.read');
});

router.get('/auth/microsoft/callback', (req, res) => {
  // Handle OAuth callback and send success message to parent window
  res.send(`
    <script>
      window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'microsoft' }, window.location.origin);
      window.close();
    </script>
  `);
});

// Story routes (add missing CRUD operations)
router.put('/stories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateSchema = createInsertSchema(stories).omit({ id: true, createdAt: true }).partial();
    const validatedData = updateSchema.parse(req.body);
    
    const [updatedStory] = await db.update(stories)
      .set(validatedData)
      .where(eq(stories.id, id))
      .returning();
    
    if (!updatedStory) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    res.json({ data: updatedStory });
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

router.delete('/stories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deletedStory] = await db.delete(stories)
      .where(eq(stories.id, id))
      .returning();
    
    if (!deletedStory) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    res.json({ data: { message: 'Story deleted successfully' } });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
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

router.post('/user/voice-recordings', async (req, res) => {
  try {
    const insertSchema = createInsertSchema(userEsmRecordings).omit({ id: true, createdAt: true });
    const validatedData = insertSchema.parse(req.body);
    
    const [newRecording] = await db.insert(userEsmRecordings).values(validatedData).returning();
    res.status(201).json({ data: newRecording });
  } catch (error) {
    console.error('Error creating voice recording:', error);
    res.status(500).json({ error: 'Failed to create voice recording' });
  }
});

router.delete('/user/voice-recordings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deletedRecording] = await db.delete(userEsmRecordings)
      .where(eq(userEsmRecordings.id, id))
      .returning();
    
    if (!deletedRecording) {
      return res.status(404).json({ error: 'Voice recording not found' });
    }
    
    res.json({ data: { message: 'Voice recording deleted successfully' } });
  } catch (error) {
    console.error('Error deleting voice recording:', error);
    res.status(500).json({ error: 'Failed to delete voice recording' });
  }
});

// User routes (add missing operations)
router.get('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const insertSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
    const validatedData = insertSchema.parse(req.body);
    
    const [newUser] = await db.insert(users).values(validatedData).returning();
    res.status(201).json({ data: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
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
      'GET /api/auth/user': 'Get current user',
      'POST /api/auth/login': 'User login',
      'POST /api/auth/register': 'User registration',
      'POST /api/auth/logout': 'User logout',
      'GET /api/users': 'Get all users',
      'GET /api/users/:id': 'Get user by ID',
      'POST /api/users': 'Create new user',
      'GET /api/stories': 'Get all stories',
      'POST /api/stories': 'Create a new story',
      'GET /api/stories/:id': 'Get story by ID',
      'PUT /api/stories/:id': 'Update story',
      'DELETE /api/stories/:id': 'Delete story',
      'GET /api/user/:userId/voice-recordings': 'Get user voice recordings',
      'POST /api/user/voice-recordings': 'Upload voice recording',
      'DELETE /api/user/voice-recordings/:id': 'Delete voice recording'
    }
  });
});

export function registerRoutes() {
  return router;
}