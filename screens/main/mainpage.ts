import React from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import { getDynamicSportHallLogoSource } from '../shared/logo';
import Screen from '../shared/Screen';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  db,
  Booking,
  deleteBookingForUser,
  FacilitySection,
  getBookingsForUserId,
  listFacilitySections,
} from '../../services/firebase';

type MainPageProps = {
  onOpenFacilities?: () => void;
  onOpenLogin?: () => void;
  onOpenProfile?: () => void;
};

export default function MainPage({
  onOpenFacilities,
  onOpenLogin,
  onOpenProfile,
}: MainPageProps) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics, colors, dark), [colors, dark, metrics]);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [showBookingsModal, setShowBookingsModal] = React.useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = React.useState(false);
  const [deletingBookingId, setDeletingBookingId] = React.useState<string | null>(null);
  const [bookingsError, setBookingsError] = React.useState<string | null>(null);
  const [userBookings, setUserBookings] = React.useState<Booking[]>([]);
  const [facilitySectionsById, setFacilitySectionsById] = React.useState<Record<string, FacilitySection>>({});

  React.useEffect(() => {
    if (!auth) {
      setIsSignedIn(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      if (!user) {
        setShowBookingsModal(false);
        setBookingsError(null);
        setUserBookings([]);
        setFacilitySectionsById({});
      }
    });

    return unsubscribe;
  }, []);

  const activeBookings = React.useMemo(
    () => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
      const currentTimeKey = `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;

      return userBookings.filter((booking) => {
        if (booking.status === 'cancelled') {
          return false;
        }

        if (booking.bookingDate > todayKey) {
          return true;
        }

        if (booking.bookingDate < todayKey) {
          return false;
        }

        return booking.slotEnd >= currentTimeKey;
      });
    },
    [userBookings]
  );

  const formatBookingDate = React.useCallback((value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return value;
    }

    return `${match[3]}.${match[2]}.${match[1]}`;
  }, []);

  const loadUserBookings = React.useCallback(async () => {
    const userId = auth?.currentUser?.uid;

    if (!userId || !db) {
      setBookingsError('Kirjaudu sisaan nahdaksesi varauksesi.');
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

  const confirmDeleteBooking = React.useCallback(async (bookingId: string) => {
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
  }, [loadUserBookings]);

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

  const openBookingsModal = React.useCallback(async () => {
    setShowBookingsModal(true);
    await loadUserBookings();
  }, [loadUserBookings]);

  const closeBookingsModal = React.useCallback(() => {
    if (isLoadingBookings || !!deletingBookingId) {
      return;
    }

    setShowBookingsModal(false);
  }, [deletingBookingId, isLoadingBookings]);
// Pääsivu
  return React.createElement(
    Screen,
    { style: [styles.safeArea, { backgroundColor: colors.background }] },
    React.createElement(
      View,
      { style: [styles.screen, { backgroundColor: colors.background }] },
      React.createElement(
        Surface,
        {
          style: styles.topSection,
          elevation: 2,
          children: [
            React.createElement(Image, {
              key: 'hero-logo',
              source: getDynamicSportHallLogoSource(dark),
              style: styles.logo,
              resizeMode: 'contain',
            }),
            React.createElement(Text, {
              key: 'hero-title',
              style: [styles.title, { color: colors.onSurface }],
              variant: 'displaySmall',
              children: 'HALLILLE!',
            }),
            React.createElement(Text, {
              key: 'hero-subtitle',
              style: [styles.subtitle, { color: colors.onSurfaceVariant }],
              children: 'Varaa vuorot helposti ja nopeasti!',
            }),
            React.createElement(
              View,
              { key: 'hero-actions', style: styles.buttonsWrap },
              React.createElement(Button, {
                mode: 'contained',
                onPress: onOpenFacilities,
                style: styles.primaryButton,
                contentStyle: styles.buttonContent,
                labelStyle: styles.buttonText,
                children: 'Vapaat kentät',
              }),
              !isSignedIn
                ? React.createElement(Button, {
                    mode: 'contained-tonal',
                    onPress: onOpenLogin,
                    style: styles.secondaryButton,
                    contentStyle: styles.buttonContent,
                    labelStyle: styles.secondaryButtonText,
                    children: 'Kirjaudu',
                  })
                  : React.createElement(Button, {
                    mode: 'contained-tonal',
                    onPress: openBookingsModal,
                    style: styles.secondaryButton,
                    contentStyle: styles.buttonContent,
                    labelStyle: styles.secondaryButtonText,
                    children: 'Omat varaukset',
                  })
            ),
          ],
        }
      ),
      React.createElement(
        IconButton,
        {
          icon: 'account-circle',
          mode: 'contained-tonal',
          size: metrics.scale(34, 28, 40),
          onPress: onOpenProfile,
          style: styles.profileIconButton,
          iconColor: colors.onSecondaryContainer,
          containerColor: colors.secondaryContainer,
          accessibilityLabel: 'Avaa profiili',
        }
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
                      sport.length > 0 && sectionName.toLowerCase().includes(sport.toLowerCase());
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
                  })
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
      backgroundColor: colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'space-between',
      paddingHorizontal: metrics.horizontalPadding,
      paddingTop: metrics.scale(48, 28, 64),
      paddingBottom: metrics.scale(22, 18, 30),
      alignItems: 'center',
    },
    topSection: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(28, 20, 34),
      paddingHorizontal: metrics.scale(20, 14, 28),
      paddingVertical: metrics.scale(20, 14, 30),
      borderWidth: 1,
      borderColor: colors.outline,
    },
    logo: {
      width: metrics.scale(132, 100, 150),
      height: metrics.scale(108, 84, 126),
      marginTop: metrics.scale(8, 4, 12),
    },
    title: {
      marginTop: metrics.scale(8, 6, 12),
      fontSize: metrics.scale(30, 24, 36),
      letterSpacing: 0.6,
      fontStyle: 'italic',
      color: colors.onSurface,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: metrics.scale(8, 6, 10),
      fontSize: metrics.scale(14, 12, 18),
      lineHeight: metrics.scale(20, 18, 24),
      textAlign: 'center',
      maxWidth: metrics.scale(320, 260, 420),
    },
    buttonsWrap: {
      marginTop: metrics.scale(28, 18, 36),
      width: '100%',
      alignItems: 'center',
      gap: metrics.scale(12, 10, 16),
    },
    primaryButton: {
      width: '100%',
      maxWidth: 340,
      borderRadius: metrics.scale(16, 14, 22),
    },
    secondaryButton: {
      width: '100%',
      maxWidth: 340,
      borderRadius: metrics.scale(16, 14, 22),
    },
    buttonContent: {
      height: metrics.scale(58, 48, 66),
    },
    buttonText: {
      color: '#ffffff',
      fontSize: metrics.scale(18, 15, 22),
      fontWeight: '700',
    },
    secondaryButtonText: {
      fontSize: metrics.scale(18, 15, 22),
      fontWeight: '700',
    },
    signedInBadge: {
      marginTop: metrics.scale(2, 0, 4),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: metrics.scale(14, 12, 18),
      paddingVertical: metrics.scale(10, 8, 12),
    },
    signedInText: {
      fontSize: metrics.scale(14, 12, 17),
      fontWeight: '700',
      color: colors.onSurfaceVariant,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: metrics.horizontalPadding,
    },
    modalCard: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      maxHeight: '80%',
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(24, 18, 30),
      paddingHorizontal: metrics.scale(18, 16, 24),
      paddingTop: metrics.scale(18, 16, 22),
      paddingBottom: metrics.scale(14, 12, 18),
      borderWidth: 1,
      borderColor: colors.outline,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: dark ? 0.45 : 0.22,
      shadowRadius: 28,
      elevation: dark ? 16 : 12,
    },
    modalTitle: {
      fontSize: metrics.scale(22, 18, 28),
      fontWeight: '700',
      color: colors.onSurface,
      marginBottom: metrics.scale(10, 8, 12),
    },
    modalDescription: {
      fontSize: metrics.scale(14, 12, 16),
      lineHeight: metrics.scale(20, 18, 24),
      color: colors.onSurfaceVariant,
      marginBottom: metrics.scale(8, 6, 10),
    },
    errorText: {
      fontSize: metrics.scale(14, 12, 16),
      lineHeight: metrics.scale(20, 18, 24),
      color: '#b91c1c',
      fontWeight: '600',
      marginBottom: metrics.scale(8, 6, 10),
    },
    bookingsList: {
      width: '100%',
    },
    bookingsListContent: {
      gap: metrics.scale(10, 8, 12),
      paddingVertical: metrics.scale(4, 2, 6),
    },
    bookingItem: {
      borderRadius: metrics.scale(16, 12, 18),
      paddingHorizontal: metrics.scale(14, 12, 16),
      paddingVertical: metrics.scale(12, 10, 14),
      backgroundColor: colors.surfaceVariant,
      gap: metrics.scale(4, 3, 6),
    },
    bookingHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: metrics.scale(8, 6, 10),
    },
    bookingFacilityName: {
      flex: 1,
      fontSize: metrics.scale(16, 14, 18),
      fontWeight: '700',
      color: colors.onSurface,
    },
    bookingDate: {
      fontSize: metrics.scale(13, 11, 15),
      color: colors.onSurfaceVariant,
      fontWeight: '600',
    },
    bookingTitle: {
      fontSize: metrics.scale(14, 12, 16),
      color: colors.onSurfaceVariant,
    },
    bookingMeta: {
      fontSize: metrics.scale(14, 12, 16),
      color: colors.onSurface,
      fontWeight: '700',
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
    modalActions: {
      marginTop: metrics.scale(12, 10, 14),
      alignItems: 'flex-end',
    },
    profileIconButton: {
      width: metrics.scale(66, 58, 74),
      height: metrics.scale(66, 58, 74),
      borderRadius: metrics.scale(33, 29, 37),
      alignSelf: 'center',
    },
  });
