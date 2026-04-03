import {
	createUserWithEmailAndPassword,
	deleteUser,
	EmailAuthProvider,
	reauthenticateWithCredential,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signOut,
	updatePassword,
	updateProfile,
	type User,
} from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseInitError } from './firebase';

export type RegisterInput = {
	email: string;
	password: string;
};

export type DeleteAccountVerificationInput = {
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

export async function requestPasswordReset(email: string): Promise<void> {
	const authClient = getAuthClient();
	await sendPasswordResetEmail(authClient, email.trim());
}

export async function deleteCurrentUserAccount(
	verification: DeleteAccountVerificationInput
): Promise<void> {
	const authClient = getAuthClient();
	const firestore = getDbClient();
	const currentUser = authClient.currentUser;
	const currentEmail = currentUser?.email;

	if (!currentUser) {
		throw new Error('Sinun täytyy kirjautua sisään ennen tilin poistamista.');
	}

	if (!currentEmail) {
		throw new Error('Tilin poistaminen vaatii sähköposti-kirjautumisen.');
	}

	const email = verification.email.trim();
	const password = verification.password;

	if (!email || !password) {
		throw new Error('Anna sähköposti ja salasana tilin poistamista varten.');
	}

	if (email.toLowerCase() !== currentEmail.toLowerCase()) {
		throw new Error('Syötetty sähköposti ei vastaa kirjautunutta käyttäjää.');
	}

	const credential = EmailAuthProvider.credential(email, password);
	await reauthenticateWithCredential(currentUser, credential);

	await deleteDoc(doc(firestore, 'users', currentUser.uid));
	await deleteUser(currentUser);
	await signOut(authClient);
}

