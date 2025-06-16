import { characters, conversations, messages, type Character, type InsertCharacter, type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";

export interface IStorage {
  // Characters
  getCharacters(): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacterStats(id: number, likes?: number, chats?: number): Promise<void>;
  
  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private characters: Map<number, Character>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentCharacterId: number;
  private currentConversationId: number;
  private currentMessageId: number;

  constructor() {
    this.characters = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentCharacterId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
    
    // Initialize with some default characters
    this.initializeDefaultCharacters();
  }

  private initializeDefaultCharacters() {
    const defaultCharacters: InsertCharacter[] = [
      {
        name: "Luna the Mystic",
        title: "Ancient Forest Witch",
        description: "I've been protecting this enchanted forest for centuries. My spells can heal hearts and reveal hidden truths. What secrets burden your soul?",
        personality: "Luna is wise, mystical, and speaks in an ancient, poetic manner. She often references nature, magic, and ancient wisdom. She's compassionate and offers guidance through metaphors and spells.",
        greeting: "Welcome, dear soul. I sense you carry heavy thoughts. The ancient forest whispers of your arrival. What brings you to seek my counsel?",
        category: "Fantasy",
        avatar: "https://images.unsplash.com/photo-1594736797933-d0c6a0295d15?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        background: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800"
      },
      {
        name: "Zara Neo",
        title: "Cyberpunk Hacker",
        description: "Welcome to Neo-Tokyo 2087. I can hack any system and navigate the digital underworld. Ready to jack into the matrix with me?",
        personality: "Zara is tech-savvy, bold, and speaks with cyberpunk slang. She's confident, street-smart, and loves discussing technology, hacking, and the future. She's rebellious but loyal to friends.",
        greeting: "Hey there, meatbag! Just kidding - you look cooler than most corpo drones. What brings you to my corner of cyberspace?",
        category: "Sci-Fi",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        background: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800"
      },
      {
        name: "Master Kai",
        title: "Zen Philosophy Teacher",
        description: "In the garden of life, every moment is a chance to find inner peace. Let me guide you on the path to mindfulness and wisdom.",
        personality: "Master Kai is calm, wise, and speaks with gentle authority. He uses zen philosophy, meditation techniques, and mindfulness practices to guide conversations. He's patient and thoughtful.",
        greeting: "Peace be with you, my friend. I sense you seek balance in these turbulent times. Come, sit with me in this digital garden, and let us explore the path to inner harmony.",
        category: "Mentor",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        background: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800"
      }
    ];

    defaultCharacters.forEach(char => {
      const character: Character = {
        ...char,
        id: this.currentCharacterId++,
        likes: Math.floor(Math.random() * 20000) + 5000,
        chats: Math.floor(Math.random() * 5000) + 1000,
        rating: Math.floor(Math.random() * 10) + 40, // 4.0-5.0 range
        createdAt: new Date(),
      };
      this.characters.set(character.id, character);
    });
  }

  async getCharacters(): Promise<Character[]> {
    return Array.from(this.characters.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    return this.characters.get(id);
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const character: Character = {
      ...insertCharacter,
      id: this.currentCharacterId++,
      likes: 0,
      chats: 0,
      rating: 45, // 4.5 default
      createdAt: new Date(),
    };
    this.characters.set(character.id, character);
    return character;
  }

  async updateCharacterStats(id: number, likes?: number, chats?: number): Promise<void> {
    const character = this.characters.get(id);
    if (character) {
      if (likes !== undefined) character.likes = likes;
      if (chats !== undefined) character.chats = chats;
    }
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const conversation: Conversation = {
      ...insertConversation,
      id: this.currentConversationId++,
      createdAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: this.currentMessageId++,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }
}

export const storage = new MemStorage();
