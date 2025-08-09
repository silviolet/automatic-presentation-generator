"use client";

import { useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebaseui/dist/firebaseui.css"; // CSS is safe to import at top

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export default function LoginPage() {
  useEffect(() => {
    // Ensure Firebase is initialized
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // Dynamically import firebaseui only in browser
    import("firebaseui").then((firebaseui) => {
      const ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(firebase.auth());

      const uiConfig: firebaseui.auth.Config = {
        callbacks: {
          signInSuccessWithAuthResult: () => true,
          uiShown: () => {
            const loader = document.getElementById("loader");
            if (loader) loader.style.display = "none";
          },
        },
        signInFlow: "popup",
        signInSuccessUrl: "/",
        signInOptions: [
            {
            provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
            // Optional tweaks:
            requireDisplayName: false, // no name prompt on sign-up
            // signInMethod: firebase.auth.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD,
            // Or for passwordless:
            // signInMethod: firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
          },
          firebase.auth.GoogleAuthProvider.PROVIDER_ID
        ],
        
      };

      ui.start("#firebaseui-auth-container", uiConfig);
    });
  }, []);

  return (
  <div className="min-h-screen flex flex-col justify-center items-center text-center bg-gray-100 p-4">
    <h1 className="text-3xl font-bold mb-6">Login</h1>
    <div
      id="firebaseui-auth-container"
      className="w-full max-w-sm bg-white p-6 rounded-lg shadow-lg"
    />
    <div id="loader" className="mt-4 text-gray-500">
      Loading…
    </div>
  </div>
);
}