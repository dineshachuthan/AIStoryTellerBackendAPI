import { Router } from "express";
import { requireAuth } from "./auth";
import { videoGenerationService } from "./video-generation-service";
import { insertCharacterAssetSchema, insertVideoGenerationSchema, videoGenerations } from "@shared/schema";
import { db } from "./db";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Request video generation
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

    const result = await videoGenerationService.generateVideo({
      storyId: validatedRequest.storyId,
      userId,
      quality: validatedRequest.quality
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
    res.status(500).json({ message: "Video generation failed" });
  }
});

// Get existing video for a story
router.get("/api/videos/story/:storyId", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    if (isNaN(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    // Check for existing completed video generation
    const [existingVideo] = await db
      .select()
      .from(videoGenerations)
      .where(and(
        eq(videoGenerations.storyId, storyId),
        eq(videoGenerations.status, 'completed')
      ))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(1);

    if (!existingVideo || !existingVideo.videoUrl) {
      return res.status(404).json({ message: "No video found for this story" });
    }

    res.json({
      videoUrl: existingVideo.videoUrl,
      thumbnailUrl: existingVideo.thumbnailUrl,
      duration: existingVideo.duration,
      status: 'completed',
      cacheHit: true
    });
  } catch (error: any) {
    console.error("Failed to get existing video:", error);
    res.status(500).json({ message: "Failed to check for existing video" });
  }
});

// Get character assets for a story (with user overrides)
router.get("/api/videos/story/:storyId/assets", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    if (isNaN(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const assets = await videoGenerationService.getCharacterAssets(storyId);
    res.json(assets);
  } catch (error: any) {
    console.error("Failed to get character assets:", error);
    res.status(500).json({ message: "Failed to load character assets" });
  }
});

// Update character asset with user override
router.put("/api/videos/story/:storyId/assets/:characterName", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const characterName = req.params.characterName;
    const userId = req.user?.id;

    if (isNaN(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const updateSchema = z.object({
      imageUrl: z.string().url().optional(),
      voiceSampleUrl: z.string().url().optional()
    }).refine(data => data.imageUrl || data.voiceSampleUrl, {
      message: "At least one asset (image or voice) must be provided"
    });

    const validatedUpdate = updateSchema.parse(req.body);

    await videoGenerationService.updateCharacterAsset(
      storyId,
      characterName,
      validatedUpdate,
      userId
    );

    res.json({ 
      message: "Character asset updated successfully",
      character: characterName,
      updates: validatedUpdate
    });
  } catch (error) {
    console.error("Failed to update character asset:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Invalid asset data",
        errors: error.errors
      });
    }
    res.status(500).json({ message: "Failed to update character asset" });
  }
});

// Get user's voice sample for character override
router.get("/api/videos/user-voice/:emotion", requireAuth, async (req: any, res) => {
  try {
    const emotion = req.params.emotion;
    const userId = req.user?.id;
    const intensity = parseInt(req.query.intensity) || 5;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // This would integrate with the existing voice emotion system
    const voiceSample = await getUserVoiceForEmotion(userId, emotion, intensity);
    
    if (!voiceSample) {
      return res.status(404).json({ 
        message: "No voice sample found for this emotion",
        emotion,
        intensity,
        suggestion: "Record voice samples in your profile settings"
      });
    }

    res.json(voiceSample);
  } catch (error) {
    console.error("Failed to get user voice sample:", error);
    res.status(500).json({ message: "Failed to retrieve voice sample" });
  }
});

// Get user's uploaded images for character override
router.get("/api/videos/user-images", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // This would integrate with a user image gallery system
    const userImages = await getUserUploadedImages(userId);
    
    res.json({
      images: userImages,
      uploadUrl: "/api/videos/upload-image" // Endpoint for new uploads
    });
  } catch (error) {
    console.error("Failed to get user images:", error);
    res.status(500).json({ message: "Failed to retrieve user images" });
  }
});

// Upload character image override
router.post("/api/videos/upload-image", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // This would handle file upload (e.g., using multer)
    // For now, we'll expect a base64 or URL input
    const uploadSchema = z.object({
      imageData: z.string(), // base64 or URL
      characterName: z.string().optional(),
      description: z.string().optional()
    });

    const validatedUpload = uploadSchema.parse(req.body);

    // Process and store the image
    const imageUrl = await processAndStoreImage(validatedUpload.imageData, userId);

    res.json({
      message: "Image uploaded successfully",
      imageUrl,
      characterName: validatedUpload.characterName
    });
  } catch (error) {
    console.error("Image upload failed:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: "Invalid image data",
        errors: error.errors
      });
    }
    res.status(500).json({ message: "Image upload failed" });
  }
});

// Validate assets before video generation
router.post("/api/videos/story/:storyId/validate", requireAuth, async (req: any, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    if (isNaN(storyId)) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    await videoGenerationService.validateAssets(storyId);
    
    const assets = await videoGenerationService.getCharacterAssets(storyId);
    const validationResults = assets.map(asset => ({
      characterName: asset.characterName,
      hasValidImage: !!asset.imageUrl,
      hasValidVoice: !!asset.voiceSampleUrl,
      isReady: !!asset.imageUrl || !!asset.voiceSampleUrl
    }));

    const allReady = validationResults.every(result => result.isReady);

    res.json({
      isValid: allReady,
      characters: validationResults,
      message: allReady ? "All characters ready for video generation" : "Some characters need assets"
    });
  } catch (error) {
    console.error("Asset validation failed:", error);
    res.status(500).json({ message: "Asset validation failed" });
  }
});

// Get video generation status
router.get("/api/videos/status/:videoId", requireAuth, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.videoId);
    if (isNaN(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    // This would check the video generation status from database
    const status = await getVideoGenerationStatus(videoId);
    res.json(status);
  } catch (error) {
    console.error("Failed to get video status:", error);
    res.status(500).json({ message: "Failed to retrieve video status" });
  }
});

// Helper functions (these would be implemented based on your storage system)
async function getUserVoiceForEmotion(userId: string, emotion: string, intensity: number) {
  // Integration with existing userVoiceEmotions table
  // Return voice sample URL if exists, null otherwise
  return null; // Placeholder
}

async function getUserUploadedImages(userId: string) {
  // Integration with user image storage system
  // Return array of user's uploaded images
  return []; // Placeholder
}

async function processAndStoreImage(imageData: string, userId: string): Promise<string> {
  // Process and store the uploaded image
  // Return the stored image URL
  return `https://example.com/user-images/${userId}-${Date.now()}.jpg`; // Placeholder
}

async function getVideoGenerationStatus(videoId: number) {
  // Check video generation status from database
  return {
    id: videoId,
    status: 'completed',
    progress: 100,
    videoUrl: `https://example.com/videos/${videoId}.mp4`,
    thumbnailUrl: `https://example.com/thumbnails/${videoId}.jpg`
  }; // Placeholder
}

export default router;