// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDxV8qrgDjczLMp5xx-9zJO5lEAvekphOg",
  authDomain: "expense-b3d21.firebaseapp.com",
  projectId: "expense-b3d21",
  storageBucket: "expense-b3d21.appspot.com",
  messagingSenderId: "285478715834",
  appId: "1:285478715834:web:90909090909090909090",
  // measurementId is optional
  measurementId: "G-0000000000"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 