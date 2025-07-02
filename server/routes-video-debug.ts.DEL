import { Router } from 'express';
import { videoGenerationService } from './video-generation-service';

const router = Router();

/**
 * Get detailed information about what was sent to video generation
 */
router.get('/api/videos/debug/:storyId', async (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get the video generation debug info
    const debugInfo = await videoGenerationService.getVideoGenerationDebugInfo(storyId, userId);
    
    res.json(debugInfo);
  } catch (error: any) {
    console.error('Error getting video debug info:', error);
    res.status(500).json({ message: 'Failed to get video debug info', error: error.message });
  }
});

/**
 * Compare video content with expected story elements
 */
router.post('/api/videos/verify/:storyId', async (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const userId = req.session?.user?.id;
    const { actualVideoDescription } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Compare actual video with expected content
    const comparison = await videoGenerationService.compareVideoWithStory(storyId, userId, actualVideoDescription);
    
    res.json(comparison);
  } catch (error: any) {
    console.error('Error comparing video with story:', error);
    res.status(500).json({ message: 'Failed to compare video', error: error.message });
  }
});

export default router;