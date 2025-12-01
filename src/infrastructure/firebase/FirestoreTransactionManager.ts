// infrastructure/database/FirestoreTransactionManager.ts

import { getDbAndAuth } from './config/firebaseAdmin';

export class FirestoreTransactionManager {
    async run<T>(callback: (transaction: FirebaseFirestore.Transaction) => Promise<T>): Promise<T> {
        const { db } = await getDbAndAuth();
        return db.runTransaction(callback);
    }
}
