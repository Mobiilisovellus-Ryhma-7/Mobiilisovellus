import * as React from 'react';
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
	Image,
	useWindowDimensions,
} from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import { getDynamicSportHallLogoSource } from '../shared/logo';
import Screen from '../shared/Screen';
import { registerUser } from '../../services/auth';

type RegisterProps = {
	onBack?: () => void;
	onRegister?: () => void;
	onGoLogin?: () => void;
	onGoHome?: () => void;
};

export default function Register({ onBack, onRegister, onGoLogin, onGoHome }: RegisterProps) {
	const { colors, dark } = useTheme();
	const { width } = useWindowDimensions();
	const metrics = getResponsiveMetrics(width);
	const styles = React.useMemo(() => createStyles(metrics, colors), [colors, metrics]);
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
			onRegister?.();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'Rekisteröinti epäonnistui.');
		} finally {
			setIsSubmitting(false);
		}
	}, [email, onRegister, password]);

	return React.createElement(
		Screen,
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
					source: getDynamicSportHallLogoSource(dark),
					style: styles.logo,
					resizeMode: 'contain',
				})
			),
			React.createElement(Text, {
				style: [styles.brand, { color: colors.onSurfaceVariant }],
				children: 'Hallille',
			}),

			React.createElement(Text, {
				style: [styles.title, { color: colors.onSurface }],
				children: 'Rekisteröityminen',
			}),

			React.createElement(Text, {
				style: [styles.label, { color: colors.primary }],
				children: 'Sähköposti',
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
				style: [styles.label, styles.passwordLabel, { color: colors.primary }],
				children: 'Salasana',
			}),
			React.createElement(TextInput, {
				mode: 'flat',
				value: password,
				onChangeText: setPassword,
				placeholder: 'Salasana',
				secureTextEntry: true,
				style: styles.input,
				underlineColor: '#d3d7dc',
				activeUnderlineColor: colors.primary,
				contentStyle: styles.inputContent,
			}),

				errorMessage
					? React.createElement(Text, {
						style: styles.errorText,
						children: errorMessage,
					})
					: null,

			React.createElement(Button, {
				mode: 'contained',
					onPress: handleRegister,
				style: styles.registerButton,
				contentStyle: styles.registerButtonContent,
				labelStyle: styles.registerButtonLabel,
					loading: isSubmitting,
					disabled: isSubmitting,
				children: 'Rekisteröidy',
			}),

			React.createElement(
				View,
				{ style: styles.loginLinkWrap },
				React.createElement(Text, {
					style: [styles.loginPrefix, { color: colors.onSurfaceVariant }],
					children: 'Löytyykö jo käyttäjä?',
				}),
				React.createElement(
					Pressable,
					{ onPress: onGoLogin },
					React.createElement(Text, {
						style: [styles.loginLink, { color: colors.primary }],
						children: 'Kirjaudu sisään',
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
		},
		scrollContent: {
			paddingHorizontal: metrics.horizontalPadding,
			paddingTop: metrics.scale(56, 26, 72),
			paddingBottom: metrics.scale(48, 32, 64),
			alignItems: 'center',
			minHeight: '100%',
		},
		contentWrap: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			backgroundColor: colors.surface,
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
		headerSpacer: {
			width: metrics.scale(34, 32, 42),
			height: metrics.scale(34, 32, 42),
		},
		logo: {
			width: metrics.scale(120, 92, 140),
			height: metrics.scale(112, 86, 132),
			alignSelf: 'center',
			marginBottom: metrics.scale(6, 4, 10),
		},
		brand: {
			alignSelf: 'center',
			fontSize: metrics.scale(13, 11, 16),
			color: '#9aa6b3',
			fontWeight: '700',
			letterSpacing: 0.4,
			marginBottom: metrics.scale(20, 14, 28),
		},
		title: {
			fontSize: metrics.scale(31, 24, 38),
			fontWeight: '700',
			marginBottom: metrics.scale(20, 12, 28),
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
		registerButton: {
			marginTop: metrics.scale(36, 24, 44),
			borderRadius: metrics.scale(10, 10, 14),
		},
		registerButtonContent: {
			height: metrics.scale(62, 50, 70),
		},
		registerButtonLabel: {
			fontSize: metrics.scale(21, 17, 25),
			fontWeight: '700',
		},
		loginLinkWrap: {
			marginTop: metrics.scale(14, 10, 22),
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			gap: 6,
			flexWrap: 'wrap',
		},
		loginPrefix: {
			color: '#9aa6b3',
			fontSize: metrics.scale(16, 13, 20),
			fontWeight: '500',
		},
		loginLink: {
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
