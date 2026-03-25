import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type ProfileProps = {
	onBack?: () => void;
};

export default function Profile({ onBack }: ProfileProps) {
	const { colors } = useTheme();

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
				React.createElement(Text, {
					style: [styles.headerTitle, { color: colors.onSurface }],
					children: 'HALLILLE',
				}),
				React.createElement(View, { style: styles.headerSpacer })
			),

			React.createElement(
				View,
				{ style: styles.menuWrap },
				React.createElement(Text, {
					style: [styles.menuItem, { color: colors.onSurface }],
					children: 'Käyttäjänimi',
				}),
				React.createElement(Text, {
					style: [styles.menuItem, { color: colors.onSurface }],
					children: 'Vaihda salasanasi',
				}),
				React.createElement(Text, {
					style: [styles.menuItem, { color: colors.onSurface }],
					children: 'Teemaväri',
				}),
				React.createElement(Text, {
					style: [styles.menuItem, { color: colors.onSurface }],
					children: 'Omat varaukset',
				})
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
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 20,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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
	headerTitle: {
		fontSize: 30,
		fontWeight: '700',
		letterSpacing: 0.6,
	},
	headerSpacer: {
		width: 34,
		height: 34,
	},
	menuWrap: {
		marginTop: 72,
		gap: 32,
		paddingLeft: 10,
	},
	menuItem: {
		fontSize: 31,
		fontWeight: '600',
	},
});
