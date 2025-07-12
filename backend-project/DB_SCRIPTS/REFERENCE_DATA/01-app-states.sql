-- ================================================
-- Application States Reference Data
-- ================================================

-- Insert application states
INSERT INTO app_states (state_type, state_value, state_name, description, is_active) VALUES
    ('story', 'draft', 'Draft', 'Story is being written', true),
    ('story', 'pending_analysis', 'Pending Analysis', 'Story is awaiting AI analysis', true),
    ('story', 'analyzing', 'Analyzing', 'Story is being analyzed by AI', true),
    ('story', 'ready', 'Ready', 'Story analysis complete', true),
    ('story', 'private_testing', 'Private Testing', 'Story in private testing phase', true),
    ('story', 'collaborative_review', 'Collaborative Review', 'Story in collaborative review', true),
    ('story', 'finalized', 'Finalized', 'Story is finalized', true),
    ('story', 'published', 'Published', 'Story is published publicly', true),
    ('story', 'archived', 'Archived', 'Story is archived', true),
    
    ('story_instance', 'pending', 'Pending', 'Story instance created but not started', true),
    ('story_instance', 'in_progress', 'In Progress', 'Participants are recording', true),
    ('story_instance', 'ready_for_generation', 'Ready for Generation', 'All recordings complete', true),
    ('story_instance', 'generating', 'Generating', 'Video is being generated', true),
    ('story_instance', 'completed', 'Completed', 'Video generation complete', true),
    ('story_instance', 'failed', 'Failed', 'Generation failed', true),
    
    ('video_job', 'queued', 'Queued', 'Video job is in queue', true),
    ('video_job', 'processing', 'Processing', 'Video is being processed', true),
    ('video_job', 'completed', 'Completed', 'Video processing complete', true),
    ('video_job', 'failed', 'Failed', 'Video processing failed', true),
    
    ('voice_training', 'pending', 'Pending', 'Voice training pending', true),
    ('voice_training', 'training', 'Training', 'Voice model is training', true),
    ('voice_training', 'completed', 'Completed', 'Voice training complete', true),
    ('voice_training', 'failed', 'Failed', 'Voice training failed', true),
    
    ('story_processing', 'pending', 'Pending', 'Story processing pending', true),
    ('story_processing', 'analyzing', 'Analyzing', 'Story being analyzed', true),
    ('story_processing', 'generating_images', 'Generating Images', 'Creating character images', true),
    ('story_processing', 'complete', 'Complete', 'Processing complete', true),
    ('story_processing', 'failed', 'Failed', 'Processing failed', true)
ON CONFLICT DO NOTHING;

-- Insert state transitions
INSERT INTO state_transitions (state_type, from_state, to_state, transition_name, requires_permission) VALUES
    -- Story state transitions
    ('story', 'draft', 'pending_analysis', 'submit_for_analysis', false),
    ('story', 'pending_analysis', 'analyzing', 'start_analysis', false),
    ('story', 'analyzing', 'ready', 'analysis_complete', false),
    ('story', 'analyzing', 'failed', 'analysis_failed', false),
    ('story', 'ready', 'private_testing', 'start_testing', true),
    ('story', 'private_testing', 'collaborative_review', 'invite_collaborators', true),
    ('story', 'collaborative_review', 'finalized', 'finalize_story', true),
    ('story', 'finalized', 'published', 'publish_story', true),
    ('story', 'published', 'archived', 'archive_story', true),
    
    -- Story instance state transitions
    ('story_instance', 'pending', 'in_progress', 'start_recording', false),
    ('story_instance', 'in_progress', 'ready_for_generation', 'all_recordings_complete', false),
    ('story_instance', 'ready_for_generation', 'generating', 'start_generation', false),
    ('story_instance', 'generating', 'completed', 'generation_complete', false),
    ('story_instance', 'generating', 'failed', 'generation_failed', false),
    
    -- Video job state transitions
    ('video_job', 'queued', 'processing', 'start_processing', false),
    ('video_job', 'processing', 'completed', 'processing_complete', false),
    ('video_job', 'processing', 'failed', 'processing_failed', false),
    
    -- Voice training state transitions
    ('voice_training', 'pending', 'training', 'start_training', false),
    ('voice_training', 'training', 'completed', 'training_complete', false),
    ('voice_training', 'training', 'failed', 'training_failed', false),
    
    -- Story processing state transitions
    ('story_processing', 'pending', 'analyzing', 'start_analysis', false),
    ('story_processing', 'analyzing', 'generating_images', 'analysis_complete', false),
    ('story_processing', 'generating_images', 'complete', 'images_generated', false),
    ('story_processing', 'analyzing', 'failed', 'analysis_failed', false),
    ('story_processing', 'generating_images', 'failed', 'image_generation_failed', false)
ON CONFLICT DO NOTHING;