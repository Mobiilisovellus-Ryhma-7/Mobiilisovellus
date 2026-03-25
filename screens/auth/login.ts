import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

type LoginProps = {
	onBack?: () => void;
	onForgotPassword?: () => void;
	onRegister?: () => void;
	onLogin?: () => void;
};

export default function Login({
	onBack,
	onForgotPassword,
	onRegister,
	onLogin,
}: LoginProps) {
	const { colors } = useTheme();
	const [email, setEmail] = useState('esimerkki@sposti.com');
	const [password, setPassword] = useState('...........');
	const [secureEntry, setSecureEntry] = useState(true);

	return React.createElement(
		SafeAreaView,
		{ style: [styles.safeArea, { backgroundColor: colors.background }] },
		React.createElement(
			View,
			{ style: [styles.screen, { backgroundColor: colors.background }] },
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
			React.createElement(Image, {
				source: require('../../assets/dynamic-sport-hall-logo.png'),
				style: styles.logo,
				resizeMode: 'contain',
			}),
			React.createElement(Text, {
				style: styles.brand,
				children: 'Hallille',
			}),

			React.createElement(Text, {
				style: [styles.title, { color: colors.onSurface }],
				children: 'Kirjaudu sisaan',
			}),
			React.createElement(Text, {
				style: styles.subtitle,
				children: 'Hei, mukava nahda sinua taas!',
			}),

			React.createElement(Text, {
				style: styles.label,
				children: 'Email',
			}),
			React.createElement(TextInput, {
				mode: 'flat',
				value: email,
				onChangeText: setEmail,
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

			React.createElement(Button, {
				mode: 'contained',
				onPress: onLogin,
				style: styles.loginButton,
				contentStyle: styles.loginButtonContent,
				labelStyle: styles.loginButtonLabel,
				children: 'Kirjaudu sisaan',
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
						children: 'Rekisteroidy',
					})
				)
			)
		)
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ececec',
	},
	screen: {
		flex: 1,
		backgroundColor: '#ececec',
		paddingHorizontal: 30,
		paddingTop: 20,
		paddingBottom: 34,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	backButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#e8e8e8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	backIcon: {
		fontSize: 26,
		lineHeight: 26,
		color: '#616161',
		marginTop: -2,
	},
	headerSpacer: {
		width: 34,
		height: 34,
	},
	logo: {
		width: 108,
		height: 96,
		alignSelf: 'center',
	},
	brand: {
		alignSelf: 'center',
		marginTop: 4,
		fontSize: 14,
		color: '#9aa6b3',
		fontWeight: '700',
	},
	title: {
		marginTop: 44,
		fontSize: 42,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 10,
		marginBottom: 24,
		fontSize: 27,
		color: '#9aa6b3',
	},
	label: {
		fontSize: 20,
		color: '#0d8bf2',
		fontWeight: '700',
		marginBottom: 4,
	},
	passwordLabel: {
		marginTop: 18,
	},
	input: {
		backgroundColor: 'transparent',
		fontSize: 29,
		paddingHorizontal: 0,
	},
	inputContent: {
		fontSize: 29,
		paddingLeft: 0,
	},
	loginButton: {
		marginTop: 34,
		borderRadius: 10,
	},
	loginButtonContent: {
		height: 62,
	},
	loginButtonLabel: {
		fontSize: 31,
		fontWeight: '700',
	},
	bottomLinks: {
		marginTop: 'auto',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	forgotText: {
		color: '#9aa6b3',
		fontSize: 26,
		fontWeight: '500',
	},
	registerText: {
		color: '#0d8bf2',
		fontSize: 26,
		fontWeight: '700',
	},
});
