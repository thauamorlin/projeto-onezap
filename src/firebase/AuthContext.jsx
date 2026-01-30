import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user profile from Firestore
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                } else {
                    // Create initial profile for new users
                    const newProfile = {
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || '',
                        photoURL: firebaseUser.photoURL || '',
                        createdAt: new Date().toISOString(),
                        plan: 'free', // Default plan
                        instanceLimit: 1
                    };
                    await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
                    setUserProfile(newProfile);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Email/Password Sign In
    const signIn = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Email/Password Sign Up
    const signUp = async (email, password, displayName) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile
        await setDoc(doc(db, 'users', result.user.uid), {
            email,
            displayName: displayName || '',
            photoURL: '',
            createdAt: new Date().toISOString(),
            plan: 'trial', // 7-day trial
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            instanceLimit: 1
        });
        return result;
    };

    // Google Sign In
    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    // Sign Out
    const logout = async () => {
        return signOut(auth);
    };

    // Password Reset
    const resetPassword = async (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const value = {
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        resetPassword,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
