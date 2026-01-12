import * as admin from 'firebase-admin';
import {
  YClientsUserMapping,
  YClientsChatMapping,
  User,
  Chat,
  FIRESTORE_COLLECTIONS,
  YClientsUserMappingCreate,
  YClientsChatMappingCreate,
  UserCreate,
  ChatCreate,
  YClientsUserMappingUpdate,
  YClientsChatMappingUpdate,
  UserUpdate,
  ChatUpdate,
} from '../types/firestore.types';

/**
 * Firestore Service
 * Handles all database operations for the HealthMatrix Service
 */
export class FirestoreService {
  private readonly db: admin.firestore.Firestore;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  // ========== YClients User Mapping Operations ==========

  async getYClientsUserMapping(id: string): Promise<YClientsUserMapping | null> {
    const doc = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as YClientsUserMapping;
  }

  async getYClientsUserMappingByClientId(clientId: number): Promise<YClientsUserMapping | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .where('clientId', '==', clientId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as YClientsUserMapping;
  }

  async getYClientsUserMappingByPhone(phone: string): Promise<YClientsUserMapping | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as YClientsUserMapping;
  }

  async createYClientsUserMapping(data: YClientsUserMappingCreate): Promise<YClientsUserMapping> {
    const { id, ...rest } = data;
    const docRef = id
      ? this.db.collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING).doc(id)
      : this.db.collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING).doc();

    await docRef.set(rest);

    return { id: docRef.id, ...rest };
  }

  async updateYClientsUserMapping(data: YClientsUserMappingUpdate): Promise<YClientsUserMapping> {
    const { id, ...updates } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .doc(id);

    await docRef.update(updates);

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as YClientsUserMapping;
  }

  async setYClientsUserMapping(data: YClientsUserMapping): Promise<YClientsUserMapping> {
    const { id, ...rest } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .doc(id);

    await docRef.set(rest, { merge: true });

    return data;
  }

  async deleteYClientsUserMapping(id: string): Promise<void> {
    await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .doc(id)
      .delete();
  }

  // ========== YClients Chat Mapping Operations ==========

  async getYClientsChatMapping(id: string): Promise<YClientsChatMapping | null> {
    const doc = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as YClientsChatMapping;
  }

  async getYClientsChatMappingByRecordId(recordId: number): Promise<YClientsChatMapping | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .where('recordId', '==', recordId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as YClientsChatMapping;
  }

  async createYClientsChatMapping(data: YClientsChatMappingCreate): Promise<YClientsChatMapping> {
    const { id, ...rest } = data;
    const docRef = id
      ? this.db.collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING).doc(id)
      : this.db.collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING).doc();

    await docRef.set(rest);

    return { id: docRef.id, ...rest };
  }

  async updateYClientsChatMapping(data: YClientsChatMappingUpdate): Promise<YClientsChatMapping> {
    const { id, ...updates } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .doc(id);

    await docRef.update(updates);

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as YClientsChatMapping;
  }

  async setYClientsChatMapping(data: YClientsChatMapping): Promise<YClientsChatMapping> {
    const { id, ...rest } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .doc(id);

    await docRef.set(rest, { merge: true });

    return data;
  }

  async deleteYClientsChatMapping(id: string): Promise<void> {
    await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .doc(id)
      .delete();
  }

  // ========== User Operations ==========

  async getUser(id: string): Promise<User | null> {
    const doc = await this.db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as User;
  }

  async getUserByYClientsId(yclientsId: string): Promise<User | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .where('yclientsId', '==', yclientsId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async getUsers(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    // Firestore 'in' queries support up to 10 items
    const chunks = this.chunkArray(ids, 10);
    const allUsers: User[] = [];

    for (const chunk of chunks) {
      const snapshot = await this.db
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
        .get();

      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as User));

      allUsers.push(...users);
    }

    return allUsers;
  }

  async createUser(data: UserCreate): Promise<User> {
    const { id, ...rest } = data;
    const docRef = id
      ? this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc(id)
      : this.db.collection(FIRESTORE_COLLECTIONS.USERS).doc();

    await docRef.set(rest);

    return { id: docRef.id, ...rest };
  }

  async updateUser(data: UserUpdate): Promise<User> {
    const { id, ...updates } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .doc(id);

    await docRef.update(updates);

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as User;
  }

  async setUser(data: User): Promise<User> {
    const { id, ...rest } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .doc(id);

    await docRef.set(rest, { merge: true });

    return data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .doc(id)
      .delete();
  }

  // ========== Chat Operations ==========

  async getChat(id: string): Promise<Chat | null> {
    const doc = await this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Chat;
  }

  async getChatByYClientsId(yclientsId: string): Promise<Chat | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .where('yclientsId', '==', yclientsId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Chat;
  }

  async getChatsByUser(userId: string): Promise<Chat[]> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .where('users', 'array-contains', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Chat));
  }

  async getChatsByStatus(status: string): Promise<Chat[]> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .where('status', '==', status)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Chat));
  }

  async createChat(data: ChatCreate): Promise<Chat> {
    const { id, ...rest } = data;
    const now = Date.now();
    
    const chatData = {
      ...rest,
      createdAt: rest.createdAt || now,
      updatedAt: rest.updatedAt || now,
    };

    const docRef = id
      ? this.db.collection(FIRESTORE_COLLECTIONS.CHATS).doc(id)
      : this.db.collection(FIRESTORE_COLLECTIONS.CHATS).doc();

    await docRef.set(chatData);

    return { id: docRef.id, ...chatData };
  }

  async updateChat(data: ChatUpdate): Promise<Chat> {
    const { id, ...updates } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .doc(id);

    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };

    await docRef.update(updateData);

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Chat;
  }

  async setChat(data: Chat): Promise<Chat> {
    const { id, ...rest } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .doc(id);

    const chatData = {
      ...rest,
      updatedAt: Date.now(),
    };

    await docRef.set(chatData, { merge: true });

    return { id, ...chatData };
  }

  async deleteChat(id: string): Promise<void> {
    await this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .doc(id)
      .delete();
  }

  // ========== Utility Methods ==========

  /**
   * Helper method to chunk arrays for Firestore 'in' queries (max 10 items)
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Batch operations for better performance
   */
  getBatch(): admin.firestore.WriteBatch {
    return this.db.batch();
  }

  /**
   * Transaction support
   */
  runTransaction<T>(
    updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
  ): Promise<T> {
    return this.db.runTransaction(updateFunction);
  }

  /**
   * Get Firestore instance for advanced operations
   */
  getFirestore(): admin.firestore.Firestore {
    return this.db;
  }
}

export function createFirestoreService(db?: admin.firestore.Firestore): FirestoreService {
  return new FirestoreService(db);
}
