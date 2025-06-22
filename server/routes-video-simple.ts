import { Router } from "express";
import { requireAuth } from "./auth";
import { simpleVideoService } from "./simple-video-service";
import { z } from "zod";

const router = Router();

// Request video generation with smart caching
router.post("/api/videos/generate", requireAuth, async (req: any, res) => {
  try {
    const requestSchema = z.object({
      storyId: z.number(),
      characterOverrides: z.record(z.object({
        imageUrl: z.string().optional(),
        voiceSampleUrl: z.string().optional()
      })).optional(),
      quality: z.enum(['draft', 'standard', 'high']).default('standard')
    });

    const validatedRequest = requestSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await simpleVideoService.generateSimpleVideo({
      storyId: validatedRequest.storyId,
      userId,
      characterOverrides: validatedRequest.characterOverrides || {}
    });

    res.json(result);
  } catch (error: any) {
    console.error("Video generation request failed:", error);
    if (error?.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Invalid request parameters",
        errors: error.errors
      });
    }
    res.status(500).json({ message: error?.message || "Video generation failed" });
  }
});

// Get character assets for a story
router.get("/api/videos/story/:storyId/assets", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    if (isNaN(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const assets = await simpleVideoService.getCharacterAssets(storyId);
    res.json(assets);
  } catch (error: any) {
    console.error("Failed to get character assets:", error);
    res.status(500).json({ message: "Failed to load character assets" });
  }
});

export default router;