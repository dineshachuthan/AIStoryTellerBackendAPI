-- ================================================
-- Notification Campaigns Reference Data
-- ================================================

-- Insert notification campaigns
INSERT INTO notification_campaigns (
    source_domain, 
    source_event_type, 
    campaign_name, 
    campaign_description,
    template_key, 
    delivery_channels, 
    priority, 
    status,
    rate_limit_per_hour
) VALUES
    -- Identity domain campaigns
    ('identity', 'user.registered', 'Welcome New Users', 'Send welcome email to newly registered users', 'welcome_new_user', '["email"]'::jsonb, 100, 'active', 1000),
    ('identity', 'password.reset', 'Password Reset Request', 'Send password reset instructions', 'password_reset', '["email"]'::jsonb, 200, 'active', 500),
    ('identity', 'user.verified', 'Email Verified', 'Confirmation when email is verified', 'email_verified', '["email"]'::jsonb, 90, 'active', 1000),
    
    -- Story domain campaigns
    ('story', 'analysis.completed', 'Story Analysis Complete', 'Notify when AI analysis is done', 'story_analysis_done', '["email", "in_app"]'::jsonb, 80, 'active', 1000),
    ('story', 'published', 'Story Published', 'Notify when story goes public', 'story_published', '["email", "in_app"]'::jsonb, 90, 'active', 1000),
    ('story', 'shared', 'Story Shared', 'Notify when someone shares your story', 'story_shared', '["in_app"]'::jsonb, 70, 'active', 1000),
    
    -- Collaboration domain campaigns
    ('collaboration', 'invitation.sent', 'Story Collaboration Invitation', 'Invite users to collaborate on story', 'collaboration_invite', '["email", "sms"]'::jsonb, 150, 'active', 500),
    ('collaboration', 'invitation.accepted', 'Invitation Accepted', 'Notify when invitation is accepted', 'invitation_accepted', '["in_app"]'::jsonb, 80, 'active', 1000),
    ('collaboration', 'invitation.declined', 'Invitation Declined', 'Notify when invitation is declined', 'invitation_declined', '["in_app"]'::jsonb, 80, 'active', 1000),
    ('collaboration', 'submission.completed', 'Submission Complete', 'Notify when collaborator submits', 'submission_complete', '["email", "in_app"]'::jsonb, 85, 'active', 1000),
    ('collaboration', 'roleplay.ready', 'Roleplay Ready', 'Notify when roleplay video is ready', 'roleplay_ready', '["email", "in_app"]'::jsonb, 90, 'active', 1000),
    
    -- Narration domain campaigns
    ('narration', 'generation.completed', 'Narration Generated', 'Notify when narration audio is ready', 'narration_generated', '["in_app"]'::jsonb, 85, 'active', 1000),
    ('narration', 'ready', 'Narration Ready', 'Notify when narration is ready to play', 'narration_ready', '["email", "in_app"]'::jsonb, 85, 'active', 1000),
    
    -- Subscription domain campaigns
    ('subscription', 'created', 'Subscription Confirmation', 'Welcome to subscription plan', 'subscription_welcome', '["email"]'::jsonb, 100, 'active', 500),
    ('subscription', 'updated', 'Subscription Updated', 'Notify of subscription changes', 'subscription_updated', '["email"]'::jsonb, 95, 'active', 500),
    ('subscription', 'cancelled', 'Subscription Cancelled', 'Confirm subscription cancellation', 'subscription_cancelled', '["email"]'::jsonb, 95, 'active', 500),
    ('subscription', 'payment.failed', 'Payment Failed', 'Alert about failed payment', 'payment_failed', '["email", "sms"]'::jsonb, 250, 'active', 100)
ON CONFLICT (source_domain, source_event_type) DO UPDATE SET
    campaign_name = EXCLUDED.campaign_name,
    campaign_description = EXCLUDED.campaign_description,
    template_key = EXCLUDED.template_key,
    delivery_channels = EXCLUDED.delivery_channels,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
    updated_at = NOW();

