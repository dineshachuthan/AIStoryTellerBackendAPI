/**
 * Singleton State Manager - Centralized state management with database-driven enums
 * Follows mandatory architectural patterns: database-first, type-safe, configuration-driven
 */

import { eq, and } from "drizzle-orm";
import { db } from "../server/db";
import { appStates, stateTransitions } from "./schema";
import type { StateType, StateDefinition, StateTransition } from "./state-config";
import { DEFAULT_STATE_DEFINITIONS, DEFAULT_STATE_TRANSITIONS } from "./state-config";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  requiredPermission?: string;
}

export interface StateStats {
  totalStates: number;
  activeStates: number;
  transitionRules: number;
  lastUpdate: Date;
}

/**
 * Singleton StateManager - Single source of truth for all application states
 * Implements centralized state management with database constraints and type safety
 */
export class StateManager {
  private static instance: StateManager;
  private initialized = false;
  private stateCache = new Map<StateType, StateDefinition[]>();
  private transitionCache = new Map<StateType, StateTransition[]>();
  
  // Startup-optimized enums - created once at initialization
  private stateEnums: Record<StateType, Record<string, StateDefinition>> = {} as any;
  private transitionEnums: Record<StateType, Record<string, StateTransition>> = {} as any;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Initialize state manager - loads all states from database and seeds default data if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if states exist, if not seed default data
      const existingStates = await db.select().from(appStates).limit(1);
      
      if (existingStates.length === 0) {
        await this.seedDefaultStates();
      }

      // Load all states and transitions into memory cache AND create enums
      await this.loadStatesFromDatabase();
      await this.loadTransitionsFromDatabase();
      await this.createStartupEnums();

