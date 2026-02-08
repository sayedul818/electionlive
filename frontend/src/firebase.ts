import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
	apiKey: "AIzaSyDnmXiyJ3SuZCRZ6ZYS4Sy_sHEUDcoiw20",
	authDomain: "election-auth-aa380.firebaseapp.com",
	projectId: "election-auth-aa380",
	storageBucket: "election-auth-aa380.firebasestorage.app",
	messagingSenderId: "533765645549",
	appId: "1:533765645549:web:11d9eebd7393dc19c398e4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
