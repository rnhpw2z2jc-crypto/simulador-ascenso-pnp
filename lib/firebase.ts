import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAOboGde-tOx9ah4uw-HLNoN0usZjJSHm4",
  authDomain: "simulador-pnp-b57f0.firebaseapp.com",
  projectId: "simulador-pnp-b57f0",
  storageBucket: "simulador-pnp-b57f0.firebasestorage.app",
  messagingSenderId: "505579661436",
  appId: "1:505579661436:web:5bc6559f7de902e20e41f9",
  measurementId: "G-PNJ9ZBXKDR"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
