import * as React from 'react';
import { signInUser } from '../services/auth';

interface UseLoginState {
	email: string;
	password: string;
	secureEntry: boolean;
	isSubmitting: boolean;
	errorMessage: string | null;
}

interface UseLoginActions {
	setEmail: (email: string) => void;
	setPassword: (password: string) => void;
	toggleSecureEntry: () => void;
	handleLogin: () => Promise<void>;
}

export function useLogin(onLoginSuccess?: () => void): UseLoginState & UseLoginActions {
	const [email, setEmail] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [secureEntry, setSecureEntry] = React.useState(true);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const handleLogin = React.useCallback(async () => {
		const trimmedEmail = email.trim();

		if (!trimmedEmail) {
			setErrorMessage('Syötä sähköposti.');
			return;
		}

		if (!password) {
			setErrorMessage('Syötä salasana.');
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			await signInUser({
				email: trimmedEmail,
				password,
			});
			onLoginSuccess?.();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Kirjautuminen epäonnistui.');
		} finally {
			setIsSubmitting(false);
		}
	}, [email, onLoginSuccess, password]);

	const toggleSecureEntry = React.useCallback(() => {
		setSecureEntry((prev) => !prev);
	}, []);

	return {
		email,
		password,
		secureEntry,
		isSubmitting,
		errorMessage,
		setEmail,
		setPassword,
		toggleSecureEntry,
		handleLogin,
	};
}
