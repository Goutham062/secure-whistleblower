// Import the functions needed
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // This is the Database tool

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-KhXzPqP0Sb0Pm0tpBlgWpa_dWa-3hbM",
  authDomain: "whistleblower-6feb2.firebaseapp.com",
  projectId: "whistleblower-6feb2",
  storageBucket: "whistleblower-6feb2.firebasestorage.app",
  messagingSenderId: "1075460637872",
  appId: "1:1075460637872:web:21391d5260b0a40713a775",
  measurementId: "G-7101NZ7NFW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Database and Export it so we can use it in other files
export const db = getFirestore(app);