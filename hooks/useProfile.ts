import * as React from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
	changeCurrentUserPassword,
	deleteCurrentUserAccount,
	signOutUser,
} from '../services/auth';
import {
	Booking,
	FacilitySection,
	getAllBookings,
	deleteBookingForUser,
	getBookingsForUserId,
	listFacilitySections,
} from '../services/firebase';
import {
	buildCurrentMonthSportData,
	buildStatisticsData,
} from '../screens/user/statisticsCharts';

type UseProfileOptions = {
	onSignOut?: () => void;
};

export function useProfile({ onSignOut }: UseProfileOptions) {
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1;
	const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
	const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

	const userEmail = auth?.currentUser?.email ?? 'Käyttäjänimi';
	const userInitial = React.useMemo(() => {
		const trimmedEmail = userEmail.trim();
		if (!trimmedEmail) {
			return 'H';
		}

		return trimmedEmail.charAt(0).toUpperCase();
	}, [userEmail]);

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

	return {
		userEmail,
		userInitial,
		isSigningOut,
		isDeletingAccount,
		errorMessage,
		deleteError,
		deleteEmail,
		setDeleteEmail,
		deletePassword,
		setDeletePassword,
		showPasswordForm,
		showDeleteModal,
		newPassword,
		setNewPassword,
		confirmPassword,
		setConfirmPassword,
		isChangingPassword,
		passwordMessage,
		passwordError,
		showBookingsModal,
		showBookingHistoryModal,
		showStatisticsModal,
		isLoadingBookings,
		deletingBookingId,
		bookingsError,
		userBookings,
		statisticsBookings,
		facilitySectionsById,
		currentTimestamp,
		profilePhotoUri,
		isPickingPhoto,
		pickProfilePhoto,
		openPasswordModal,
		closePasswordModal,
		openDeleteModal,
		closeDeleteModal,
		openBookingsModal,
		closeBookingsModal,
		openBookingHistoryModal,
		closeBookingHistoryModal,
		openStatisticsModal,
		closeStatisticsModal,
		handleDeleteBooking,
		handleSignOut,
		handleChangePassword,
		handleDeleteAccount,
		activeBookings,
		bookingHistory,
		statisticsData,
		allUsersCurrentMonthSportData,
		hasStatisticsData,
		trainingSummary,
		formatBookingDate,
	};
}