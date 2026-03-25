import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, View, Image } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

type RegisterProps = {
	onRegister?: () => void;
	onGoLogin?: () => void;
};

export default function Register({ onRegister, onGoLogin }: RegisterProps) {
	const { colors } = useTheme();
	const [email, setEmail] = useState('esimerkki@sposti.com');
	const [password, setPassword] = useState('....................');

	return React.createElement(
		SafeAreaView,
		{ style: [styles.safeArea, { backgroundColor: colors.background }] },
		React.createElement(
			View,
			{ style: [styles.screen, { backgroundColor: colors.background }] },
			React.createElement(Image, {
				source: require('../../assets/dynamic-sport-hall-logo.png'),
				style: styles.logo,
				resizeMode: 'contain',
			}),

			React.createElement(Text, {
				style: [styles.title, { color: colors.onSurface }],
				children: 'Rekisteroityminen',
			}),

			React.createElement(Text, {
				style: styles.label,
				children: 'Sahkoposti',
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
				children: 'Salasana',
			}),
			React.createElement(TextInput, {
				mode: 'flat',
				value: password,
				onChangeText: setPassword,
				secureTextEntry: true,
				style: styles.input,
				underlineColor: '#d3d7dc',
				activeUnderlineColor: colors.primary,
				contentStyle: styles.inputContent,
			}),

			React.createElement(Button, {
				mode: 'contained',
				onPress: onRegister,
				style: styles.registerButton,
				contentStyle: styles.registerButtonContent,
				labelStyle: styles.registerButtonLabel,
				children: 'Rekisteroidy',
			}),

			React.createElement(
				View,
				{ style: styles.loginLinkWrap },
				React.createElement(Text, {
					style: styles.loginPrefix,
					children: 'Loytyyko jo kayttaja?',
				}),
				React.createElement(
					Pressable,
					{ onPress: onGoLogin },
					React.createElement(Text, {
						style: styles.loginLink,
						children: 'Kirjaudu sisaan',
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
		paddingTop: 56,
		paddingBottom: 34,
	},
	logo: {
		width: 120,
		height: 112,
		alignSelf: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 42,
		fontWeight: '700',
		marginBottom: 30,
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
	registerButton: {
		marginTop: 36,
		borderRadius: 10,
	},
	registerButtonContent: {
		height: 62,
	},
	registerButtonLabel: {
		fontSize: 31,
		fontWeight: '700',
	},
	loginLinkWrap: {
		marginTop: 14,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 6,
	},
	loginPrefix: {
		color: '#9aa6b3',
		fontSize: 26,
		fontWeight: '500',
	},
	loginLink: {
		color: '#0d8bf2',
		fontSize: 26,
		fontWeight: '700',
	},
});
