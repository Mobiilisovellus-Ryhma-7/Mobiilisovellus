import React from 'react';
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
import { requestPasswordReset } from '../../services/auth';

type ForgotPasswordProps = {
	onBack?: () => void;
	onGoHome?: () => void;
};

export default function ForgotPassword({ onBack, onGoHome }: ForgotPasswordProps) {
	const { colors } = useTheme();
	const { width } = useWindowDimensions();
	const metrics = getResponsiveMetrics(width);
	const styles = React.useMemo(() => createStyles(metrics, colors), [colors, metrics]);
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
						style: [styles.brand, { color: colors.onSurfaceVariant }],
						children: 'Hallille',
					}),
					React.createElement(Text, {
						style: [styles.title, { color: colors.onSurface }],
						children: 'Unohtuiko salasana?',
					}),
					React.createElement(Text, {
						style: [styles.subtitle, { color: colors.onSurfaceVariant }],
						children: 'Lähetämme palautuslinkin sähköpostiisi.',
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
						autoCapitalize: 'none',
						keyboardType: 'email-address',
					}),
					errorMessage
						? React.createElement(Text, {
							style: styles.errorText,
							children: errorMessage,
						})
						: null,
					successMessage
						? React.createElement(Text, {
							style: styles.successText,
							children: successMessage,
						})
						: null,
					React.createElement(Button, {
						mode: 'contained',
						onPress: handleResetPassword,
						style: styles.resetButton,
						contentStyle: styles.resetButtonContent,
						labelStyle: styles.resetButtonLabel,
						loading: isSubmitting,
						disabled: isSubmitting,
						children: 'Lähetä palautuslinkki',
					})
				)
			)
		)
	);
}

const createStyles = (
	metrics: ReturnType<typeof getResponsiveMetrics>,
	colors: ReturnType<typeof useTheme>['colors']
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
			paddingTop: metrics.scale(20, 16, 34),
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
			marginTop: metrics.scale(24, 16, 32),
			fontSize: metrics.scale(31, 24, 38),
			fontWeight: '700',
		},
		subtitle: {
			marginTop: metrics.scale(10, 8, 16),
			marginBottom: metrics.scale(20, 14, 28),
			fontSize: metrics.scale(17, 14, 22),
			color: '#9aa6b3',
		},
		label: {
			fontSize: metrics.scale(16, 14, 20),
			color: '#0d8bf2',
			fontWeight: '700',
			marginBottom: 4,
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
		resetButton: {
			marginTop: metrics.scale(34, 22, 40),
			borderRadius: metrics.scale(10, 10, 14),
		},
		resetButtonContent: {
			height: metrics.scale(62, 50, 70),
		},
		resetButtonLabel: {
			fontSize: metrics.scale(20, 16, 24),
			fontWeight: '700',
		},
		errorText: {
			marginTop: metrics.scale(14, 10, 18),
			color: '#b91c1c',
			fontSize: metrics.scale(14, 12, 18),
			fontWeight: '600',
		},
		successText: {
			marginTop: metrics.scale(14, 10, 18),
			color: '#0f766e',
			fontSize: metrics.scale(14, 12, 18),
			fontWeight: '600',
		},
	});
