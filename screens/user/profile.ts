import React from 'react';
import {
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	SafeAreaView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import { auth } from '../../services/firebase';
import {
	changeCurrentUserPassword,
	deleteCurrentUserAccount,
	signOutUser,
} from '../../services/auth';

type ProfileProps = {
	onBack?: () => void;
	onSignOut?: () => void;
	onGoHome?: () => void;
	isDarkMode: boolean;
	onToggleDarkMode: () => void;
};

export default function Profile({
	onBack,
	onSignOut,
	onGoHome,
	isDarkMode,
	onToggleDarkMode,
}: ProfileProps) {
	const { colors } = useTheme();
	const { width } = useWindowDimensions();
	const metrics = getResponsiveMetrics(width);
	const userEmail = auth?.currentUser?.email ?? 'Käyttäjänimi';
	const styles = React.useMemo(() => createStyles(metrics, colors), [colors, metrics]);
	const [isSigningOut, setIsSigningOut] = React.useState(false);
	const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [deleteError, setDeleteError] = React.useState<string | null>(null);
	const [deleteEmail, setDeleteEmail] = React.useState('');
	const [deletePassword, setDeletePassword] = React.useState('');
	const [showPasswordForm, setShowPasswordForm] = React.useState(false);
	const [showDeleteModal, setShowDeleteModal] = React.useState(false);
	const [newPassword, setNewPassword] = React.useState('');
	const [confirmPassword, setConfirmPassword] = React.useState('');
	const [isChangingPassword, setIsChangingPassword] = React.useState(false);
	const [passwordMessage, setPasswordMessage] = React.useState<string | null>(null);
	const [passwordError, setPasswordError] = React.useState<string | null>(null);

	const openPasswordModal = React.useCallback(() => {
		setPasswordError(null);
		setPasswordMessage(null);
		setShowPasswordForm(true);
	}, []);

	const closePasswordModal = React.useCallback(() => {
		setShowPasswordForm(false);
	}, []);

	const openDeleteModal = React.useCallback(() => {
		setDeleteError(null);
		setDeleteEmail(auth?.currentUser?.email ?? '');
		setDeletePassword('');
		setShowDeleteModal(true);
	}, []);

	const closeDeleteModal = React.useCallback(() => {
		if (isDeletingAccount) {
			return;
		}

		setShowDeleteModal(false);
	}, [isDeletingAccount]);

	const handleSignOut = React.useCallback(async () => {
		setIsSigningOut(true);
		setErrorMessage(null);

		try {
			await signOutUser();
			onSignOut?.();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Uloskirjautuminen epäonnistui.');
		} finally {
			setIsSigningOut(false);
		}
	}, [onSignOut]);

	const handleChangePassword = React.useCallback(async () => {
		setPasswordError(null);
		setPasswordMessage(null);

		if (newPassword.length < 6) {
			setPasswordError('Salasanan on oltava vähintään 6 merkkiä.');
			return;
		}

		if (newPassword !== confirmPassword) {
			setPasswordError('Salasanat eivät täsmää.');
			return;
		}

		setIsChangingPassword(true);

		try {
			await changeCurrentUserPassword(newPassword);
			setPasswordMessage('Salasana vaihdettu onnistuneesti.');
			setNewPassword('');
			setConfirmPassword('');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Salasanan vaihto epäonnistui.';
			setPasswordError(message);
		} finally {
			setIsChangingPassword(false);
		}
	}, [confirmPassword, newPassword]);

	const handleDeleteAccount = React.useCallback(async () => {
		setDeleteError(null);

		if (!deleteEmail.trim() || !deletePassword) {
			setDeleteError('Anna sähköposti ja salasana ennen tilin poistamista.');
			return;
		}

		setIsDeletingAccount(true);

		try {
			await deleteCurrentUserAccount({
				email: deleteEmail.trim(),
				password: deletePassword,
			});
			setShowDeleteModal(false);
			onSignOut?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Tilin poistaminen epäonnistui.';
			setDeleteError(message);
		} finally {
			setIsDeletingAccount(false);
		}
	}, [deleteEmail, deletePassword, onSignOut]);

	return React.createElement(
		SafeAreaView,
		{ style: [styles.safeArea, { backgroundColor: colors.background }] },
		React.createElement(
			KeyboardAvoidingView,
			{
				style: [styles.screen, { backgroundColor: colors.background }],
				behavior: Platform.OS === 'ios' ? 'padding' : undefined,
				keyboardVerticalOffset: Platform.OS === 'ios' ? 12 : 0,
			},
			React.createElement(
				View,
				{ style: styles.headerRow },
				React.createElement(
					Pressable,
					{ style: styles.backButton, onPress: onBack },
					React.createElement(Text, { style: styles.backIcon, children: '‹' })
				),
				React.createElement(Text, {
					style: [styles.headerTitle, { color: colors.onSurface }],
					children: 'HALLILLE',
				}),
				React.createElement(View, { style: styles.headerSpacer })
			),
			React.createElement(
				Pressable,
				{ onPress: onGoHome },
				React.createElement(Image, {
					source: require('../../assets/dynamic-sport-hall-logo.png'),
					style: styles.logo,
					resizeMode: 'contain',
				})
			),

			React.createElement(
				View,
				{ style: styles.menuWrap },
				React.createElement(Text, {
					style: [styles.menuItem, { color: colors.onSurface }],
					children: userEmail,
				}),
				React.createElement(
					Pressable,
					{ onPress: openPasswordModal },
					React.createElement(Text, {
						style: [styles.menuItem, { color: colors.onSurface }],
						children: 'Vaihda salasanasi',
					})
				),
				React.createElement(
					Pressable,
					{ onPress: onToggleDarkMode },
					React.createElement(Text, {
						style: [styles.menuItem, { color: colors.onSurface }],
						children: isDarkMode ? 'Pimeä tila: Päällä' : 'Pimeä tila: Pois',
					})
				),
				React.createElement(Text, {
					style: [styles.menuItem, { color: colors.onSurface }],
					children: 'Omat varaukset',
				}),
				React.createElement(
					Pressable,
					{ onPress: openDeleteModal },
					React.createElement(Text, {
						style: [styles.menuItemDanger, { color: '#b91c1c' }],
						children: 'Poista käyttäjätili',
					})
				),
				errorMessage
					? React.createElement(Text, {
						style: styles.errorText,
						children: errorMessage,
					})
					: null,
				React.createElement(Button, {
					mode: 'contained',
					onPress: handleSignOut,
					style: styles.signOutButton,
					contentStyle: styles.signOutButtonContent,
					labelStyle: styles.signOutButtonLabel,
					loading: isSigningOut,
					disabled: isSigningOut,
					children: 'Kirjaudu ulos',
				})
			),
			React.createElement(
				Modal,
				{
					visible: showPasswordForm,
					transparent: true,
					animationType: 'fade',
					onRequestClose: closePasswordModal,
				},
				React.createElement(
					Pressable,
					{ style: styles.modalBackdrop, onPress: closePasswordModal },
					React.createElement(
						KeyboardAvoidingView,
						{
							style: styles.modalKeyboardWrap,
							behavior: Platform.OS === 'ios' ? 'padding' : undefined,
							keyboardVerticalOffset: Platform.OS === 'ios' ? 12 : 0,
						},
						React.createElement(
							Pressable,
							{ style: styles.modalCard, onPress: () => undefined },
							React.createElement(Text, {
								style: styles.modalTitle,
								children: 'Vaihda salasana',
							}),
							React.createElement(TextInput, {
								mode: 'outlined',
								secureTextEntry: true,
								label: 'Uusi salasana',
								value: newPassword,
								onChangeText: setNewPassword,
								style: styles.passwordInput,
							}),
							React.createElement(TextInput, {
								mode: 'outlined',
								secureTextEntry: true,
								label: 'Vahvista salasana',
								value: confirmPassword,
								onChangeText: setConfirmPassword,
								style: styles.passwordInput,
							}),
							passwordError
								? React.createElement(Text, {
									style: styles.errorText,
									children: passwordError,
								})
								: null,
							passwordMessage
								? React.createElement(Text, {
									style: styles.successText,
									children: passwordMessage,
								})
								: null,
							React.createElement(
								View,
								{ style: styles.modalActions },
								React.createElement(Button, {
									mode: 'text',
									onPress: closePasswordModal,
									children: 'Sulje',
								}),
								React.createElement(Button, {
									mode: 'contained',
									onPress: handleChangePassword,
									loading: isChangingPassword,
									disabled: isChangingPassword,
									style: styles.changePasswordButton,
									children: 'Tallenna',
								})
							)
						)
					)
				)
			),
			React.createElement(
				Modal,
				{
					visible: showDeleteModal,
					transparent: true,
					animationType: 'fade',
					onRequestClose: closeDeleteModal,
				},
				React.createElement(
					Pressable,
					{ style: styles.modalBackdrop, onPress: closeDeleteModal },
					React.createElement(
						Pressable,
						{ style: styles.modalCard, onPress: () => undefined },
						React.createElement(Text, {
							style: styles.modalTitle,
							children: 'Poista käyttäjätili',
						}),
						React.createElement(Text, {
							style: styles.modalDescription,
							children: 'Haluatko varmasti poistaa tilisi? Tätä toimintoa ei voi perua.',
						}),
						React.createElement(TextInput, {
							mode: 'outlined',
							label: 'Sähköposti',
							value: deleteEmail,
							onChangeText: setDeleteEmail,
							style: styles.passwordInput,
							autoCapitalize: 'none',
							keyboardType: 'email-address',
						}),
						React.createElement(TextInput, {
							mode: 'outlined',
							label: 'Salasana',
							value: deletePassword,
							onChangeText: setDeletePassword,
							secureTextEntry: true,
							style: styles.passwordInput,
						}),
						deleteError
							? React.createElement(Text, {
								style: styles.errorText,
								children: deleteError,
							})
							: null,
						React.createElement(
							View,
							{ style: styles.modalActions },
							React.createElement(Button, {
								mode: 'text',
								onPress: closeDeleteModal,
								disabled: isDeletingAccount,
								children: 'Peruuta',
							}),
							React.createElement(Button, {
								mode: 'contained',
								onPress: handleDeleteAccount,
								loading: isDeletingAccount,
								disabled: isDeletingAccount,
								buttonColor: '#b91c1c',
								children: 'Poista tili',
							})
						)
					)
				)
			)
		)
	);
}

const createStyles = (
	metrics: ReturnType<typeof getResponsiveMetrics>,
	colors: any
) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: '#ececec',
		},
		screen: {
			flex: 1,
			backgroundColor: '#ececec',
			paddingHorizontal: metrics.horizontalPadding,
			paddingTop: metrics.scale(20, 14, 30),
			paddingBottom: metrics.scale(20, 16, 28),
			alignItems: 'center',
		},
		headerRow: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		backButton: {
			width: metrics.scale(34, 32, 42),
			height: metrics.scale(34, 32, 42),
			borderRadius: metrics.scale(17, 16, 21),
			backgroundColor: colors.surfaceVariant,
			alignItems: 'center',
			justifyContent: 'center',
		},
		backIcon: {
			fontSize: metrics.scale(26, 20, 28),
			lineHeight: metrics.scale(26, 20, 28),
			color: colors.onSurface,
			marginTop: -2,
		},
		headerTitle: {
			fontSize: metrics.scale(30, 22, 36),
			fontWeight: '700',
			letterSpacing: 0.6,
		},
		headerSpacer: {
			width: metrics.scale(34, 32, 42),
			height: metrics.scale(34, 32, 42),
		},
		logo: {
			width: metrics.scale(118, 90, 136),
			height: metrics.scale(96, 74, 116),
			alignSelf: 'center',
			marginTop: metrics.scale(16, 10, 22),
		},
		menuWrap: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			marginTop: metrics.scale(26, 18, 38),
			gap: metrics.scale(32, 18, 40),
			paddingLeft: metrics.scale(10, 2, 14),
		},
		menuItem: {
			fontSize: metrics.scale(31, 20, 36),
			fontWeight: '600',
		},
		menuItemDanger: {
			fontSize: metrics.scale(28, 19, 34),
			fontWeight: '700',
		},
		modalBackdrop: {
			flex: 1,
			backgroundColor: 'rgba(15, 23, 42, 0.45)',
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: metrics.scale(16, 12, 22),
		},
		modalKeyboardWrap: {
			width: '100%',
			alignItems: 'center',
		},
		modalCard: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			backgroundColor: colors.surface,
			borderRadius: metrics.scale(16, 14, 22),
			paddingHorizontal: metrics.scale(14, 12, 20),
			paddingVertical: metrics.scale(14, 12, 20),
			gap: metrics.scale(10, 8, 14),
		},
		modalTitle: {
			fontSize: metrics.scale(20, 17, 24),
			fontWeight: '700',
			color: colors.onSurface,
		},
		modalDescription: {
			fontSize: metrics.scale(14, 12, 18),
			lineHeight: metrics.scale(20, 18, 24),
			color: colors.onSurfaceVariant,
		},
		modalActions: {
			marginTop: metrics.scale(4, 2, 8),
			flexDirection: 'row',
			justifyContent: 'flex-end',
			alignItems: 'center',
			gap: metrics.scale(8, 6, 12),
		},
		signOutButton: {
			marginTop: metrics.scale(12, 10, 18),
			borderRadius: metrics.scale(10, 10, 14),
			alignSelf: 'stretch',
		},
		passwordInput: {
			backgroundColor: colors.surface,
		},
		changePasswordButton: {
			borderRadius: metrics.scale(10, 8, 14),
		},
		signOutButtonContent: {
			height: metrics.scale(56, 48, 66),
		},
		signOutButtonLabel: {
			fontSize: metrics.scale(19, 16, 24),
			fontWeight: '700',
		},
		errorText: {
			marginTop: metrics.scale(8, 6, 12),
			color: '#b91c1c',
			fontSize: metrics.scale(14, 12, 18),
			fontWeight: '600',
		},
		successText: {
			marginTop: metrics.scale(6, 4, 10),
			color: '#0f766e',
			fontSize: metrics.scale(14, 12, 18),
			fontWeight: '600',
		},
	});
