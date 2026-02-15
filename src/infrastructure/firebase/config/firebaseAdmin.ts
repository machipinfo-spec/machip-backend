import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { ParameterStoreManager } from '../../utils/parameterStoreManager';

// Parameter Storeから認証情報を取得して初期化
const region = process.env.AWS_REGION || 'ap-northeast-1';
const parameterManager = new ParameterStoreManager(region);
let firebaseAdmin;

async function initializeFirebaseAdmin() {
    if (getApps().length === 0) {
        // パラメータストアから値を取得
        const credential = await parameterManager.getParameter('/tetra/firebase/credential');

        firebaseAdmin = initializeApp({
            credential: cert(JSON.parse(credential)), // ← 修正
        });
        // 初期化できたか確認
    } else {
        firebaseAdmin = getApp();
    }
    return firebaseAdmin;
}

// Firestoreインスタンスとauthを取得する非同期関数
export async function getDbAndAuth() {
    const app = await initializeFirebaseAdmin();
    const db = getFirestore(app);
    const auth = getAuth(app);
    return { db, auth };
}

// verifyIdTokenも非同期で初期化後に利用
export const verifyIdToken = async (token: string): Promise<admin.auth.DecodedIdToken | null> => {
    try {
        const { auth } = await getDbAndAuth();
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.log('Error verifying token:', error);
        return null;
    }
};

// Messagingインスタンスを取得する非同期関数
import { getMessaging } from 'firebase-admin/messaging';
export async function getMessagingService() {
    const app = await initializeFirebaseAdmin();
    return getMessaging(app);
}
