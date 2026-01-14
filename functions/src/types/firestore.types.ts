/**
 * Firestore Document Types
 */

export interface YClientsUserMapping {
  id: string;
  clientId: number;
  phone: string;
  userToken: string;
  staffId: number | null;
}

export interface YClientsChatMapping {
  id: string;
  clientId: number;
  clientPhone: string;
  staffId: number;
  recordId: number;
}

export interface User {
  id: string;
  yclientsId: string;
  name: string;
  avatar: string;
}

export type ChatStatus = 'new' | 'active' | 'archived' | 'paused';

export interface Chat {
  id: string;
  yclientsId: string;
  users: string[];
  title: string | null;
  createdAt: number; // epochMillis
  updatedAt: number; // epochMillis
  status: ChatStatus;
}

/**
 * Collection paths
 */
export const FIRESTORE_COLLECTIONS = {
  YCLIENTS_USERS_MAPPING: 'yclients/mapping/yclientsUsers',
  YCLIENTS_CHATS_MAPPING: 'yclients/mapping/yclientsChats',
  USERS: 'users',
  CHATS: 'chats',
} as const;

/**
 * Partial types for updates (all fields optional except id)
 */
export type YClientsUserMappingUpdate = Partial<Omit<YClientsUserMapping, 'id'>> & { id: string };
export type YClientsChatMappingUpdate = Partial<Omit<YClientsChatMapping, 'id'>> & { id: string };
export type UserUpdate = Partial<Omit<User, 'id'>> & { id: string };
export type ChatUpdate = Partial<Omit<Chat, 'id'>> & { id: string };

/**
 * Create types (id is optional, Firestore can generate it)
 */
export type YClientsUserMappingCreate = Omit<YClientsUserMapping, 'id'> & { id?: string };
export type YClientsChatMappingCreate = Omit<YClientsChatMapping, 'id'> & { id?: string };
export type UserCreate = Omit<User, 'id'> & { id?: string };
export type ChatCreate = Omit<Chat, 'id'> & { id: string };
