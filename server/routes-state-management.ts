/**
 * State Management API Routes
 * Provides centralized state management endpoints following mandatory architectural patterns
 */

import { Router } from "express";
import { z } from "zod";
import { stateManager } from "../shared/state-manager";
import { requireAuth, requireAdmin } from "./auth";
import type { StateType } from "../shared/state-config";

const router = Router();

// Validation schemas
const StateTypeSchema = z.enum(['story', 'story_instance', 'video_job', 'voice_training', 'story_processing']);
const TransitionValidationSchema = z.object({
  stateType: StateTypeSchema,
  fromState: z.string(),
  toState: z.string(),
  hasPermission: z.boolean().optional().default(false)
});

/**
 * GET /api/states/:stateType - Get all valid states for a state type (OPTIMIZED - no database calls)
 */
router.get('/states/:stateType', async (req, res) => {
  try {
    const { stateType } = req.params;
    
    // Validate state type
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    // Get states from state manager (uses startup cache - no database calls)
    const states = await stateManager.getValidStates(validatedStateType);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      states,
      count: states.length,
      cached: true // Indicate this uses cached data
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 'Invalid state type' : 'Failed to fetch states'
    });
  }
});

/**
 * GET /api/states/:stateType/initial - Get initial state for a state type
 */
router.get('/states/:stateType/initial', async (req, res) => {
  try {
    const { stateType } = req.params;
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    const initialState = await stateManager.getInitialState(validatedStateType);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      initialState
    });
  } catch (error) {
    console.error('Error fetching initial state:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch initial state'
    });
  }
});

/**
 * GET /api/states/:stateType/terminal - Get terminal states for a state type
 */
router.get('/states/:stateType/terminal', async (req, res) => {
  try {
    const { stateType } = req.params;
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    const terminalStates = await stateManager.getTerminalStates(validatedStateType);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      terminalStates
    });
  } catch (error) {
    console.error('Error fetching terminal states:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch terminal states'
    });
  }
});

/**
 * GET /api/states/:stateType/transitions/:fromState - Get valid transitions from a state (OPTIMIZED - no database calls)
 */
router.get('/states/:stateType/transitions/:fromState', async (req, res) => {
  try {
    const { stateType, fromState } = req.params;
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    const validTransitions = await stateManager.getValidTransitions(validatedStateType, fromState);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      fromState,
      validTransitions,
      cached: true // Indicate this uses cached data
    });
  } catch (error) {
    console.error('Error fetching valid transitions:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch valid transitions'
    });
  }
});

/**
 * POST /api/states/validate-transition - Validate a state transition
 */
router.post('/validate-transition', requireAuth, async (req, res) => {
  try {
    const validatedData = TransitionValidationSchema.parse(req.body);
    
    const validation = await stateManager.validateStateTransition(
      validatedData.stateType,
      validatedData.fromState,
      validatedData.toState,
      validatedData.hasPermission
    );
    
    res.json({
      success: true,
      validation,
      transition: {
        stateType: validatedData.stateType,
        from: validatedData.fromState,
        to: validatedData.toState
      },
      cached: true // Uses cached state data
    });
  } catch (error) {
    console.error('Error validating transition:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 'Invalid transition data' : 'Failed to validate transition'
    });
  }
});

/**
 * GET /api/states/:stateType/:stateKey/display-name - Get display name for a state
 */
router.get('/states/:stateType/:stateKey/display-name', async (req, res) => {
  try {
    const { stateType, stateKey } = req.params;
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    const displayName = await stateManager.getStateDisplayName(validatedStateType, stateKey);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      stateKey,
      displayName
    });
  } catch (error) {
    console.error('Error fetching display name:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch display name'
    });
  }
});

/**
 * GET /api/states/stats - Get state management statistics (admin only)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await stateManager.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching state stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch state statistics'
    });
  }
});

/**
 * POST /api/states/refresh-cache - Refresh state cache (admin only)
 */
router.post('/refresh-cache', requireAdmin, async (req, res) => {
  try {
    await stateManager.refreshCache();
    
    res.json({
      success: true,
      message: 'State cache refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing state cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh state cache'
    });
  }
});

/**
 * GET /api/states/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Simple health check - try to get story states
    const storyStates = await stateManager.getValidStates('story');
    
    res.json({
      success: true,
      status: 'healthy',
      stateTypesLoaded: storyStates.length > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('State management health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'State management system not functioning'
    });
  }
});

/**
 * GET /api/states/:stateType/exists/:stateKey - Check if state exists (INSTANT - no database calls)
 */
router.get('/states/:stateType/exists/:stateKey', async (req, res) => {
  try {
    const { stateType, stateKey } = req.params;
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    const exists = stateManager.hasState(validatedStateType, stateKey);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      stateKey,
      exists,
      instant: true // No database calls - instant enum lookup
    });
  } catch (error) {
    console.error('Error checking state existence:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 'Invalid state type' : 'Failed to check state existence'
    });
  }
});

/**
 * GET /api/states/:stateType/transitions/:fromState/:toState/exists - Check if transition exists (INSTANT - no database calls)
 */
router.get('/states/:stateType/transitions/:fromState/:toState/exists', async (req, res) => {
  try {
    const { stateType, fromState, toState } = req.params;
    const validatedStateType = StateTypeSchema.parse(stateType);
    
    const exists = stateManager.hasTransition(validatedStateType, fromState, toState);
    
    res.json({
      success: true,
      stateType: validatedStateType,
      fromState,
      toState,
      exists,
      instant: true // No database calls - instant enum lookup
    });
  } catch (error) {
    console.error('Error checking transition existence:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 'Invalid state type' : 'Failed to check transition existence'
    });
  }
});

export { router as stateManagementRoutes };