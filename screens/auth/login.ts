import React, { useState } from 'react';
import {
	Image,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import { signInUser } from '../../services/auth';

type LoginProps = {
	onBack?: () => void;
	onForgotPassword?: () => void;
	onRegister?: () => void;
	onLogin?: () => void;
	onGoHome?: () => void;
};

export default function Login({
	onBack,
	onForgotPassword,
	onRegister,
	onLogin,
	onGoHome,
}: LoginProps) {
	const { colors } = useTheme();
	const { width } = useWindowDimensions();
	const metrics = getResponsiveMetrics(width);
	const styles = React.useMemo(() => createStyles(metrics), [metrics]);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [secureEntry, setSecureEntry] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
			onLogin?.();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Kirjautuminen epäonnistui.');
		} finally {
			setIsSubmitting(false);
		}
	}, [email, onLogin, password]);

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
				ScrollView,
				{
					contentContainerStyle: styles.scrollContent,
					showsVerticalScrollIndicator: false,
					keyboardShouldPersistTaps: 'handled',
					keyboardDismissMode: 'on-drag',
				},
				React.createElement(
					View,
					{ style: styles.contentWrap },
			React.createElement(
				View,
				{ style: styles.headerRow },
				React.createElement(
					Pressable,
					{ style: styles.backButton, onPress: onBack },
					React.createElement(Text, { style: styles.backIcon, children: '‹' })
				),
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
			React.createElement(Text, {
				style: styles.brand,
				children: 'Hallille',
			}),

			React.createElement(Text, {
				style: [styles.title, { color: colors.onSurface }],
				children: 'Kirjaudu sisään',
			}),
			React.createElement(Text, {
				style: styles.subtitle,
				children: 'Hei, mukava nähdä sinua taas!',
			}),

			React.createElement(Text, {
				style: styles.label,
				children: 'Email',
			}),
			React.createElement(TextInput, {
				mode: 'flat',
				value: email,
				onChangeText: setEmail,
				placeholder: 'esimerkki@sposti.com',
				style: styles.input,
				underlineColor: '#d3d7dc',
				activeUnderlineColor: colors.primary,
				contentStyle: styles.inputContent,
			}),

			React.createElement(Text, {
				style: [styles.label, styles.passwordLabel],
				children: 'Password',
			}),
			React.createElement(TextInput, {
				mode: 'flat',
				value: password,
				onChangeText: setPassword,
				placeholder: 'Salasana',
				secureTextEntry: secureEntry,
				style: styles.input,
				underlineColor: '#d3d7dc',
				activeUnderlineColor: colors.primary,
				contentStyle: styles.inputContent,
				right: React.createElement(TextInput.Icon, {
					icon: secureEntry ? 'eye-outline' : 'eye-off-outline',
					onPress: () => setSecureEntry((prev) => !prev),
					forceTextInputFocus: false,
				}),
			}),

				errorMessage
					? React.createElement(Text, {
						style: styles.errorText,
						children: errorMessage,
					})
					: null,

			React.createElement(Button, {
				mode: 'contained',
					onPress: handleLogin,
				style: styles.loginButton,
				contentStyle: styles.loginButtonContent,
				labelStyle: styles.loginButtonLabel,
					loading: isSubmitting,
					disabled: isSubmitting,
				children: 'Kirjaudu sisään',
			}),

			React.createElement(
				View,
				{ style: styles.bottomLinks },
				React.createElement(
					Pressable,
					{ onPress: onForgotPassword },
					React.createElement(Text, {
						style: styles.forgotText,
						children: 'Unohtuiko salasanasi?',
					})
				),
				React.createElement(
					Pressable,
					{ onPress: onRegister },
					React.createElement(Text, {
						style: styles.registerText,
						children: 'Rekisteröidy',
					})
				)
			)
			)
			)
		)
	);
}

const createStyles = (metrics: ReturnType<typeof getResponsiveMetrics>) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: '#ececec',
		},
		screen: {
			flex: 1,
			backgroundColor: '#ececec',
		},
		scrollContent: {
			paddingHorizontal: metrics.horizontalPadding,
			paddingTop: metrics.scale(20, 16, 34),
			paddingBottom: metrics.scale(48, 32, 64),
			alignItems: 'center',
			minHeight: '100%',
		},
		contentWrap: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			backgroundColor: '#f7f9fc',
			borderRadius: metrics.scale(22, 18, 28),
			paddingHorizontal: metrics.scale(18, 14, 26),
			paddingVertical: metrics.scale(16, 12, 22),
		},
		headerRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: metrics.scale(8, 6, 14),
		},
		backButton: {
			width: metrics.scale(34, 32, 42),
			height: metrics.scale(34, 32, 42),
			borderRadius: metrics.scale(17, 16, 21),
			backgroundColor: '#e8e8e8',
			alignItems: 'center',
			justifyContent: 'center',
		},
		backIcon: {
			fontSize: metrics.scale(26, 20, 28),
			lineHeight: metrics.scale(26, 20, 28),
			color: '#616161',
			marginTop: -2,
		},
		headerSpacer: {
			width: metrics.scale(34, 32, 42),
			height: metrics.scale(34, 32, 42),
		},
		logo: {
			width: metrics.scale(108, 88, 130),
			height: metrics.scale(96, 76, 116),
			alignSelf: 'center',
		},
		brand: {
			alignSelf: 'center',
			marginTop: metrics.scale(4, 2, 8),
			fontSize: metrics.scale(13, 11, 16),
			color: '#9aa6b3',
			fontWeight: '700',
			letterSpacing: 0.4,
		},
		title: {
			marginTop: metrics.scale(28, 18, 36),
			fontSize: metrics.scale(31, 24, 38),
			fontWeight: '700',
		},
		subtitle: {
			marginTop: metrics.scale(10, 8, 16),
			marginBottom: metrics.scale(20, 14, 28),
			fontSize: metrics.scale(18, 14, 22),
			color: '#9aa6b3',
		},
		label: {
			fontSize: metrics.scale(16, 14, 20),
			color: '#0d8bf2',
			fontWeight: '700',
			marginBottom: 4,
		},
		passwordLabel: {
			marginTop: metrics.scale(18, 14, 24),
		},
		input: {
			backgroundColor: 'transparent',
			fontSize: metrics.scale(20, 16, 24),
			paddingHorizontal: 0,
		},
		inputContent: {
			fontSize: metrics.scale(20, 16, 24),
			paddingLeft: 0,
		},
		loginButton: {
			marginTop: metrics.scale(34, 22, 40),
			borderRadius: metrics.scale(10, 10, 14),
		},
		loginButtonContent: {
			height: metrics.scale(62, 50, 70),
		},
		loginButtonLabel: {
			fontSize: metrics.scale(21, 17, 25),
			fontWeight: '700',
		},
		bottomLinks: {
			marginTop: metrics.scale(30, 20, 40),
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			gap: metrics.scale(12, 8, 20),
			flexWrap: 'wrap',
		},
		forgotText: {
			color: '#9aa6b3',
			fontSize: metrics.scale(16, 13, 20),
			fontWeight: '500',
		},
		registerText: {
			color: '#0d8bf2',
			fontSize: metrics.scale(16, 13, 20),
			fontWeight: '700',
		},
		errorText: {
			marginTop: metrics.scale(14, 10, 18),
			color: '#b91c1c',
			fontSize: metrics.scale(14, 12, 18),
			fontWeight: '600',
		},
	});
