import * as React from 'react';
import { requestPasswordReset } from '../services/auth';

interface UsePasswordResetState {
	email: string;
	isSubmitting: boolean;
	errorMessage: string | null;
	successMessage: string | null;
}

interface UsePasswordResetActions {
	setEmail: (email: string) => void;
	handleResetPassword: () => Promise<void>;
}

export function usePasswordReset(): UsePasswordResetState & UsePasswordResetActions {
	const [email, setEmail] = React.useState('');
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

	const handleResetPassword = React.useCallback(async () => {
		const trimmedEmail = email.trim();

		if (!trimmedEmail) {
			setErrorMessage('Syötä sähköposti.');
			setSuccessMessage(null);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);
		setSuccessMessage(null);

		try {
			await requestPasswordReset(trimmedEmail);
			setSuccessMessage('Salasanan palautuslinkki lähetetty sähköpostiisi.');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Palautus epäonnistui.';
			setErrorMessage(message);
		} finally {
			setIsSubmitting(false);
		}
	}, [email]);

	return {
		email,
		isSubmitting,
		errorMessage,
		successMessage,
		setEmail,
		handleResetPassword,
	};
}