-- Insert notification templates for each campaign
INSERT INTO notification_templates (
    campaign_id,
    template_key,
    channel,
    locale,
    subject_template,
    body_template,
    html_template,
    required_variables,
    optional_variables,
    is_active
) VALUES
    -- Welcome email template
    ((SELECT campaign_id FROM notification_campaigns WHERE source_event_type = 'user.registered'), 
     'welcome_new_user', 'email', 'en',
     'Welcome to {{appName}}!',
     'Hi {{userName}},\n\nWelcome to {{appName}}! We''re excited to have you join our storytelling community.\n\nGet started by creating your first story or exploring stories from other creators.\n\nBest regards,\nThe {{appName}} Team',
     '<h2>Welcome to {{appName}}!</h2><p>Hi {{userName}},</p><p>Welcome to our storytelling community! We''re thrilled to have you here.</p><p><a href="{{loginUrl}}">Get Started</a></p>',
     '["userName", "appName", "loginUrl"]'::jsonb,
     '[]'::jsonb,
     true),
     
    -- Password reset template
    ((SELECT campaign_id FROM notification_campaigns WHERE source_event_type = 'password.reset'),
     'password_reset', 'email', 'en',
     'Reset Your Password',
     'Hi {{userName}},\n\nYou requested to reset your password. Click the link below to create a new password:\n\n{{resetLink}}\n\nThis link will expire in {{expiryTime}}.\n\nIf you didn''t request this, please ignore this email.',
     '<h2>Reset Your Password</h2><p>Hi {{userName}},</p><p>Click the button below to reset your password:</p><p><a href="{{resetLink}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p><p>This link expires in {{expiryTime}}.</p>',
     '["userName", "resetLink", "expiryTime"]'::jsonb,
     '[]'::jsonb,
     true),
     
    -- Story collaboration invitation
    ((SELECT campaign_id FROM notification_campaigns WHERE source_event_type = 'collaboration.invitation.sent'),
     'collaboration_invite', 'email', 'en',
     '{{inviterName}} invited you to collaborate on "{{storyTitle}}"',
     'Hi {{recipientName}},\n\n{{inviterName}} has invited you to collaborate on their story "{{storyTitle}}".\n\n{{personalMessage}}\n\nClick here to accept: {{inviteLink}}\n\nThis invitation expires in {{expiryTime}}.',
     '<h2>You''re Invited to Collaborate!</h2><p>{{inviterName}} wants you to be part of their story "{{storyTitle}}".</p><blockquote>{{personalMessage}}</blockquote><p><a href="{{inviteLink}}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>',
     '["recipientName", "inviterName", "storyTitle", "inviteLink", "expiryTime"]'::jsonb,
     '["personalMessage"]'::jsonb,
     true),
     
    -- Story analysis complete
    ((SELECT campaign_id FROM notification_campaigns WHERE source_event_type = 'story.analysis.completed'),
     'story_analysis_done', 'in_app', 'en',
     'Story Analysis Complete',
     'Your story "{{storyTitle}}" has been analyzed! We found {{characterCount}} characters and {{emotionCount}} unique emotions. Check out the results!',
     NULL,
     '["storyTitle", "characterCount", "emotionCount"]'::jsonb,
     '[]'::jsonb,
     true),
     
    -- Payment failed notification
    ((SELECT campaign_id FROM notification_campaigns WHERE source_event_type = 'subscription.payment.failed'),
     'payment_failed', 'email', 'en',
     'Payment Failed - Action Required',
     'Hi {{userName}},\n\nWe were unable to process your payment of {{amount}} for your {{planName}} subscription.\n\nPlease update your payment method within {{gracePeriod}} to avoid service interruption.\n\nUpdate here: {{paymentUrl}}',
     '<h2>Payment Failed</h2><p>Hi {{userName}},</p><p>We couldn''t process your payment of <strong>{{amount}}</strong> for your {{planName}} subscription.</p><p style="color: red;">Please update your payment method within {{gracePeriod}} to continue using all features.</p><p><a href="{{paymentUrl}}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update Payment Method</a></p>',
     '["userName", "amount", "planName", "gracePeriod", "paymentUrl"]'::jsonb,
     '[]'::jsonb,
     true)
ON CONFLICT (template_key, campaign_id, channel, locale) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    html_template = EXCLUDED.html_template,
    required_variables = EXCLUDED.required_variables,
    optional_variables = EXCLUDED.optional_variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();