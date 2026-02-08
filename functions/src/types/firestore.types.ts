/**
 * Firestore Document Types
 */

import * as admin from 'firebase-admin';

export interface YClientsUserMapping {
  id: string;
  clientId: number;
  phone: string;
  userToken: string;
  staffId: number | null;
  name: string;
}

export interface YClientsChatMapping {
  id: string;
  clientId: number;
  clientPhone: string;
  staffId: number;
  staffPhone?: string;
}

export interface YClientsRecord {
  id: string; // Will be set to recordId from YClients
  recordId: number;
  deleted: boolean;
  serviceTitle: string | null;
  serviceId: number | null;
  datetime: admin.firestore.Timestamp;
  attendance: number;
  length: number;
  payment_status: number;
  bookform_id?: number;
  staffName: string | null;
  clientName: string | null;
}

export interface User {
  id: string;
  yclientsId: string;
  name: string;
  avatar: string;
  fcm_token?: string;
  isNotificationsEnabled?: boolean | null;
}

export type ChatStatus = 'new' | 'active' | 'archived' | 'paused';

export interface Chat {
  id: string;
  yclientsId: string;
  users: string[];
  title: string | null;
  date: number | null; // epochMillis - Date from nearest active or last record
  staffName: string | null;
  clientName: string | null;
  createdAt: number; // epochMillis
  updatedAt: number; // epochMillis
  status: ChatStatus;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  fromUserId: string;
  toUserId: string;
  status: MessageStatus;
  createdAt: number; // epochMillis
  updatedAt: number; // epochMillis
}

export type NotificationType = 'newMessage' | 'chatUpdate' | 'system';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  text: string;
  fromUserId: string;
  toUserId: string;
  chatId?: string;
  messageId?: string;
  status: NotificationStatus;
  createdAt: number; // epochMillis
  updatedAt: number; // epochMillis
}

/**
 * Collection paths
 */
export const FIRESTORE_COLLECTIONS = {
  YCLIENTS_USERS_MAPPING: 'yclients/mapping/yclientsUsers',
  YCLIENTS_CHATS_MAPPING: 'yclients/mapping/yclientsChats',
  YCLIENTS_RECORDS: 'yclientsRecords', // Subcollection under yclientsChats
  USERS: 'users',
  CHATS: 'chats',
  MESSAGES: 'messages',
  NOTIFICATIONS_PENDING: 'notifications/references/pending',
  NOTIFICATIONS_SENT: 'notifications/references/sent',
} as const;

/**
 * Partial types for updates (all fields optional except id)
 */
export type YClientsUserMappingUpdate = Partial<Omit<YClientsUserMapping, 'id'>> & { id: string };
export type YClientsChatMappingUpdate = Partial<Omit<YClientsChatMapping, 'id'>> & { id: string };
export type YClientsRecordUpdate = Partial<Omit<YClientsRecord, 'id'>> & { id: string };
export type UserUpdate = Partial<Omit<User, 'id'>> & { id: string };
export type ChatUpdate = Partial<Omit<Chat, 'id'>> & { id: string };
export type NotificationUpdate = Partial<Omit<Notification, 'id'>> & { id: string };

/**
 * Create types (id is optional, Firestore can generate it)
 */
export type YClientsUserMappingCreate = Omit<YClientsUserMapping, 'id'> & { id?: string };
export type YClientsChatMappingCreate = Omit<YClientsChatMapping, 'id'> & { id?: string };
export type YClientsRecordCreate = Omit<YClientsRecord, 'id'> & { id?: string };
export type UserCreate = Omit<User, 'id'> & { id?: string };
export type ChatCreate = Omit<Chat, 'id'> & { id: string };
export type NotificationCreate = Omit<Notification, 'id'> & { id?: string };
