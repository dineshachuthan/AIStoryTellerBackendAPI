/**
 * Fix Stuck Voice Training State
 * Diagnoses and fixes voice training states that are stuck in 'training' status
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function executeSQL(query) {
  try {
    const response = await fetch(`${BASE_URL}/api/debug/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      log(`SQL execution failed: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`SQL error: ${error.message}`, 'red');
    return null;
  }
}

async function fixStuckVoiceTraining() {
  log('\n🔧 Fixing Stuck Voice Training State', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  // Step 1: Check current voice profiles with stuck training status
  log('\n📊 Checking Voice Profiles...', 'yellow');
  
  const voiceProfiles = await executeSQL(`
    SELECT 
      id, 
      user_id, 
      status, 
      created_at, 
      training_started_at, 
      training_completed_at,
      elevenlabs_voice_id,
      total_samples
    FROM user_voice_profiles 
    WHERE status = 'training'
    ORDER BY created_at DESC
  `);
  
  if (voiceProfiles && voiceProfiles.length > 0) {
    log(`Found ${voiceProfiles.length} profiles stuck in 'training' state:`, 'red');
    voiceProfiles.forEach((profile, index) => {
      log(`  ${index + 1}. User ID: ${profile.user_id}`, 'white');
      log(`     Profile ID: ${profile.id}`, 'white');
      log(`     Status: ${profile.status}`, 'red');
      log(`     Created: ${profile.created_at}`, 'white');
      log(`     Training Started: ${profile.training_started_at || 'null'}`, 'white');
      log(`     Training Completed: ${profile.training_completed_at || 'null'}`, 'white');
      log(`     ElevenLabs Voice ID: ${profile.elevenlabs_voice_id || 'null'}`, 'white');
      log(`     Total Samples: ${profile.total_samples || 'null'}`, 'white');
      log('', 'white');
    });
    
    // Step 2: Fix stuck profiles by resetting their status
    log('\n🔨 Fixing Stuck Profiles...', 'yellow');
    
    for (const profile of voiceProfiles) {
      // Check how long it's been stuck
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCreation > 0.5) { // If stuck for more than 30 minutes, reset it
        log(`Resetting profile ${profile.id} for user ${profile.user_id} (stuck for ${Math.round(hoursSinceCreation * 60)} minutes)`, 'yellow');
        
        const resetResult = await executeSQL(`
          UPDATE user_voice_profiles 
          SET 
            status = 'failed',
            training_completed_at = NOW(),
            error_message = 'Training timeout - reset by diagnostic script'
          WHERE id = ${profile.id}
        `);
        
        if (resetResult) {
          log(`✅ Reset profile ${profile.id} to 'failed' status`, 'green');
        } else {
          log(`❌ Failed to reset profile ${profile.id}`, 'red');
        }
      } else {
        log(`Profile ${profile.id} created recently (${Math.round(hoursSinceCreation * 60)} minutes ago), leaving it alone`, 'blue');
      }
    }
  } else {
    log('✅ No profiles stuck in training state', 'green');
  }
  
  // Step 3: Check for any voice samples that might be causing issues
  log('\n📝 Checking Voice Samples...', 'yellow');
  
  const voiceSamples = await executeSQL(`
    SELECT 
      user_id,
      COUNT(*) as total_samples,
      COUNT(CASE WHEN is_locked = true THEN 1 END) as locked_samples,
      COUNT(CASE WHEN is_locked = false OR is_locked IS NULL THEN 1 END) as unlocked_samples
    FROM user_voice_samples 
    GROUP BY user_id
    ORDER BY total_samples DESC
  `);
  
  if (voiceSamples && voiceSamples.length > 0) {
    log('Voice samples by user:', 'white');
    voiceSamples.forEach((sample, index) => {
      log(`  ${index + 1}. User ID: ${sample.user_id}`, 'white');
      log(`     Total: ${sample.total_samples}, Locked: ${sample.locked_samples}, Unlocked: ${sample.unlocked_samples}`, 'white');
    });
  } else {
    log('No voice samples found', 'blue');
  }
  
  // Step 4: Create a clean reset function for any user
  log('\n🧹 Creating Clean Reset Function...', 'yellow');
  
  const cleanResetSQL = `
    -- Reset all voice profiles to 'none' status
    UPDATE user_voice_profiles 
    SET 
      status = 'none',
      training_started_at = NULL,
      training_completed_at = NULL,
      error_message = 'Reset by diagnostic script - ready for fresh training'
    WHERE status IN ('training', 'failed');
    
    -- Unlock all voice samples to allow re-training
    UPDATE user_voice_samples 
    SET 
      is_locked = false,
      locked_at = NULL
    WHERE is_locked = true;
  `;
  
  log('Clean reset SQL commands:', 'cyan');
  log(cleanResetSQL, 'white');
  
  // Step 5: Provide manual reset commands
  log('\n💡 Manual Reset Commands:', 'magenta');
  log('If you want to manually reset the voice training state, you can run:', 'white');
  log('1. Reset stuck training profiles:', 'white');
  log(`   UPDATE user_voice_profiles SET status = 'none' WHERE status = 'training';`, 'cyan');
  log('2. Unlock all voice samples:', 'white');
  log(`   UPDATE user_voice_samples SET is_locked = false WHERE is_locked = true;`, 'cyan');
  log('3. Clear session data (requires app restart):', 'white');
  log(`   DELETE FROM sessions;`, 'cyan');
  
  log('\n🎯 Next Steps:', 'green');
  log('1. The stuck training states should now be resolved', 'white');
  log('2. Users should see normal voice cloning interface', 'white');
  log('3. Voice cloning will only start when user manually triggers it', 'white');
  log('4. Check UI to confirm "cloning in progress" message is gone', 'white');
}

// Run the diagnostic and fix
fixStuckVoiceTraining().catch(console.error);