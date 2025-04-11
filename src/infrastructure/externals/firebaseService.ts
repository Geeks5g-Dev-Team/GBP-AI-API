import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirestoreService {
  constructor(@Inject('FIREBASE_ADMIN') private firestore: Firestore) {}

  async addDocument(collection: string, data: any): Promise<any> {
    const docRef = this.firestore.collection(collection).doc();
    const doc = await docRef.set(data);
    return docRef.id;
  }

  async getDocument(collection: string, id: string): Promise<any> {
    const doc = await this.firestore.collection(collection).doc(id).get();
    if (!doc.exists) {
      throw new Error('Document not found');
    }
    return doc.data();
  }

  async updateDocument(collection: string, id: string, data: any): Promise<void> {
    await this.firestore.collection(collection).doc(id).update(data);
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    await this.firestore.collection(collection).doc(id).delete();
  }

  async getAllDocuments(collection: string): Promise<any[]> {
    const snapshot = await this.firestore.collection(collection).get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
