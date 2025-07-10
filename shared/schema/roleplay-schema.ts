import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { stories } from "./schema";

// Role Play Projects - references existing stories
export const rolePlayProjects = pgTable("roleplay_projects", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(), // Reference to original story
  title: text("title").notNull(), // Role play specific title (can be different from story title)
  genre: text("genre"),
  overallTone: text("overall_tone"),
  totalScenes: integer("total_scenes").default(0),
  estimatedPlaytime: integer("estimated_playtime"), // in minutes
  isPublished: boolean("is_published").default(false),
  visibility: text("visibility").default("private"), // private, public, shared
  collaborators: text("collaborators").array().default([]), // user IDs who can edit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Play Scenes - detailed scene breakdown
export const rolePlayScenes = pgTable("roleplay_scenes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => rolePlayProjects.id).notNull(),
  sceneNumber: integer("scene_number").notNull(),
  title: text("title").notNull(),
  emotionalTone: text("emotional_tone"),
  estimatedDuration: integer("estimated_duration"), // in seconds
  
  // Scene Background
  location: text("location"),
  timeOfDay: text("time_of_day"),
  atmosphere: text("atmosphere"),
  visualDescription: text("visual_description"),
  soundscape: text("soundscape"),
  lighting: text("lighting"),
  
  // Stage directions and production notes
  stageDirections: text("stage_directions").array().default([]),
  productionNotes: text("production_notes").array().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Play Characters - specific to roleplay projects
export const rolePlayCharacters = pgTable("roleplay_characters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => rolePlayProjects.id).notNull(),
  name: text("name").notNull(),
  role: text("role"), // protagonist, antagonist, supporting, narrator
  personality: text("personality"),
  voiceProfile: text("voice_profile"),
  costumeSuggestion: text("costume_suggestion"),
  characterNotes: text("character_notes"),
  
  // Voice assignments for this character
  assignedVoice: text("assigned_voice"), // OpenAI voice or user voice ID
  voiceModulation: jsonb("voice_modulation"), // Speed, pitch modifications
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Play Dialogues - individual dialogue lines
export const rolePlayDialogues = pgTable("roleplay_dialogues", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").references(() => rolePlayScenes.id).notNull(),
  characterId: integer("character_id").references(() => rolePlayCharacters.id).notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  
  dialogue: text("dialogue").notNull(),
  emotion: text("emotion").notNull(),
  intensity: integer("intensity").notNull(), // 1-10
  action: text("action"), // Stage direction for this line
  
  // Audio generation data
  audioUrl: text("audio_url"),
  audioGenerated: boolean("audio_generated").default(false),
  voiceUsed: text("voice_used"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Play Productions - generated audio/video content
export const rolePlayProductions = pgTable("roleplay_productions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => rolePlayProjects.id).notNull(),
  productionType: text("production_type").notNull(), // audio_only, video, presentation
  
  // Production metadata
  totalDuration: integer("total_duration"), // in seconds
  sceneCount: integer("scene_count"),
  characterCount: integer("character_count"),
  
  // Generated content URLs
  audioTrackUrl: text("audio_track_url"),
  videoUrl: text("video_url"),
  presentationUrl: text("presentation_url"),
  
  // Production settings
  backgroundMusic: boolean("background_music").default(false),
  soundEffects: boolean("sound_effects").default(false),
  visualEffects: boolean("visual_effects").default(false),
  
  generatedAt: timestamp("generated_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
});

// Role Play Performances - user recordings and performances
export const rolePlayPerformances = pgTable("roleplay_performances", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => rolePlayProjects.id).notNull(),
  performerId: varchar("performer_id").notNull(),
  characterId: integer("character_id").references(() => rolePlayCharacters.id),
  
  performanceType: text("performance_type").notNull(), // full_production, character_voice, scene_recording
  audioUrl: text("audio_url"),
  duration: integer("duration"), // in seconds
  
  // Performance metadata
  scenesPerformed: text("scenes_performed").array().default([]),
  qualityRating: integer("quality_rating"), // 1-10
  performanceNotes: text("performance_notes"),
  
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Role Play Templates - reusable scene templates
export const rolePlayTemplates = pgTable("roleplay_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"), // genre-based categorization
  description: text("description"),
  
  // Template structure
  sceneStructure: jsonb("scene_structure"), // Template for scenes
  characterArchetypes: jsonb("character_archetypes"), // Template for characters
  dialoguePatterns: jsonb("dialogue_patterns"), // Common dialogue structures
  
  isPublic: boolean("is_public").default(false),
  createdBy: varchar("created_by").notNull(),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for Zod validation
export const insertRolePlayProjectSchema = createInsertSchema(rolePlayProjects);
export const insertRolePlaySceneSchema = createInsertSchema(rolePlayScenes);
export const insertRolePlayCharacterSchema = createInsertSchema(rolePlayCharacters);
export const insertRolePlayDialogueSchema = createInsertSchema(rolePlayDialogues);
export const insertRolePlayProductionSchema = createInsertSchema(rolePlayProductions);
export const insertRolePlayPerformanceSchema = createInsertSchema(rolePlayPerformances);
export const insertRolePlayTemplateSchema = createInsertSchema(rolePlayTemplates);

// Types for TypeScript
export type RolePlayProject = typeof rolePlayProjects.$inferSelect;
export type RolePlayScene = typeof rolePlayScenes.$inferSelect;
export type RolePlayCharacter = typeof rolePlayCharacters.$inferSelect;
export type RolePlayDialogue = typeof rolePlayDialogues.$inferSelect;
export type RolePlayProduction = typeof rolePlayProductions.$inferSelect;
export type RolePlayPerformance = typeof rolePlayPerformances.$inferSelect;
export type RolePlayTemplate = typeof rolePlayTemplates.$inferSelect;

export type InsertRolePlayProject = z.infer<typeof insertRolePlayProjectSchema>;
export type InsertRolePlayScene = z.infer<typeof insertRolePlaySceneSchema>;
export type InsertRolePlayCharacter = z.infer<typeof insertRolePlayCharacterSchema>;
export type InsertRolePlayDialogue = z.infer<typeof insertRolePlayDialogueSchema>;
export type InsertRolePlayProduction = z.infer<typeof insertRolePlayProductionSchema>;
export type InsertRolePlayPerformance = z.infer<typeof insertRolePlayPerformanceSchema>;
export type InsertRolePlayTemplate = z.infer<typeof insertRolePlayTemplateSchema>;