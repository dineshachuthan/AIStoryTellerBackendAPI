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

// Serve generated video files
router.get("/api/videos/openai-generated/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // For demo purposes, generate a simple video placeholder
    // In production, this would serve actual generated video files
    const videoContent = await generateDemoVideo(filename);
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', videoContent.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(videoContent);
  } catch (error) {
    console.error("Failed to serve video:", error);
    res.status(404).json({ message: "Video not found" });
  }
});

// Serve generated thumbnail files
router.get("/api/videos/openai-thumbnails/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Generate a simple thumbnail placeholder
    const thumbnailContent = await generateDemoThumbnail(filename);
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', thumbnailContent.length);
    res.send(thumbnailContent);
  } catch (error) {
    console.error("Failed to serve thumbnail:", error);
    res.status(404).json({ message: "Thumbnail not found" });
  }
});

// Generate demo video content (in production this would be actual OpenAI generated video)
async function generateDemoVideo(filename: string): Promise<Buffer> {
  // Create a minimal MP4 header for a valid video file
  // This is a basic demo - in production you'd have actual video content
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
    0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
  ]);
  
  return mp4Header;
}

// Generate demo thumbnail content
async function generateDemoThumbnail(filename: string): Promise<Buffer> {
  // Create a minimal JPEG header for a valid image file
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
  ]);
  
  return jpegHeader;
}

export default router;