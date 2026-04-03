import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	updatePassword,
	updateProfile,
	type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseInitError } from './firebase';

export type RegisterInput = {
	email: string;
	password: string;
};

function getAuthClient() {
	if (firebaseInitError) {
		throw new Error(firebaseInitError);
	}

	if (!auth) {
		throw new Error('Firebase auth is not initialized.');
	}

	return auth;
}

function getDbClient() {
	if (firebaseInitError) {
		throw new Error(firebaseInitError);
	}

	if (!db) {
		throw new Error('Firestore is not initialized.');
	}

	return db;
}

export async function registerUser({ email, password }: RegisterInput): Promise<User> {
	const authClient = getAuthClient();
	const result = await createUserWithEmailAndPassword(authClient, email.trim(), password);

	if (result.user.email) {
		await updateProfile(result.user, {
			displayName: result.user.email,
		});
	}

	const firestore = getDbClient();
	await setDoc(doc(firestore, 'users', result.user.uid), {
		id: result.user.uid,
		email: result.user.email,
		name: result.user.displayName ?? result.user.email ?? null,
		createdAt: serverTimestamp(),
	});

	return result.user;
}

export async function signInUser({ email, password }: RegisterInput): Promise<User> {
	const authClient = getAuthClient();
	const result = await signInWithEmailAndPassword(authClient, email.trim(), password);
	return result.user;
}

export async function signOutUser(): Promise<void> {
	const authClient = getAuthClient();
	await signOut(authClient);
}

export async function changeCurrentUserPassword(newPassword: string): Promise<void> {
	const authClient = getAuthClient();
	const currentUser = authClient.currentUser;

	if (!currentUser) {
		throw new Error('Sinun täytyy kirjautua sisään ennen salasanan vaihtoa.');
	}

	await updatePassword(currentUser, newPassword);
}

