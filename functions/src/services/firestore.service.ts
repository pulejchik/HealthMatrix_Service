import * as admin from 'firebase-admin';
import {
  YClientsUserMapping,
  YClientsChatMapping,
  YClientsRecord,
  User,
  Chat,
  Message,
  Notification,
  FIRESTORE_COLLECTIONS,
  YClientsUserMappingCreate,
  YClientsChatMappingCreate,
  YClientsRecordCreate,
  ChatCreate,
  YClientsUserMappingUpdate,
  ChatUpdate,
} from '../types';

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

  async getYClientsUserMappingByStaffId(staffId: number): Promise<YClientsUserMapping | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_USERS_MAPPING)
      .where('staffId', '==', staffId)
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

  // ========== YClients Chat Mapping Operations ==========

  /**
   * Find chat mapping by staffId AND (clientId OR clientPhone)
   * Uses Firestore OR query for optimal performance
   */
  async getYClientsChatMappingByStaffAndClientOrPhone(
    staffId: number,
    clientId: number,
    clientPhone: string
  ): Promise<YClientsChatMapping | null> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .where('staffId', '==', staffId)
      .where(
        admin.firestore.Filter.or(
          admin.firestore.Filter.where('clientId', '==', clientId),
          admin.firestore.Filter.where('clientPhone', '==', clientPhone)
        )
      )
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

  // ========== YClients Record Operations (Subcollection) ==========

  async getYClientsRecord(chatId: string, recordId: string): Promise<YClientsRecord | null> {
    const doc = await this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .doc(chatId)
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_RECORDS)
      .doc(recordId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as YClientsRecord;
  }

  async createYClientsRecord(chatId: string, data: YClientsRecordCreate): Promise<YClientsRecord> {
    const { id, ...rest } = data;
    const docRef = id
      ? this.db
          .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
          .doc(chatId)
          .collection(FIRESTORE_COLLECTIONS.YCLIENTS_RECORDS)
          .doc(id)
      : this.db
          .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
          .doc(chatId)
          .collection(FIRESTORE_COLLECTIONS.YCLIENTS_RECORDS)
          .doc();

    await docRef.set(rest);

    return { id: docRef.id, ...rest };
  }

  async setYClientsRecord(chatId: string, data: YClientsRecord): Promise<YClientsRecord> {
    const { id, ...rest } = data;
    const docRef = this.db
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_CHATS_MAPPING)
      .doc(chatId)
      .collection(FIRESTORE_COLLECTIONS.YCLIENTS_RECORDS)
      .doc(id);

    await docRef.set(rest, { merge: true });

    return data;
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



  // ========== Chat Operations ==========

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

  async createChat(data: ChatCreate): Promise<Chat> {
    const now = Date.now();
    
    const chatData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };

    const docRef = this.db.collection(FIRESTORE_COLLECTIONS.CHATS).doc(data.id);
    await docRef.set(chatData);

    return { ...chatData };
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

  // ========== Message Operations ==========

  async getMessage(chatId: string, messageId: string): Promise<Message | null> {
    const doc = await this.db
      .collection(FIRESTORE_COLLECTIONS.CHATS)
      .doc(chatId)
      .collection(FIRESTORE_COLLECTIONS.MESSAGES)
      .doc(messageId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Message;
  }

  // ========== Notification Operations ==========

  async getPendingNotifications(): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS_PENDING)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));
  }

  async moveNotificationToSent(notification: Notification): Promise<void> {
    const batch = this.db.batch();

    // Add to sent collection
    const sentRef = this.db
      .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS_SENT)
      .doc(notification.id);
    batch.set(sentRef, notification);

    // Remove from pending collection
    const pendingRef = this.db
      .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS_PENDING)
      .doc(notification.id);
    batch.delete(pendingRef);

    await batch.commit();
  }

  async deleteNotification(id: string, isPending: boolean = true): Promise<void> {
    const collection = isPending 
      ? FIRESTORE_COLLECTIONS.NOTIFICATIONS_PENDING 
      : FIRESTORE_COLLECTIONS.NOTIFICATIONS_SENT;
    
    await this.db
      .collection(collection)
      .doc(id)
      .delete();
  }

  // ========== Utility Methods ==========

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
