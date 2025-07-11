/**
 * Database-driven State Manager Singleton
 * Loads all application states and transitions from database on startup
 */

import { db } from "./db";
import { appStates, stateTransitions } from "@shared/schema/schema";
import { eq } from "drizzle-orm";

interface StateDefinition {
  stateKey: string;
  displayName: string;
  description: string;
  isInitial: boolean;
  isTerminal: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface StateTransition {
  fromState: string;
  toState: string;
  isAutomatic: boolean;
  requiresPermission: boolean;
  validationRules?: Record<string, any>;
}

export class StateManager {
  private static instance: StateManager;
  private states: Map<string, Map<string, StateDefinition>> = new Map();
  private transitions: Map<string, StateTransition[]> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Initialize state manager by loading all states from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[StateManager] Loading states from database...');
      
      // Load all states
      const allStates = await db.select().from(appStates);
      
      // Group states by type
      for (const state of allStates) {
        if (!this.states.has(state.stateType)) {
          this.states.set(state.stateType, new Map());
        }
        
        const stateMap = this.states.get(state.stateType)!;
        stateMap.set(state.stateKey, {
          stateKey: state.stateKey,
          displayName: state.displayName,
          description: state.description,
          isInitial: state.isInitial,
          isTerminal: state.isTerminal,
          sortOrder: state.sortOrder,
          isActive: state.isActive
        });
      }

      // Load all transitions
      const allTransitions = await db.select().from(stateTransitions);
      
      // Group transitions by type
      for (const transition of allTransitions) {
        if (!this.transitions.has(transition.stateType)) {
          this.transitions.set(transition.stateType, []);
        }
        
        const transitionList = this.transitions.get(transition.stateType)!;
        transitionList.push({
          fromState: transition.fromState,
          toState: transition.toState,
          isAutomatic: transition.isAutomatic,
          requiresPermission: transition.requiresPermission,
          validationRules: transition.validationRules as Record<string, any>
        });
      }

      this.initialized = true;
      console.log(`[StateManager] Loaded ${allStates.length} states and ${allTransitions.length} transitions`);
      
      // Log story states for verification
      const storyStates = this.getStatesForType('story');
      console.log(`[StateManager] Story states:`, storyStates.map(s => `${s.stateKey}(${s.sortOrder})`).join(' → '));
      
    } catch (error) {
      console.error('[StateManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get all states for a specific type
   */
  getStatesForType(stateType: string): StateDefinition[] {
    if (!this.initialized) {
      throw new Error('StateManager not initialized. Call initialize() first.');
    }
    
    const stateMap = this.states.get(stateType);
    if (!stateMap) {
      return [];
    }
    
    return Array.from(stateMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get specific state definition
   */
  getState(stateType: string, stateKey: string): StateDefinition | undefined {
    if (!this.initialized) {
      throw new Error('StateManager not initialized. Call initialize() first.');
    }
    
    const stateMap = this.states.get(stateType);
    return stateMap?.get(stateKey);
  }

  /**
   * Get all transitions for a specific type
   */
  getTransitionsForType(stateType: string): StateTransition[] {
    if (!this.initialized) {
      throw new Error('StateManager not initialized. Call initialize() first.');
    }
    
    return this.transitions.get(stateType) || [];
  }

  /**
   * Get valid transitions from a specific state
   */
  getValidTransitionsFrom(stateType: string, fromState: string): StateTransition[] {
    const allTransitions = this.getTransitionsForType(stateType);
    return allTransitions.filter(t => t.fromState === fromState);
  }

  /**
   * Check if a state transition is valid
   */
  isValidTransition(stateType: string, fromState: string, toState: string): boolean {
    const validTransitions = this.getValidTransitionsFrom(stateType, fromState);
    return validTransitions.some(t => t.toState === toState);
  }

  /**
   * Get initial state for a type
   */
  getInitialState(stateType: string): StateDefinition | undefined {
    const states = this.getStatesForType(stateType);
    return states.find(s => s.isInitial);
  }

  /**
   * Get terminal states for a type
   */
  getTerminalStates(stateType: string): StateDefinition[] {
    const states = this.getStatesForType(stateType);
    return states.filter(s => s.isTerminal);
  }

  /**
   * Get story states (convenience method)
   */
  getStoryStates(): StateDefinition[] {
    return this.getStatesForType('story');
  }

  /**
   * Get story transitions (convenience method)
   */
  getStoryTransitions(): StateTransition[] {
    return this.getTransitionsForType('story');
  }

  /**
   * Check if story state transition is valid
   */
  isValidStoryTransition(fromState: string, toState: string): boolean {
    return this.isValidTransition('story', fromState, toState);
  }

  /**
   * Get display name for a state
   */
  getStateDisplayName(stateType: string, stateKey: string): string {
    const state = this.getState(stateType, stateKey);
    return state?.displayName || stateKey;
  }

  /**
   * Force reload states from database
   */
  async reload(): Promise<void> {
    this.initialized = false;
    this.states.clear();
    this.transitions.clear();
    await this.initialize();
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();