      this.initialized = true;
      console.log('StateManager initialized successfully - all states cached in memory for zero database calls');
    } catch (error) {
      console.error('Failed to initialize StateManager:', error);
      throw error;
    }
  }

  /**
   * Get all valid states for a specific state type (NO DATABASE CALLS - uses startup cache)
   */
  async getValidStates(stateType: StateType): Promise<StateDefinition[]> {
    await this.ensureInitialized();
    return this.stateCache.get(stateType) || [];
  }

  /**
   * Get state by key using enum lookup (INSTANT - no database calls)
   */
  getStateByKey(stateType: StateType, stateKey: string): StateDefinition | undefined {
    if (!this.initialized) {
      throw new Error('StateManager not initialized - call initialize() first');
    }
    return this.stateEnums[stateType]?.[stateKey];
  }

  /**
   * Get all state keys as enum (INSTANT - no database calls)
   */
  getStateKeys(stateType: StateType): string[] {
    if (!this.initialized) {
      throw new Error('StateManager not initialized - call initialize() first');
    }
    return Object.keys(this.stateEnums[stateType] || {});
  }

  /**
   * Check if state exists (INSTANT - no database calls)
   */
  hasState(stateType: StateType, stateKey: string): boolean {
    if (!this.initialized) {
      throw new Error('StateManager not initialized - call initialize() first');
    }
    return stateKey in (this.stateEnums[stateType] || {});
  }

  /**
   * Get transition by key using enum lookup (INSTANT - no database calls)
   */
  getTransitionByKey(stateType: StateType, fromState: string, toState: string): StateTransition | undefined {
    if (!this.initialized) {
      throw new Error('StateManager not initialized - call initialize() first');
    }
    const key = `${fromState}_to_${toState}`;
    return this.transitionEnums[stateType]?.[key];
  }

  /**
   * Check if transition exists (INSTANT - no database calls) 
   */
  hasTransition(stateType: StateType, fromState: string, toState: string): boolean {
    if (!this.initialized) {
      throw new Error('StateManager not initialized - call initialize() first');
    }
    const key = `${fromState}_to_${toState}`;
    return key in (this.transitionEnums[stateType] || {});
  }

  /**
   * Get valid transitions from a specific state
   */
  async getValidTransitions(stateType: StateType, fromState: string): Promise<string[]> {
    await this.ensureInitialized();
    const transitions = this.transitionCache.get(stateType) || [];
    return transitions
      .filter(t => t.fromState === fromState)
      .map(t => t.toState);
  }

  /**
   * Check if a state transition is valid
   */
  async canTransition(stateType: StateType, fromState: string, toState: string): Promise<boolean> {
    await this.ensureInitialized();
    const transitions = this.transitionCache.get(stateType) || [];
    return transitions.some(t => 
      t.fromState === fromState && 
      t.toState === toState
    );
  }

  /**
   * Validate a state transition with detailed result
   */
  async validateStateTransition(
    stateType: StateType, 
    fromState: string, 
    toState: string,
    hasPermission = false
  ): Promise<ValidationResult> {
    await this.ensureInitialized();
    
    const transitions = this.transitionCache.get(stateType) || [];
    const transition = transitions.find(t => 
      t.fromState === fromState && 
      t.toState === toState
    );

    if (!transition) {
      return {
        isValid: false,
        reason: `Invalid transition from '${fromState}' to '${toState}' for ${stateType}`
      };
    }

    if (transition.requiresPermission && !hasPermission) {
      return {
        isValid: false,
        reason: `Transition requires admin permission`,
        requiredPermission: 'admin'
      };
    }

    return { isValid: true };
  }

  /**
   * Get the initial state for a state type
   */
  async getInitialState(stateType: StateType): Promise<string> {
    await this.ensureInitialized();
    const states = this.stateCache.get(stateType) || [];
    const initialState = states.find(s => s.isInitial);
    return initialState?.stateKey || 'draft';
  }

  /**
   * Get all terminal states for a state type
   */
  async getTerminalStates(stateType: StateType): Promise<string[]> {
    await this.ensureInitialized();
    const states = this.stateCache.get(stateType) || [];
    return states
      .filter(s => s.isTerminal)
      .map(s => s.stateKey);
  }

  /**
   * Check if a state is terminal (final)
   */
  async isTerminalState(stateType: StateType, stateKey: string): Promise<boolean> {
    const terminalStates = await this.getTerminalStates(stateType);
    return terminalStates.includes(stateKey);
  }

  /**
   * Get display name for a state
   */
  async getStateDisplayName(stateType: StateType, stateKey: string): Promise<string> {
    await this.ensureInitialized();
    const states = this.stateCache.get(stateType) || [];
    const state = states.find(s => s.stateKey === stateKey);
    return state?.displayName || stateKey;
  }

  /**
   * Get state statistics (OPTIMIZED - uses cached data, no database calls)
   */
  async getStats(): Promise<StateStats> {
    await this.ensureInitialized();
    
    // Calculate stats from cached data instead of database queries
    let totalStates = 0;
    let totalTransitions = 0;
    
    for (const states of this.stateCache.values()) {
      totalStates += states.length;
    }
    
    for (const transitions of this.transitionCache.values()) {
      totalTransitions += transitions.length;
    }
    
    return {
      totalStates,
      activeStates: totalStates, // All cached states are active
      transitionRules: totalTransitions,
      lastUpdate: new Date()
    };
  }

  /**
   * Add a new state type dynamically (for extensibility)
   */
  async addStateType(
    stateType: StateType, 
    states: StateDefinition[], 
    transitions: StateTransition[]
  ): Promise<void> {
    try {
      // Insert states
      for (const state of states) {
        await db.insert(appStates).values({
          stateType,
          stateKey: state.stateKey,
          displayName: state.displayName,
          description: state.description,
          isInitial: state.isInitial,
          isTerminal: state.isTerminal,
          sortOrder: state.sortOrder,
          isActive: state.isActive
        });
      }

      // Insert transitions
      for (const transition of transitions) {
        await db.insert(stateTransitions).values({
          stateType,
          fromState: transition.fromState,
          toState: transition.toState,
          isAutomatic: transition.isAutomatic,
          requiresPermission: transition.requiresPermission,
          validationRules: transition.validationRules
        });
      }

      // Refresh cache
      await this.loadStatesFromDatabase();
      await this.loadTransitionsFromDatabase();

      console.log(`Added new state type: ${stateType}`);
    } catch (error) {
      console.error(`Failed to add state type ${stateType}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache and reload from database
   */
  async refreshCache(): Promise<void> {
    this.stateCache.clear();
    this.transitionCache.clear();
    await this.loadStatesFromDatabase();
    await this.loadTransitionsFromDatabase();
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async seedDefaultStates(): Promise<void> {
    console.log('Seeding default state definitions...');
    
    try {
      // Insert all default states
      for (const [stateType, states] of Object.entries(DEFAULT_STATE_DEFINITIONS)) {
        for (const state of states) {
          await db.insert(appStates).values({
            stateType: stateType as StateType,
            stateKey: state.stateKey,
            displayName: state.displayName,
            description: state.description,
            isInitial: state.isInitial,
            isTerminal: state.isTerminal,
            sortOrder: state.sortOrder,
            isActive: state.isActive
          });
        }
      }

      // Insert all default transitions
      for (const [stateType, transitions] of Object.entries(DEFAULT_STATE_TRANSITIONS)) {
        for (const transition of transitions) {
          await db.insert(stateTransitions).values({
            stateType: stateType as StateType,
            fromState: transition.fromState,
            toState: transition.toState,
            isAutomatic: transition.isAutomatic,
            requiresPermission: transition.requiresPermission,
            validationRules: transition.validationRules
          });
        }
      }

      console.log('Default state definitions seeded successfully');
    } catch (error) {
      console.error('Failed to seed default states:', error);
      throw error;
    }
  }

  private async loadStatesFromDatabase(): Promise<void> {
    const states = await db.select().from(appStates).where(eq(appStates.isActive, true));
    
    // Group by state type
    const statesByType = states.reduce((acc, state) => {
      const stateType = state.stateType as StateType;
      if (!acc[stateType]) acc[stateType] = [];
      
      acc[stateType].push({
        stateKey: state.stateKey,
        displayName: state.displayName,
        description: state.description || '',
        isInitial: state.isInitial || false,
        isTerminal: state.isTerminal || false,
        sortOrder: state.sortOrder || 0,
        isActive: state.isActive || true
      });
      
      return acc;
    }, {} as Record<StateType, StateDefinition[]>);

    // Sort by sort order and update cache
    for (const [stateType, stateList] of Object.entries(statesByType)) {
      stateList.sort((a, b) => a.sortOrder - b.sortOrder);
      this.stateCache.set(stateType as StateType, stateList);
    }
  }

  private async loadTransitionsFromDatabase(): Promise<void> {
    const transitions = await db.select().from(stateTransitions);
    
    // Group by state type
    const transitionsByType = transitions.reduce((acc, transition) => {
      const stateType = transition.stateType as StateType;
      if (!acc[stateType]) acc[stateType] = [];
      
      acc[stateType].push({
        fromState: transition.fromState,
        toState: transition.toState,
        isAutomatic: transition.isAutomatic || false,
        requiresPermission: transition.requiresPermission || false,
        validationRules: transition.validationRules || undefined
      });
      
      return acc;
    }, {} as Record<StateType, StateTransition[]>);

    // Update cache
    for (const [stateType, transitionList] of Object.entries(transitionsByType)) {
      this.transitionCache.set(stateType as StateType, transitionList);
    }
  }

  /**
   * Create startup enums for instant state/transition lookups (ZERO DATABASE CALLS)
   */
  private async createStartupEnums(): Promise<void> {
    console.log('Creating startup enums for zero-database-call state access...');
    
    // Create state enums for instant lookup
    const stateTypes: StateType[] = ['story', 'story_instance', 'video_job', 'voice_training', 'story_processing'];
    
    for (const stateType of stateTypes) {
      this.stateEnums[stateType] = {};
      const states = this.stateCache.get(stateType) || [];
      
      for (const state of states) {
        this.stateEnums[stateType][state.stateKey] = state;
      }
    }

    // Create transition enums for instant lookup
    for (const stateType of stateTypes) {
      this.transitionEnums[stateType] = {};
      const transitions = this.transitionCache.get(stateType) || [];
      
      for (const transition of transitions) {
        const key = `${transition.fromState}_to_${transition.toState}`;
        this.transitionEnums[stateType][key] = transition;
      }
    }
    
    console.log('Startup enums created - state lookups now instant without database queries');
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();