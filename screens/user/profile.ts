import * as React from 'react';
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getResponsiveMetrics } from '../shared/responsive';
import { getDynamicSportHallLogoSource } from '../shared/logo';
import Screen from '../shared/Screen';
import { auth, db } from '../../services/firebase';
import {
	changeCurrentUserPassword,
	deleteCurrentUserAccount,
	signOutUser,
} from '../../services/auth';
import {
	Booking,
	getAllBookings,
	deleteBookingForUser,
	FacilitySection,
	getBookingsForUserId,
	listFacilitySections,
} from '../../services/firebase';
import {
	buildCurrentMonthSportData,
	buildStatisticsData,
	StatisticsCharts,
} from './statisticsCharts';

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
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1;
	const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
	const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

	const { colors, dark } = useTheme();
	const { width } = useWindowDimensions();
	const metrics = getResponsiveMetrics(width);
	const userEmail = auth?.currentUser?.email ?? 'Käyttäjänimi';
	const userInitial = React.useMemo(() => {
		const trimmedEmail = userEmail.trim();
		if (!trimmedEmail) {
			return 'H';
		}

		return trimmedEmail.charAt(0).toUpperCase();
	}, [userEmail]);
	const styles = React.useMemo(() => createStyles(metrics, colors, dark), [colors, dark, metrics]);
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
	const [showBookingsModal, setShowBookingsModal] = React.useState(false);
	const [showBookingHistoryModal, setShowBookingHistoryModal] = React.useState(false);
	const [showStatisticsModal, setShowStatisticsModal] = React.useState(false);
	const [isLoadingBookings, setIsLoadingBookings] = React.useState(false);
	const [deletingBookingId, setDeletingBookingId] = React.useState<string | null>(null);
	const [bookingsError, setBookingsError] = React.useState<string | null>(null);
	const [userBookings, setUserBookings] = React.useState<Booking[]>([]);
	const [statisticsBookings, setStatisticsBookings] = React.useState<Booking[]>([]);
	const [facilitySectionsById, setFacilitySectionsById] = React.useState<Record<string, FacilitySection>>({});
	const [currentTimestamp, setCurrentTimestamp] = React.useState(() => Date.now());
	const [profilePhotoUri, setProfilePhotoUri] = React.useState<string | null>(null);
	const [isPickingPhoto, setIsPickingPhoto] = React.useState(false);

	React.useEffect(() => {
		const userId = auth?.currentUser?.uid;
		if (!userId || !db) {
			setProfilePhotoUri(null);
			return;
		}

		let isActive = true;

		getDoc(doc(db, 'users', userId))
			.then((snapshot) => {
				if (!isActive || !snapshot.exists()) {
					return;
				}

				const data = snapshot.data() as { profilePhotoUri?: unknown };
				if (typeof data.profilePhotoUri === 'string' && data.profilePhotoUri.trim()) {
					setProfilePhotoUri(data.profilePhotoUri.trim());
				}
			})
			.catch(() => {
				if (isActive) {
					setProfilePhotoUri(null);
				}
			});

		return () => {
			isActive = false;
		};
	}, []);

	const pickProfilePhoto = React.useCallback(async () => {
		const userId = auth?.currentUser?.uid;
		if (!userId || !db) {
			Alert.alert('Kirjaudu sisaan', 'Kirjaudu sisaan ennen profiilikuvan vaihtamista.');
			return;
		}

		setIsPickingPhoto(true);

		try {
			const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				Alert.alert('Lupa puuttuu', 'Salli kuvakirjaston käyttö, jotta voit valita profiilikuvan.');
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.7,
			});

			if (result.canceled || !result.assets[0]?.uri) {
				return;
			}

			const nextPhotoUri = result.assets[0].uri;
			setProfilePhotoUri(nextPhotoUri);

			await setDoc(
				doc(db, 'users', userId),
				{
					profilePhotoUri: nextPhotoUri,
				},
				{ merge: true }
			);
		} catch {
			Alert.alert('Virhe', 'Profiilikuvan valinta epaonnistui. Yrita uudelleen.');
		} finally {
			setIsPickingPhoto(false);
		}
	}, []);

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

	const loadUserBookings = React.useCallback(async () => {
		const userId = auth?.currentUser?.uid;

		if (!userId) {
			setBookingsError('Kirjaudu sisaan nahdaksesi varauksesi.');
			setUserBookings([]);
			return;
		}

		setIsLoadingBookings(true);
		setBookingsError(null);

		try {
			const [bookings, sections] = await Promise.all([
				getBookingsForUserId(userId),
				listFacilitySections(),
			]);

			const sectionsById = sections.reduce<Record<string, FacilitySection>>((acc, section) => {
				acc[section.id] = section;
				return acc;
			}, {});

			setFacilitySectionsById(sectionsById);
			setUserBookings(bookings);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Varausten haku epaonnistui.';
			setBookingsError(message);
			setFacilitySectionsById({});
			setUserBookings([]);
		} finally {
			setIsLoadingBookings(false);
		}
	}, []);

	const openBookingsModal = React.useCallback(async () => {
		setShowBookingsModal(true);
		await loadUserBookings();
	}, [loadUserBookings]);

	useFocusEffect(
		React.useCallback(() => {
			void loadUserBookings();
		}, [loadUserBookings])
	);

	const closeBookingsModal = React.useCallback(() => {
		if (isLoadingBookings) {
			return;
		}

		setShowBookingsModal(false);
	}, [isLoadingBookings]);

	const openBookingHistoryModal = React.useCallback(async () => {
		setShowBookingHistoryModal(true);
		await loadUserBookings();
	}, [loadUserBookings]);

	const closeBookingHistoryModal = React.useCallback(() => {
		if (isLoadingBookings) {
			return;
		}

		setShowBookingHistoryModal(false);
	}, [isLoadingBookings]);

	const openStatisticsModal = React.useCallback(async () => {
		setShowStatisticsModal(true);
		const userId = auth?.currentUser?.uid;

		if (!userId) {
			setBookingsError('Kirjaudu sisaan nahdaksesi tilastot.');
			setUserBookings([]);
			setStatisticsBookings([]);
			return;
		}

		setIsLoadingBookings(true);
		setBookingsError(null);

		try {
			const [userBookingsResult, allBookingsResult, sections] = await Promise.all([
				getBookingsForUserId(userId),
				getAllBookings(),
				listFacilitySections(),
			]);

			const sectionsById = sections.reduce<Record<string, FacilitySection>>((acc, section) => {
				acc[section.id] = section;
				return acc;
			}, {});

			setFacilitySectionsById(sectionsById);
			setUserBookings(userBookingsResult);
			setStatisticsBookings(allBookingsResult);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Tilastojen haku epaonnistui.';
			setBookingsError(message);
			setFacilitySectionsById({});
			setUserBookings([]);
			setStatisticsBookings([]);
		} finally {
			setIsLoadingBookings(false);
		}
	}, []);

	const closeStatisticsModal = React.useCallback(() => {
		if (isLoadingBookings) {
			return;
		}

		setShowStatisticsModal(false);
	}, [isLoadingBookings]);

	const isPastBooking = React.useCallback((booking: Booking, nowTimestamp: number) => {
		const match = booking.bookingDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		const timeMatch = booking.slotEnd.match(/^(\d{2}):(\d{2})$/);

		if (!match || !timeMatch) {
			return false;
		}

		const year = Number(match[1]);
		const month = Number(match[2]) - 1;
		const day = Number(match[3]);
		const hour = Number(timeMatch[1]);
		const minute = Number(timeMatch[2]);
		const endDate = new Date(year, month, day, hour, minute, 0, 0);

		if (Number.isNaN(endDate.getTime())) {
			return false;
		}

		return endDate.getTime() <= nowTimestamp;
	}, []);

	const activeBookings = React.useMemo(
		() => userBookings.filter((booking) => !isPastBooking(booking, currentTimestamp)),
		[currentTimestamp, isPastBooking, userBookings]
	);

	const bookingHistory = React.useMemo(
		() => userBookings.filter((booking) => isPastBooking(booking, currentTimestamp)),
		[currentTimestamp, isPastBooking, userBookings]
	);

	const statisticsData = React.useMemo(
		() => buildStatisticsData(userBookings, facilitySectionsById),
		[facilitySectionsById, userBookings]
	);
	const allUsersCurrentMonthSportData = React.useMemo(
		() => buildCurrentMonthSportData(statisticsBookings, facilitySectionsById),
		[facilitySectionsById, statisticsBookings]
	);
	const hasStatisticsData =
		statisticsData.facilityData.length > 0 ||
		statisticsData.sportData.length > 0 ||
		allUsersCurrentMonthSportData.length > 0;

	const trainingSummary = React.useMemo(() => {
		let thisMonthSessions = 0;
		let thisYearSessions = 0;
		let previousMonthSessions = 0;

		userBookings.forEach((booking) => {
			const match = booking.bookingDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
			if (!match) {
				return;
			}

			const year = Number(match[1]);
			const month = Number(match[2]);

			if (year === currentYear) {
				thisYearSessions += 1;
			}

			if (year === currentYear && month === currentMonth) {
				thisMonthSessions += 1;
			}

			if (year === previousMonthYear && month === previousMonth) {
				previousMonthSessions += 1;
			}
		});

		const monthDeltaPercent =
			previousMonthSessions === 0
				? thisMonthSessions === 0
					? 0
					: 100
				: Math.round(((thisMonthSessions - previousMonthSessions) / previousMonthSessions) * 100);

		const monthDeltaText =
			monthDeltaPercent > 0
				? `+${monthDeltaPercent}%`
				: `${monthDeltaPercent}%`;

		return {
			thisMonthSessions,
			thisYearSessions,
			monthDeltaPercent,
			monthDeltaText,
		};
	}, [currentMonth, currentYear, previousMonth, previousMonthYear, userBookings]);

	React.useEffect(() => {
		if (!showBookingsModal && !showBookingHistoryModal) {
			return;
		}

		const intervalId = setInterval(() => {
			setCurrentTimestamp(Date.now());
		}, 30_000);

		return () => {
			clearInterval(intervalId);
		};
	}, [showBookingHistoryModal, showBookingsModal]);

	const formatBookingDate = React.useCallback((value: string) => {
		const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) {
			return value;
		}

		return `${match[3]}.${match[2]}.${match[1]}`;
	}, []);

	const confirmDeleteBooking = React.useCallback(
		async (bookingId: string) => {
			const userId = auth?.currentUser?.uid;

			if (!userId) {
				setBookingsError('Kirjaudu sisaan poistaaksesi varauksen.');
				return;
			}

			setDeletingBookingId(bookingId);
			setBookingsError(null);

			try {
				await deleteBookingForUser(bookingId, userId);
				await loadUserBookings();
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Varauksen poistaminen epaonnistui.';
				setBookingsError(message);
			} finally {
				setDeletingBookingId(null);
			}
		},
		[loadUserBookings]
	);

	const handleDeleteBooking = React.useCallback((bookingId: string) => {
		Alert.alert(
			'Oletko varma?',
			'Tämä poistaa varauksen pysyvästi',
			[
				{ text: 'Peruuta', style: 'cancel' },
				{ text: 'Kyllä', style: 'destructive', onPress: () => void confirmDeleteBooking(bookingId) },
			],
			{ cancelable: true }
		);
	}, [confirmDeleteBooking]);

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
					source: getDynamicSportHallLogoSource(dark),
					style: styles.logo,
					resizeMode: 'contain',
				})
			),

			React.createElement(
				ScrollView,
				{
					style: styles.menuScroll,
					contentContainerStyle: styles.menuContent,
					showsVerticalScrollIndicator: false,
				},
				React.createElement(
					View,
					{ style: styles.heroCard },
					React.createElement(
						View,
						{ style: styles.heroRow },
						React.createElement(
							Pressable,
							{
								style: styles.heroAvatarPressable,
								onPress: () => void pickProfilePhoto(),
								disabled: isPickingPhoto,
							},
							React.createElement(
								View,
								{ style: [styles.heroAvatar, { backgroundColor: colors.primary }] },
								profilePhotoUri
									? React.createElement(Image, {
										source: { uri: profilePhotoUri },
										style: styles.heroAvatarImage,
									})
									: React.createElement(Text, {
										style: [styles.heroAvatarText, { color: colors.onPrimary }],
										children: userInitial,
									})
							),
							React.createElement(Text, {
								style: [styles.heroAvatarHint, { color: colors.primary }],
								children: isPickingPhoto ? 'Ladataan...' : 'Vaihda kuva',
							})
						),
						React.createElement(
							View,
							{ style: styles.heroCopy },
							React.createElement(Text, {
								style: [styles.heroLabel, { color: colors.onSurfaceVariant }],
								children: 'Käyttäjätili',
							}),
							React.createElement(Text, {
								style: [styles.heroEmail, { color: colors.onSurface }],
								children: userEmail,
							}),
							React.createElement(Text, {
								style: [styles.heroSubtext, { color: colors.onSurfaceVariant }],
								children: 'Hallitse varauksia, tiliä ja sovelluksen ulkoasua.',
							})
						)
					)
				),
				React.createElement(
					View,
					{ style: styles.statsRow },
					React.createElement(
						View,
						{ style: styles.statCard },
						React.createElement(Text, {
							style: [styles.statValue, { color: colors.onSurface }],
							children: `${activeBookings.length}`,
						}),
						React.createElement(Text, {
							style: [styles.statLabel, { color: colors.onSurfaceVariant }],
							children: 'Aktiiviset varaukset',
						})
					),
					React.createElement(
						View,
						{ style: styles.statCard },
						React.createElement(Text, {
							style: [styles.statValue, { color: colors.onSurface }],
							children: `${bookingHistory.length}`,
						}),
						React.createElement(Text, {
							style: [styles.statLabel, { color: colors.onSurfaceVariant }],
							numberOfLines: 1,
							adjustsFontSizeToFit: true,
							minimumFontScale: 0.82,
							children: 'Varaushistoria',
						})
					),
					React.createElement(
						View,
						{ style: styles.statCard },
						React.createElement(Text, {
							style: [styles.statValue, { color: colors.onSurface }],
							children: isDarkMode ? 'Päällä' : 'Pois',
						}),
						React.createElement(Text, {
							style: [styles.statLabel, { color: colors.onSurfaceVariant }],
							children: 'Pimeä tila',
						})
					)
				),
				React.createElement(
					View,
					{ style: styles.sectionCard },
					React.createElement(Text, {
						style: [styles.sectionTitle, { color: colors.onSurface }],
						children: 'Oma tili',
					}),
					React.createElement(
						View,
						{ style: styles.actionStack },
						React.createElement(Button, {
							mode: 'elevated',
							onPress: openBookingsModal,
							style: styles.actionButton,
							contentStyle: styles.actionButtonContent,
							labelStyle: styles.actionButtonLabel,
							children: 'Omat varaukset',
						}),
						React.createElement(Button, {
							mode: 'elevated',
							onPress: openBookingHistoryModal,
							style: styles.actionButton,
							contentStyle: styles.actionButtonContent,
							labelStyle: styles.actionButtonLabel,
							children: 'Varaushistoria',
						}),
						React.createElement(Button, {
							mode: 'contained-tonal',
							onPress: onToggleDarkMode,
							style: styles.actionButton,
							contentStyle: styles.actionButtonContent,
							labelStyle: styles.actionButtonLabel,
							children: isDarkMode ? 'Pimeä tila: Päällä' : 'Pimeä tila: Pois',
						}),
						React.createElement(Button, {
							mode: 'elevated',
							onPress: openStatisticsModal,
							style: styles.actionButton,
							contentStyle: styles.actionButtonContent,
							labelStyle: styles.actionButtonLabel,
							children: 'Tilastot',
						})
					)
				),
				React.createElement(
					View,
					{ style: styles.sectionCardDanger },
					React.createElement(Text, {
						style: [styles.sectionTitle, { color: colors.onSurface }],
						children: 'Tilin hallinta',
					}),
					React.createElement(Button, {
						mode: 'elevated',
						onPress: openPasswordModal,
						style: styles.actionButton,
						contentStyle: styles.actionButtonContent,
						labelStyle: styles.actionButtonLabel,
						children: 'Vaihda salasanasi',
					}),
					React.createElement(Button, {
						mode: 'outlined',
						onPress: openDeleteModal,
						style: styles.dangerButton,
						contentStyle: styles.actionButtonContent,
						labelStyle: styles.dangerButtonLabel,
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
					visible: showBookingsModal,
					transparent: true,
					animationType: 'fade',
					onRequestClose: closeBookingsModal,
				},
				React.createElement(
					Pressable,
					{ style: styles.modalBackdrop, onPress: closeBookingsModal },
					React.createElement(
						Pressable,
						{ style: styles.modalCard, onPress: () => undefined },
						React.createElement(Text, {
							style: styles.modalTitle,
							children: 'Omat varaukset',
						}),
						isLoadingBookings
							? React.createElement(Text, {
								style: styles.modalDescription,
								children: 'Ladataan varauksia...',
							})
							: null,
						bookingsError
							? React.createElement(Text, {
								style: styles.errorText,
								children: bookingsError,
							})
							: null,
						!isLoadingBookings && !bookingsError && activeBookings.length === 0
							? React.createElement(Text, {
								style: styles.modalDescription,
								children: 'Ei aktiivisia varauksia.',
							})
							: null,
						!isLoadingBookings && !bookingsError && activeBookings.length > 0
							? React.createElement(
								ScrollView,
								{ style: styles.bookingsList, contentContainerStyle: styles.bookingsListContent },
								activeBookings.map((booking) => {
									const section = facilitySectionsById[booking.facilitySectionId];
									const facilityName =
										section?.facilityName || section?.description || 'Tuntematon halli';
									const sport = section?.sport?.trim() ?? '';
									const sectionName = section?.name?.trim() ?? '';
									const hasSportInName =
										sport.length > 0 &&
										sectionName.toLowerCase().includes(sport.toLowerCase());
									const utilitiesText = sport && sectionName
										? hasSportInName
											? sectionName
											: `${sport}, ${sectionName}`
										: sport || sectionName || 'Tietoja ei saatavilla';

									return React.createElement(
										View,
										{ key: booking.id, style: styles.bookingItem },
										React.createElement(
											View,
											{ style: styles.bookingHeaderRow },
											React.createElement(Text, {
												style: styles.bookingFacilityName,
												children: facilityName,
											}),
											React.createElement(Text, {
												style: styles.bookingDate,
												children: formatBookingDate(booking.bookingDate),
											})
										),
										React.createElement(Text, {
											style: styles.bookingTitle,
											children: utilitiesText,
										}),
										React.createElement(Text, {
											style: styles.bookingMeta,
											children: `${booking.slotStart}-${booking.slotEnd}`,
										}),
										React.createElement(
											View,
											{ style: styles.bookingFooterRow },
											React.createElement(
												Pressable,
												{
													style: [
														styles.bookingCancelAction,
														deletingBookingId === booking.id ? styles.bookingCancelActionDisabled : null,
													],
													onPress: () => void handleDeleteBooking(booking.id),
													disabled: !!deletingBookingId,
													accessibilityRole: 'button',
												},
												React.createElement(Text, {
													style: styles.bookingCancelActionText,
													children: deletingBookingId === booking.id ? 'Poistetaan...' : 'Peruuta',
												})
											)
										)
									);
								}),
							)
							: null,
						React.createElement(
							View,
							{ style: styles.modalActions },
							React.createElement(Button, {
								mode: 'contained',
								onPress: closeBookingsModal,
								disabled: isLoadingBookings || !!deletingBookingId,
								children: 'Sulje',
							})
						)
					)
				)
			),
			React.createElement(
				Modal,
				{
					visible: showBookingHistoryModal,
					transparent: true,
					animationType: 'fade',
					onRequestClose: closeBookingHistoryModal,
				},
				React.createElement(
					Pressable,
					{ style: styles.modalBackdrop, onPress: closeBookingHistoryModal },
					React.createElement(
						Pressable,
						{ style: styles.modalCard, onPress: () => undefined },
						React.createElement(Text, {
							style: styles.modalTitle,
							children: 'Varaushistoria',
						}),
						isLoadingBookings
							? React.createElement(Text, {
								style: styles.modalDescription,
								children: 'Ladataan varauksia...',
							})
							: null,
						bookingsError
							? React.createElement(Text, {
								style: styles.errorText,
								children: bookingsError,
							})
							: null,
						!isLoadingBookings && !bookingsError && bookingHistory.length === 0
							? React.createElement(Text, {
								style: styles.modalDescription,
								children: 'Ei menneita varauksia.',
							})
							: null,
						!isLoadingBookings && !bookingsError && bookingHistory.length > 0
							? React.createElement(
								ScrollView,
								{ style: styles.bookingsList, contentContainerStyle: styles.bookingsListContent },
								bookingHistory.map((booking) => {
									const section = facilitySectionsById[booking.facilitySectionId];
									const facilityName =
										section?.facilityName || section?.description || 'Tuntematon halli';
									const sport = section?.sport?.trim() ?? '';
									const sectionName = section?.name?.trim() ?? '';
									const hasSportInName =
										sport.length > 0 &&
										sectionName.toLowerCase().includes(sport.toLowerCase());
									const utilitiesText = sport && sectionName
										? hasSportInName
											? sectionName
											: `${sport}, ${sectionName}`
										: sport || sectionName || 'Tietoja ei saatavilla';

									return React.createElement(
										View,
										{ key: booking.id, style: styles.bookingItem },
										React.createElement(
											View,
											{ style: styles.bookingHeaderRow },
											React.createElement(Text, {
												style: styles.bookingFacilityName,
												children: facilityName,
											}),
											React.createElement(Text, {
												style: styles.bookingDate,
												children: formatBookingDate(booking.bookingDate),
											})
										),
										React.createElement(Text, {
											style: styles.bookingTitle,
											children: utilitiesText,
										}),
										React.createElement(Text, {
											style: styles.bookingMeta,
											children: `${booking.slotStart}-${booking.slotEnd}`,
										})
									);
								}),
							)
							: null,
						React.createElement(
							View,
							{ style: styles.modalActions },
							React.createElement(Button, {
								mode: 'contained',
								onPress: closeBookingHistoryModal,
								disabled: isLoadingBookings,
								children: 'Sulje',
							})
						)
					)
				)
			),
			React.createElement(
				Modal,
				{
					visible: showStatisticsModal,
					transparent: true,
					animationType: 'fade',
					onRequestClose: closeStatisticsModal,
				},
				React.createElement(
					Pressable,
					{ style: styles.modalBackdrop, onPress: closeStatisticsModal },
					React.createElement(
						Pressable,
						{ style: styles.modalCardLarge, onPress: () => undefined },
						React.createElement(Text, {
								style: [styles.modalTitle, styles.modalTitleCentered],
							children: 'Tilastot',
						}),
						React.createElement(
							View,
							{ style: styles.trainingSummaryRow },
							React.createElement(
								View,
								{ style: [styles.trainingSummaryCard, { backgroundColor: colors.surfaceVariant }] },
								React.createElement(Text, {
									style: [styles.trainingSummaryLabel, { color: colors.onSurfaceVariant }],
									children: 'Omat treenit tässä kuukaudessa',
								}),
								React.createElement(Text, {
									style: [styles.trainingSummaryValue, { color: colors.onSurface }],
									children: `${trainingSummary.thisMonthSessions}`,
								})
							),
							React.createElement(
								View,
								{ style: [styles.trainingSummaryCard, { backgroundColor: colors.surfaceVariant }] },
								React.createElement(Text, {
									style: [styles.trainingSummaryLabel, { color: colors.onSurfaceVariant }],
									children: 'Muutos edelliseen kuukauteen',
								}),
								React.createElement(Text, {
									style: [
										styles.trainingSummaryValue,
										{ color: trainingSummary.monthDeltaPercent < 0 ? '#b91c1c' : '#0f766e' },
									],
									children: trainingSummary.monthDeltaText,
								})
							),
							React.createElement(
								View,
								{ style: [styles.trainingSummaryCard, { backgroundColor: colors.surfaceVariant }] },
								React.createElement(Text, {
									style: [styles.trainingSummaryLabel, { color: colors.onSurfaceVariant }],
									children: 'Omat treenikerrat yhteensä',
								}),
								React.createElement(Text, {
									style: [styles.trainingSummaryValue, { color: colors.onSurface }],
									children: `${trainingSummary.thisYearSessions}`,
								})
							)
						),
						React.createElement(
							ScrollView,
							{
								style: styles.statisticsScroll,
								contentContainerStyle: styles.statisticsScrollContent,
								showsVerticalScrollIndicator: true,
							},
							isLoadingBookings
								? React.createElement(Text, {
									style: styles.modalDescription,
									children: 'Ladataan tilastoja...',
								})
								: null,
							bookingsError
								? React.createElement(Text, {
									style: styles.errorText,
									children: bookingsError,
								})
								: null,
							!isLoadingBookings && !bookingsError && !hasStatisticsData
								? React.createElement(Text, {
									style: styles.modalDescription,
									children: 'Ei tilastodataa naytettavaksi viela.',
								})
								: null,
							!isLoadingBookings && !bookingsError && hasStatisticsData
								? React.createElement(StatisticsCharts, {
									currentMonthAllUsersSportData: allUsersCurrentMonthSportData,
									facilityData: statisticsData.facilityData,
									sportData: statisticsData.sportData,
									timeData: statisticsData.timeData,
								})
								: null,
						),
						React.createElement(
							View,
							{ style: styles.modalActions },
							React.createElement(Button, {
								mode: 'contained',
								onPress: closeStatisticsModal,
								disabled: isLoadingBookings,
								children: 'Sulje',
							})
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
	colors: any,
	dark: boolean
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
		menuScroll: {
			width: '100%',
			flex: 1,
		},
		menuContent: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			paddingTop: metrics.scale(22, 16, 28),
			paddingBottom: metrics.scale(28, 20, 34),
			gap: metrics.scale(14, 10, 18),
		},
		heroCard: {
			borderRadius: metrics.scale(24, 18, 30),
			paddingHorizontal: metrics.scale(16, 12, 20),
			paddingVertical: metrics.scale(16, 12, 20),
			backgroundColor: dark ? '#1e293b' : colors.surface,
			borderWidth: 1,
			borderColor: dark ? '#334155' : colors.outline,
		},
		heroRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: metrics.scale(14, 10, 18),
		},
		heroAvatarPressable: {
			alignItems: 'center',
			gap: metrics.scale(6, 4, 8),
		},
		heroAvatar: {
			width: metrics.scale(60, 52, 72),
			height: metrics.scale(60, 52, 72),
			borderRadius: metrics.scale(30, 26, 36),
			alignItems: 'center',
			justifyContent: 'center',
			elevation: 0,
			overflow: 'hidden',
		},
		heroAvatarImage: {
			width: '100%',
			height: '100%',
		},
		heroAvatarHint: {
			fontSize: metrics.scale(11, 10, 13),
			fontWeight: '700',
		},
		heroAvatarText: {
			fontSize: metrics.scale(22, 18, 28),
			fontWeight: '800',
		},
		heroCopy: {
			flex: 1,
			gap: metrics.scale(4, 3, 6),
		},
		heroLabel: {
			fontSize: metrics.scale(12, 10, 14),
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.8,
		},
		heroEmail: {
			fontSize: metrics.scale(18, 15, 22),
			fontWeight: '800',
		},
		heroSubtext: {
			fontSize: metrics.scale(13, 11, 16),
			lineHeight: metrics.scale(18, 16, 22),
		},
		statsRow: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: metrics.scale(10, 8, 12),
		},
		statCard: {
			flex: 1,
			minWidth: metrics.scale(96, 88, 120),
			borderRadius: metrics.scale(18, 14, 24),
			paddingHorizontal: metrics.scale(12, 10, 16),
			paddingVertical: metrics.scale(12, 10, 16),
			backgroundColor: dark ? '#273449' : colors.surfaceVariant,
			borderWidth: 1,
			borderColor: dark ? '#3f4f66' : colors.outline,
			justifyContent: 'space-between',
		},
		statValue: {
			fontSize: metrics.scale(20, 17, 24),
			fontWeight: '800',
		},
		statLabel: {
			marginTop: metrics.scale(6, 4, 8),
			fontSize: metrics.scale(12, 10, 14),
			fontWeight: '600',
			minHeight: metrics.scale(30, 24, 36),
			textAlignVertical: 'top',
		},
		sectionCard: {
			borderRadius: metrics.scale(24, 18, 30),
			paddingHorizontal: metrics.scale(16, 12, 20),
			paddingVertical: metrics.scale(16, 12, 20),
			backgroundColor: dark ? '#1e293b' : colors.surface,
			borderWidth: 1,
			borderColor: dark ? '#334155' : colors.outline,
			gap: metrics.scale(12, 10, 16),
		},
		sectionCardDanger: {
			borderRadius: metrics.scale(24, 18, 30),
			paddingHorizontal: metrics.scale(16, 12, 20),
			paddingVertical: metrics.scale(16, 12, 20),
			backgroundColor: dark ? '#1e293b' : colors.surface,
			borderWidth: 1,
			borderColor: dark ? '#334155' : colors.outline,
			gap: metrics.scale(12, 10, 16),
		},
		sectionTitle: {
			fontSize: metrics.scale(18, 16, 22),
			fontWeight: '800',
		},
		actionStack: {
			gap: metrics.scale(10, 8, 12),
		},
		actionButton: {
			alignSelf: 'stretch',
			borderRadius: metrics.scale(14, 12, 18),
		},
		actionButtonContent: {
			height: metrics.scale(50, 44, 58),
		},
		actionButtonLabel: {
			fontSize: metrics.scale(15, 13, 18),
			fontWeight: '700',
		},
		dangerButton: {
			alignSelf: 'stretch',
			borderRadius: metrics.scale(14, 12, 18),
			borderColor: '#ef4444',
		},
		dangerButtonLabel: {
			fontSize: metrics.scale(15, 13, 18),
			fontWeight: '700',
			color: '#b91c1c',
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
			paddingHorizontal: metrics.scale(12, 10, 16),
			paddingVertical: metrics.scale(12, 10, 16),
			gap: metrics.scale(6, 4, 8),
		},
		modalCardLarge: {
			width: '100%',
			maxWidth: metrics.contentMaxWidth,
			backgroundColor: colors.surface,
			borderRadius: metrics.scale(16, 14, 22),
			paddingHorizontal: metrics.scale(12, 10, 16),
			paddingVertical: metrics.scale(12, 10, 16),
			gap: metrics.scale(6, 4, 8),
			maxHeight: metrics.scale(620, 520, 740),
		},
		statisticsScroll: {
			maxHeight: metrics.scale(560, 420, 680),
		},
		statisticsScrollContent: {
			paddingBottom: metrics.scale(8, 6, 12),
		},
		trainingSummaryRow: {
			flexDirection: 'row',
			gap: metrics.scale(8, 6, 10),
			marginBottom: metrics.scale(6, 4, 10),
		},
		trainingSummaryCard: {
			flex: 1,
			borderRadius: metrics.scale(14, 12, 16),
			paddingVertical: metrics.scale(10, 8, 12),
			paddingHorizontal: metrics.scale(8, 7, 10),
			alignItems: 'center',
			justifyContent: 'center',
			minWidth: 0,
		},
		trainingSummaryLabel: {
			fontSize: metrics.scale(11, 10, 12),
			fontWeight: '700',
			textAlign: 'center',
		},
		trainingSummaryValue: {
			marginTop: metrics.scale(3, 2, 4),
			fontSize: metrics.scale(20, 17, 22),
			fontWeight: '800',
			textAlign: 'center',
		},
		modalTitle: {
			fontSize: metrics.scale(20, 17, 24),
			fontWeight: '700',
			color: colors.onSurface,
		},
		modalTitleCentered: {
			textAlign: 'center',
			alignSelf: 'stretch',
		},
		modalDescription: {
			fontSize: metrics.scale(14, 12, 18),
			lineHeight: metrics.scale(20, 18, 24),
			color: colors.onSurfaceVariant,
		},
		modalActions: {
			marginTop: metrics.scale(2, 1, 4),
			flexDirection: 'row',
			justifyContent: 'flex-end',
			alignItems: 'center',
			gap: metrics.scale(6, 4, 8),
		},
		bookingsList: {
			maxHeight: metrics.scale(290, 210, 340),
		},
		bookingsListContent: {
			gap: metrics.scale(8, 6, 10),
			paddingVertical: metrics.scale(2, 0, 4),
		},
		bookingItem: {
			borderRadius: metrics.scale(12, 10, 14),
			paddingHorizontal: metrics.scale(9, 7, 11),
			paddingVertical: metrics.scale(8, 6, 10),
			backgroundColor: colors.surfaceVariant,
			gap: metrics.scale(3, 2, 5),
		},
		bookingHeaderRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			gap: metrics.scale(6, 4, 8),
		},
		bookingFacilityName: {
			flex: 1,
			fontSize: metrics.scale(13, 12, 15),
			fontWeight: '700',
			color: colors.onSurface,
		},
		bookingDate: {
			fontSize: metrics.scale(10, 10, 12),
			fontWeight: '600',
			color: colors.onSurfaceVariant,
		},
		bookingTitle: {
			fontSize: metrics.scale(12, 11, 14),
			fontWeight: '600',
			color: colors.onSurfaceVariant,
		},
		bookingMeta: {
			fontSize: metrics.scale(11, 10, 13),
			color: colors.onSurfaceVariant,
		},
		bookingFooterRow: {
			marginTop: metrics.scale(1, 0, 2),
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'flex-end',
			gap: metrics.scale(8, 6, 10),
		},
		bookingCancelAction: {
			paddingHorizontal: metrics.scale(4, 2, 6),
			paddingVertical: metrics.scale(1, 0, 2),
			borderRadius: metrics.scale(6, 4, 8),
			alignSelf: 'flex-end',
		},
		bookingCancelActionDisabled: {
			opacity: 0.6,
		},
		bookingCancelActionText: {
			fontSize: metrics.scale(10, 9, 12),
			fontWeight: '700',
			color: '#b91c1c',
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
