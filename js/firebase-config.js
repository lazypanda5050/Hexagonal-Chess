const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDyHzOkUqaG8umPKxobR5ga0G6Gr8TpMW4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "hexagonal-chess.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://hexagonal-chess-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "hexagonal-chess",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "hexagonal-chess.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "629805933278",
  appId: process.env.FIREBASE_APP_ID || "1:629805933278:web:49c666f8a87ce6751b184f",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-DKBT4BMSXD"
};