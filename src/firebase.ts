import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Non-blocking connection test
void getDocFromServer(doc(db, 'settings', 'app_config')).catch((err) => {
  if (err instanceof Error && err.message.includes('the client is offline')) {
    console.warn('Firestore client is currently offline; continuing with local fallback.');
  }
});

export default app;
