// Firebase configuration for OneZap SaaS
// DO NOT commit this file to public repositories

export const firebaseConfig = {
    apiKey: "AIzaSyDiTsG7Ve_6tM64BujhK8JGludvkWxyYGc",
    authDomain: "onezap-saas.firebaseapp.com",
    projectId: "onezap-saas",
    storageBucket: "onezap-saas.firebasestorage.app",
    messagingSenderId: "77330882999",
    appId: "1:77330882999:web:26ccadbc51fcb14b73c832"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
