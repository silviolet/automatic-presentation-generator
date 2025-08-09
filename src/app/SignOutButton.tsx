"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export default function SignOutLink() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      setSignedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  if (!signedIn) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await firebase.auth().signOut();
      window.location.href = "/login"; // redirect after sign out
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  return (
    <Link
      href="/login"
      onClick={handleClick}
      className="text-gray-700 hover:text-blue-600 font-medium transition"
    >
      Sign Out
    </Link>
  );
}