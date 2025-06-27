import type { Express } from "express";
import { db } from "./db";
import { videoGenerations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { videoCallbackManager } from "./video-callback-manager";

/**
 * Webhook handler for Kling AI video completion callbacks
 * This eliminates the need for constant polling
 */
export function setupVideoWebhooks(app: Express) {
  // Webhook endpoint for Kling AI to notify us when videos are complete
  app.post('/api/webhooks/kling/video-complete', async (req, res) => {
    try {
      console.log('=== KLING WEBHOOK RECEIVED ===');
      console.log('Webhook payload:', JSON.stringify(req.body, null, 2));
      
      const { task_id, task_status, task_result } = req.body;
      
      if (!task_id) {
        console.error('No task_id provided in webhook');
        return res.status(400).json({ error: 'Missing task_id' });
      }
      
      // Find the video generation record in our database by searching cacheKey which contains the task_id
      const [videoRecord] = await db
        .select()
        .from(videoGenerations)
        .where(eq(videoGenerations.cacheKey, task_id));
      
      if (!videoRecord) {
        console.error(`No video record found for task_id: ${task_id}`);
        return res.status(404).json({ error: 'Video record not found' });
      }
      
      // Update the video record based on the webhook status
      let updateData: any = {
        updatedAt: new Date()
      };
      
      if (task_status === 'succeed' && task_result?.videos?.[0]?.url) {
        const videoUrl = task_result.videos[0].url;
        const duration = parseFloat(task_result.videos[0].duration || '5.0');
        
        updateData.status = 'completed';
        updateData.videoUrl = videoUrl;
        updateData.duration = duration;
        updateData.metadata = JSON.stringify({
          completedAt: new Date().toISOString(),
          webhookReceived: true,
          taskResult: task_result
        });
        
        console.log(`✅ Video completed successfully: ${videoUrl}`);
        
        // Notify callback manager for immediate resolution
        videoCallbackManager.notifyCompletion(task_id, {
          videoUrl,
          duration,
          thumbnailUrl: task_result.videos[0].cover_image_url
        });
      } else if (task_status === 'failed') {
        updateData.status = 'failed';
        updateData.metadata = JSON.stringify({
          failedAt: new Date().toISOString(),
          webhookReceived: true,
          error: task_result?.error || 'Unknown error'
        });
        
        console.log(`❌ Video generation failed for task: ${task_id}`);
        
        // Notify callback manager of failure
        videoCallbackManager.notifyFailure(task_id, {
          message: task_result?.error || 'Unknown error',
          task_result
        });
      } else {
        console.log(`⏳ Video status update: ${task_status} for task: ${task_id}`);
        // For other statuses (processing, etc.), just update the timestamp
      }
      
      // Update the database record
      await db
        .update(videoGenerations)
        .set(updateData)
        .where(eq(videoGenerations.cacheKey, task_id));
      
      console.log(`Database updated for task: ${task_id}, status: ${task_status}`);
      
      // Respond to Kling that we received the webhook
      res.json({ 
        success: true, 
        message: 'Webhook processed successfully',
        task_id 
      });
      
    } catch (error: any) {
      console.error('Error processing Kling webhook:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });
  
  console.log('🔗 Video webhook endpoints configured');
}

/**
 * Generate webhook URL for Kling API requests
 * This tells Kling where to send completion notifications
 */
export function getWebhookUrl(baseUrl: string): string {
  return `${baseUrl}/api/webhooks/kling/video-complete`;
}