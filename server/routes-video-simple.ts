import { Router } from "express";
import { requireAuth } from "./auth";
import { simpleVideoService } from "./simple-video-service";
import { z } from "zod";

const router = Router();

// Get video with smart caching - generates if needed
router.get("/api/videos/generate/:storyId", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (isNaN(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    // Check for character overrides in query params
    const characterOverrides = req.query.overrides ? 
      JSON.parse(req.query.overrides as string) : {};

    const result = await simpleVideoService.generateSimpleVideo({
      storyId,
      userId,
      characterOverrides
    });

    res.json(result);
  } catch (error: any) {
    console.error("Video generation request failed:", error);
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