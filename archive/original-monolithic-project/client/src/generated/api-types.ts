/**
 * Auto-generated API types from OpenAPI specification
 * Generated on: 2025-07-10T21:22:32.269Z
 * DO NOT EDIT MANUALLY
 */

// ===== Schema Types =====

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  language: string;
  locale?: string | null;
  nativeLanguage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: number;
  userId: string;
  title: string;
  content?: string | null;
  status: 'draft' | 'complete' | 'published';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: {
  } | null;
  characters?: {
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  storyId: number;
  inviteToken: string;
  inviteeEmail?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  conversationStyle?: string | null;
  createdAt: string;
  expiresAt: string;
  story?: {
    title?: string;
    content?: string;
  };
}

export interface StoryUpdateRequest {
  title?: string;
  content?: string;
  status?: 'draft' | 'complete' | 'published';
}

export interface Error {
  message: string;
  code?: string;
  details?: {
  };
}

// ===== Operation Types =====

export interface PostapiauthsignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface Postapiauthsignup200Response {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  language: string;
  locale?: string | null;
  nativeLanguage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Postapiauthsignup400Response {
  message: string;
  code?: string;
  details?: {
  };
}

export interface PostapiauthloginRequest {
  email: string;
  password: string;
}

export interface Postapiauthlogin200Response {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  language: string;
  locale?: string | null;
  nativeLanguage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Postapiauthlogin401Response {
  message: string;
  code?: string;
  details?: {
  };
}

export interface Getapiauthuser200Response {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  language: string;
  locale?: string | null;
  nativeLanguage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Getapiauthuser401Response {
  message: string;
  code?: string;
  details?: {
  };
}

export interface PutapiauthuserRequest {
  name?: string;
  language?: string;
}

export interface Putapiauthuser200Response {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  language: string;
  locale?: string | null;
  nativeLanguage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Getapistories200Response {
  id: number;
  userId: string;
  title: string;
  content?: string | null;
  status: 'draft' | 'complete' | 'published';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: {
  } | null;
  characters?: {
  }[];
  createdAt: string;
  updatedAt: string;
}[]

export interface GetapistoriesQueryParams {
  page?: number;
  limit?: number;
  status?: 'draft' | 'complete' | 'published';
}

export interface Getapistoriesid200Response {
  id: number;
  userId: string;
  title: string;
  content?: string | null;
  status: 'draft' | 'complete' | 'published';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: {
  } | null;
  characters?: {
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Getapistoriesid404Response {
  message: string;
  code?: string;
  details?: {
  };
}

export interface PutapistoriesidRequest {
  title?: string;
  content?: string;
  status?: 'draft' | 'complete' | 'published';
}

export interface Putapistoriesid200Response {
  id: number;
  userId: string;
  title: string;
  content?: string | null;
  status: 'draft' | 'complete' | 'published';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: {
  } | null;
  characters?: {
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Deleteapistoriesid200Response {
  success?: boolean;
}

export interface PostapistoriesdraftRequest {
  title?: string;
  content?: string;
  uploadType?: 'text' | 'voice' | 'audio';
}

export interface Postapistoriesdraft200Response {
  id: number;
  userId: string;
  title: string;
  content?: string | null;
  status: 'draft' | 'complete' | 'published';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: {
  } | null;
  characters?: {
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Getapiinvitationstoken200Response {
  id: string;
  storyId: number;
  inviteToken: string;
  inviteeEmail?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  conversationStyle?: string | null;
  createdAt: string;
  expiresAt: string;
  story?: {
    title?: string;
    content?: string;
  };
}

export interface Getapiinvitationstoken404Response {
  message: string;
  code?: string;
  details?: {
  };
}

// ===== API Client Interface =====

export interface APIClient {
  postapiauthsignup(data: PostapiauthsignupRequest): Promise<Postapiauthsignup200Response>;
  postapiauthlogin(data: PostapiauthloginRequest): Promise<Postapiauthlogin200Response>;
  getapiauthuser(): Promise<Getapiauthuser200Response>;
  putapiauthuser(data: PutapiauthuserRequest): Promise<Putapiauthuser200Response>;
  getapistories(query?: GetapistoriesQueryParams): Promise<Getapistories200Response>;
  getapistoriesid(id: number): Promise<Getapistoriesid200Response>;
  putapistoriesid(id: number, data: PutapistoriesidRequest): Promise<Putapistoriesid200Response>;
  deleteapistoriesid(id: number): Promise<Deleteapistoriesid200Response>;
  postapistoriesdraft(data: PostapistoriesdraftRequest): Promise<Postapistoriesdraft200Response>;
  getapiinvitationstoken(token: string): Promise<Getapiinvitationstoken200Response>;
}
