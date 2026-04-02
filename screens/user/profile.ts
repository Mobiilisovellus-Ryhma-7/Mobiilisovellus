import React from 'react';
import {
	Pressable,
	SafeAreaView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';

type ProfileProps = {
	onBack?: () => void;
};

export default function Profile({ onBack }: ProfileProps) {
	const { colors } = useTheme();
	const { width } = useWindowDimensions();
	const metrics = getResponsiveMetrics(width);
	const styles = React.useMemo(() => createStyles(metrics), [metrics]);

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

const createStyles = (metrics: ReturnType<typeof getResponsiveMetrics>) =>
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
		headerTitle: {
			fontSize: metrics.scale(30, 22, 36),
			fontWeight: '700',
			letterSpacing: 0.6,
		},
		headerSpacer: {
			width: metrics.scale(34, 32, 42),
			height: metrics.scale(34, 32, 42),
		},
		menuWrap: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			marginTop: metrics.scale(72, 30, 90),
			gap: metrics.scale(32, 18, 40),
			paddingLeft: metrics.scale(10, 2, 14),
		},
		menuItem: {
			fontSize: metrics.scale(31, 20, 36),
			fontWeight: '600',
		},
	});
