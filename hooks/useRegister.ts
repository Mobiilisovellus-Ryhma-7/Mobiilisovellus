import * as React from 'react';
import { registerUser } from '../services/auth';

interface UseRegisterState {
	email: string;
	password: string;
	isSubmitting: boolean;
	errorMessage: string | null;
}

interface UseRegisterActions {
	setEmail: (email: string) => void;
	setPassword: (password: string) => void;
	handleRegister: () => Promise<void>;
}

export function useRegister(onRegisterSuccess?: () => void): UseRegisterState & UseRegisterActions {
	const [email, setEmail] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const handleRegister = React.useCallback(async () => {
		const trimmedEmail = email.trim();

		if (!trimmedEmail) {
			setErrorMessage('Syötä sähköposti.');
			return;
		}

		if (password.length < 6) {
			setErrorMessage('Salasanan on oltava vähintään 6 merkkiä.');
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			await registerUser({
				email: trimmedEmail,
				password,
			});
			onRegisterSuccess?.();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Rekisteröinti epäonnistui.');
		} finally {
			setIsSubmitting(false);
		}
	}, [email, onRegisterSuccess, password]);

	return {
		email,
		password,
		isSubmitting,
		errorMessage,
		setEmail,
		setPassword,
		handleRegister,
	};
}
