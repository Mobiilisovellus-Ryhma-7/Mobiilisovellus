import React from 'react';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  Portal,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import { getDynamicSportHallLogoSource } from '../shared/logo';
import Screen from '../shared/Screen';
import {
  addFavoriteFacility,
  auth,
  createBooking,
  FacilitySection,
  db,
  getBookingsForSectionOnDate,
  listFavoriteFacilityIds,
  listFacilitySections,
  removeFavoriteFacility,
  searchFacilitySectionsByBookingStatus,
  searchFacilitySectionsBySport,
} from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { scheduleBookingReminder } from '../../services/notifications';
import { collection, getDocs } from 'firebase/firestore';
import { buildDailyTimeSlots, formatDateKey, TimeSlot } from '../../utils/timeslots';

type SearchProps = {
  onBack?: () => void;
  onGoHome?: () => void;
  initialSearchMode?: SearchMode;
  initialSport?: string;
  initialName?: string;
  initialBooked?: boolean;
};

type SearchMode = 'all' | 'sport' | 'name' | 'status';

type SportOption = {
  label: string;
  value: string;
};

type MapTile = {
  key: string;
  uri: string;
  left: number;
  top: number;
};

type MapPreview = {
  tiles: MapTile[];
  pointX: number;
  pointY: number;
};



function formatDateAsDbDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateAsDisplayDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${day}.${month}.${year}`;
}

function timeToHour(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes !== 0) {
    return null;
  }

  return hours;
}

function matchesDateFilter(section: FacilitySection, dateFilter: string | null): boolean {
  if (!dateFilter) {
    return true;
  }

  if (!section.createdAt) {
    return false;
  }

  const parsedDate = new Date(section.createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return formatDateAsDbDate(parsedDate) === dateFilter;
}

function parseDateKeyToDate(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeFacilityKey(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^id\s*:\s*/i, '')
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase();
}

function stripSportPrefixFromSectionName(sectionName: string, sportName: string): string {
  const trimmedSectionName = sectionName.trim();
  const trimmedSportName = sportName.trim();

  if (!trimmedSectionName || !trimmedSportName) {
    return trimmedSectionName;
  }

  const normalizedSectionName = trimmedSectionName.toLowerCase();
  const normalizedSportName = trimmedSportName.toLowerCase();

  if (normalizedSectionName.startsWith(normalizedSportName)) {
    const remainder = trimmedSectionName.slice(trimmedSportName.length).trim();
    const cleanedRemainder = remainder.replace(/^[-,:]\s*/, '').trim();
    return cleanedRemainder || trimmedSectionName;
  }

  return trimmedSectionName;
}

function latLonToTile(lat: number, lon: number, zoom: number) {
  const latitudeRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const y =
    ((1 - Math.log(Math.tan(latitudeRad) + 1 / Math.cos(latitudeRad)) / Math.PI) / 2) * n;

  return { x, y };
}

export default function Search({
  onBack,
  onGoHome,
  initialSearchMode,
  initialSport,
  initialName,
  initialBooked,
}: SearchProps) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics, colors), [colors, metrics]);

  const [selectedSection, setSelectedSection] = React.useState<FacilitySection | null>(null);
  const [sections, setSections] = React.useState<FacilitySection[]>([]);
  const [facilityNameById, setFacilityNameById] = React.useState<Record<string, string>>({});
  const [facilityAddressById, setFacilityAddressById] = React.useState<Record<string, string>>({});
  const [mapPreview, setMapPreview] = React.useState<MapPreview | null>(null);
  const [mapViewport, setMapViewport] = React.useState({ width: 0, height: 0 });
  const [searchMode, setSearchMode] = React.useState<SearchMode>(initialSearchMode ?? 'all');
  const [sportInput, setSportInput] = React.useState(initialSport ?? '');
  const [nameInput, setNameInput] = React.useState(initialName ?? '');
  const [sportOptions, setSportOptions] = React.useState<SportOption[]>([]);
  const [isSportPickerOpen, setIsSportPickerOpen] = React.useState(false);
  const [isPlacePickerOpen, setIsPlacePickerOpen] = React.useState(false);
  const [bookedOnly, setBookedOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeDateFilter, setActiveDateFilter] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(auth?.currentUser?.uid ?? null);
  const [favoriteFacilityIds, setFavoriteFacilityIds] = React.useState<Set<string>>(new Set());
  const [isSyncingFavoriteFacilityId, setIsSyncingFavoriteFacilityId] = React.useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [sectionBookings, setSectionBookings] = React.useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = React.useState(false);
  const [bookingFeedback, setBookingFeedback] = React.useState<string | null>(null);
  const [bookingError, setBookingError] = React.useState<string | null>(null);
  const [pendingBookingSlot, setPendingBookingSlot] = React.useState<TimeSlot | null>(null);
  const hasBootstrappedList = React.useRef(false);
  const hasAppliedInitialFilters = React.useRef(false);
  const bookingDate = React.useMemo(
    () => activeDateFilter ?? formatDateKey(new Date()),
    [activeDateFilter]
  );
  const slotDate = React.useMemo(() => {
    if (activeDateFilter) {
      const parsed = parseDateKeyToDate(activeDateFilter);
      if (parsed) {
        return parsed;
      }
    }

    return new Date();
  }, [activeDateFilter]);
  const todaySlots = React.useMemo(() => {
    const startHour = timeToHour(selectedSection?.openingStart);
    const endHour = timeToHour(selectedSection?.openingEnd);

    return buildDailyTimeSlots(slotDate, {
      startHour: startHour ?? 8,
      endHour: endHour ?? 22,
    });
  }, [selectedSection?.openingEnd, selectedSection?.openingStart, slotDate]);

  const runSearch = React.useCallback(
    async (
      modeOverride?: SearchMode,
      sportOverride?: string,
      bookedOverride?: boolean,
      nameOverride?: string,
      dateFilterOverride?: string | null
    ) => {
      const mode = modeOverride ?? searchMode;
      const dateFilter = dateFilterOverride ?? activeDateFilter;
      setErrorMessage(null);
      setIsLoading(true);

      try {
        let nextSections: FacilitySection[] = [];

        if (mode === 'sport') {
          const value = (sportOverride ?? sportInput).trim();
          if (!value) {
            throw new Error('Syota laji ennen hakua.');
          }
          nextSections = (await searchFacilitySectionsBySport(value)).filter(
            (section) => section.isBooked !== true
          );
        } else if (mode === 'name') {
          const value = (nameOverride ?? nameInput).trim();
          if (!value) {
            throw new Error('Syota kentan nimi ennen hakua.');
          }

          if (!db) {
            throw new Error('Tietokantayhteys puuttuu.');
          }

          const [facilitiesSnapshot, allSections] = await Promise.all([
            getDocs(collection(db, 'facilities')),
            listFacilitySections(),
          ]);

          const normalizedNameValue = value.trim().toLowerCase();
          const matchingFacilityIds = new Set(
            facilitiesSnapshot.docs
              .filter((doc) => {
                const data = doc.data() as { name?: unknown };
                const facilityName = typeof data.name === 'string' ? data.name.trim().toLowerCase() : '';
                return facilityName.includes(normalizedNameValue);
              })
              .flatMap((doc) => {
                const data = doc.data() as { id?: unknown };
                const keys = [normalizeFacilityKey(doc.id), normalizeFacilityKey(data.id)];
                return keys.filter((key) => !!key);
              })
          );

          nextSections = allSections.filter(
            (section) => matchingFacilityIds.has(normalizeFacilityKey(section.facilityId))
          );
        } else if (mode === 'status') {
          const bookedValue = bookedOverride ?? bookedOnly;
          const activeSport = sportInput.trim();

          if (activeSport) {
            nextSections = (await searchFacilitySectionsBySport(activeSport)).filter(
              (section) => section.isBooked === bookedValue
            );
          } else {
            nextSections = await searchFacilitySectionsByBookingStatus(bookedValue);
          }
        } else {
          nextSections = await listFacilitySections();
        }

        if (mode === 'sport') {
          const activePlace = (nameOverride ?? nameInput).trim();

          if (activePlace) {
            if (!db) {
              throw new Error('Tietokantayhteys puuttuu.');
            }

            const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
            const normalizedPlaceValue = activePlace.toLowerCase();
            const matchingFacilityIds = new Set(
              facilitiesSnapshot.docs
                .filter((doc) => {
                  const data = doc.data() as { name?: unknown };
                  const facilityName = typeof data.name === 'string' ? data.name.trim().toLowerCase() : '';
                  return facilityName.includes(normalizedPlaceValue);
                })
                .flatMap((doc) => {
                  const data = doc.data() as { id?: unknown };
                  const keys = [normalizeFacilityKey(doc.id), normalizeFacilityKey(data.id)];
                  return keys.filter((key) => !!key);
                })
            );

            nextSections = nextSections.filter(
              (section) => matchingFacilityIds.has(normalizeFacilityKey(section.facilityId))
            );
          }
        }

        if (mode === 'name') {
          const activeSport = (sportOverride ?? sportInput).trim();

          if (activeSport) {
            const normalizedSport = activeSport.toLowerCase();
            nextSections = nextSections.filter(
              (section) => (section.sport ?? '').trim().toLowerCase() === normalizedSport
            );
          }
        }

        if (dateFilter) {
          const targetDate = parseDateKeyToDate(dateFilter);
          if (!targetDate) {
            throw new Error('Virheellinen paivamaara.');
          }

          const sectionAvailability = await Promise.all(
            nextSections.map(async (section) => {
              const bookings = await getBookingsForSectionOnDate(section.id, dateFilter, ['confirmed']);
              const bookedSlots = new Set(
                bookings
                  .filter((booking) => booking.slotStart && booking.slotEnd)
                  .map((booking) => `${booking.slotStart}-${booking.slotEnd}`)
              );

              const startHour = timeToHour(section.openingStart) ?? 8;
              const endHour = timeToHour(section.openingEnd) ?? 22;
              const daySlots = buildDailyTimeSlots(targetDate, { startHour, endHour });

              const hasFreeSlot = daySlots.some((slot) => !slot.isPast && !bookedSlots.has(slot.key));
              return { section, hasFreeSlot };
            })
          );

          nextSections = sectionAvailability
            .filter((item) => item.hasFreeSlot)
            .map((item) => item.section);
        }

        setSections(nextSections);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Haku epaonnistui. Yrita uudelleen.';
        setErrorMessage(message);
        setSections([]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeDateFilter, bookedOnly, nameInput, searchMode, sportInput]
  );

  const loadFavoriteFacilities = React.useCallback(async (userId: string) => {
    try {
      const favorites = await listFavoriteFacilityIds(userId);
      setFavoriteFacilityIds(new Set(favorites));
    } catch {
      setFavoriteFacilityIds(new Set());
    }
  }, []);

  React.useEffect(() => {
    if (!auth) {
      setCurrentUserId(null);
      setFavoriteFacilityIds(new Set());
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const nextUserId = user?.uid ?? null;
      setCurrentUserId(nextUserId);

      if (!nextUserId) {
        setFavoriteFacilityIds(new Set());
        return;
      }

      void loadFavoriteFacilities(nextUserId);
    });

    return unsubscribe;
  }, [loadFavoriteFacilities]);

  React.useEffect(() => {
    let isActive = true;

    listFacilitySections()
      .then((allSections) => {
        if (!isActive) {
          return;
        }

        const uniqueSports = Array.from(
          new Set(
            allSections
              .map((section) => section.sport?.trim())
              .filter((value): value is string => !!value)
          )
        ).sort((left, right) => left.localeCompare(right, 'fi'));

        setSportOptions(uniqueSports.map((value) => ({ label: value, value })));
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setSportOptions([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    let isActive = true;

    if (!db) {
      setFacilityNameById({});
      setFacilityAddressById({});
      return () => {
        isActive = false;
      };
    }

    getDocs(collection(db, 'facilities'))
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        const nextFacilityNameById = snapshot.docs.reduce<Record<string, string>>((acc, doc) => {
          const data = doc.data() as { id?: unknown; name?: unknown };
          if (typeof data.name === 'string' && data.name.trim()) {
            const normalizedDocId = normalizeFacilityKey(doc.id);
            const normalizedDataId = normalizeFacilityKey(data.id);
            if (normalizedDocId) {
              acc[normalizedDocId] = data.name.trim();
            }
            if (normalizedDataId) {
              acc[normalizedDataId] = data.name.trim();
            }
          }
          return acc;
        }, {});

        const nextFacilityAddressById = snapshot.docs.reduce<Record<string, string>>((acc, doc) => {
          const data = doc.data() as { id?: unknown; address?: unknown };
          if (typeof data.address === 'string' && data.address.trim()) {
            const normalizedDocId = normalizeFacilityKey(doc.id);
            const normalizedDataId = normalizeFacilityKey(data.id);
            if (normalizedDocId) {
              acc[normalizedDocId] = data.address.trim();
            }
            if (normalizedDataId) {
              acc[normalizedDataId] = data.address.trim();
            }
          }
          return acc;
        }, {});

        setFacilityNameById(nextFacilityNameById);
        setFacilityAddressById(nextFacilityAddressById);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setFacilityNameById({});
        setFacilityAddressById({});
      });

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (hasBootstrappedList.current) {
      return;
    }

    hasBootstrappedList.current = true;

    if (initialSearchMode === 'sport' && initialSport) {
      return;
    }

    if (initialSearchMode === 'name' && initialName) {
      return;
    }

    if (initialSearchMode === 'status' && typeof initialBooked === 'boolean') {
      return;
    }

    runSearch('all');
  }, [initialBooked, initialName, initialSearchMode, initialSport, runSearch]);

  React.useEffect(() => {
    if (hasAppliedInitialFilters.current) {
      return;
    }

    hasAppliedInitialFilters.current = true;

    if (initialSearchMode === 'sport' && initialSport) {
      setSearchMode('sport');
      setSportInput(initialSport);
      runSearch('sport', initialSport);
    }

    if (initialSearchMode === 'name' && initialName) {
      setSearchMode('name');
      setNameInput(initialName);
      runSearch('name');
    }

    if (initialSearchMode === 'status' && typeof initialBooked === 'boolean') {
      setSearchMode('status');
      setBookedOnly(initialBooked);
      runSearch('status', undefined, initialBooked);
    }
  }, [initialBooked, initialName, initialSearchMode, initialSport, runSearch]);

  const openMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setErrorMessage(null);
  };

  const openSportPicker = React.useCallback(() => {
    setSearchMode('sport');
    setErrorMessage(null);
    setIsSportPickerOpen(true);
  }, []);

  const openPlacePicker = React.useCallback(() => {
    setSearchMode('name');
    setErrorMessage(null);
    setIsPlacePickerOpen(true);
  }, []);

  const selectSport = React.useCallback(
    async (value: string) => {
      setSportInput(value);
      setSearchMode('sport');
      setErrorMessage(null);
      setIsSportPickerOpen(false);
      await runSearch('sport', value);
    },
    [runSearch]
  );

  const clearSportFilter = React.useCallback(async () => {
    const activePlace = nameInput.trim();
    const nextMode: SearchMode = activePlace ? 'name' : 'all';

    setSportInput('');
    setSearchMode(nextMode);
    setErrorMessage(null);
    setIsSportPickerOpen(false);
    await runSearch(nextMode, '', undefined, activePlace || undefined);
  }, [nameInput, runSearch]);

  const selectPlace = React.useCallback(
    async (value: string) => {
      setNameInput(value);
      setSearchMode('name');
      setErrorMessage(null);
      setIsPlacePickerOpen(false);
      await runSearch('name', undefined, undefined, value);
    },
    [runSearch]
  );

  const clearPlaceFilter = React.useCallback(async () => {
    const activeSport = sportInput.trim();
    const nextMode: SearchMode = activeSport ? 'sport' : 'all';

    setNameInput('');
    setSearchMode(nextMode);
    setErrorMessage(null);
    setIsPlacePickerOpen(false);
    await runSearch(nextMode, activeSport || undefined, undefined, '');
  }, [runSearch, sportInput]);

  const toggleFavoritesFilter = React.useCallback(() => {
    if (!currentUserId) {
      Alert.alert('Kirjaudu sisaan', 'Sinun tulee kirjautua sisaan ennen suosikkien tarkastelua.');
      return;
    }

    setShowFavoritesOnly((current) => !current);
  }, [currentUserId]);

  const applyDateFilter = React.useCallback((date: Date) => {
    const nextDateFilter = formatDateAsDbDate(date);
    setActiveDateFilter(nextDateFilter);
    return nextDateFilter;
  }, []);

  const loadSelectedSectionBookings = React.useCallback(async (sectionId: string) => {
    const bookings = await getBookingsForSectionOnDate(sectionId, bookingDate, ['confirmed']);
    const bookedSlotKeys = bookings
      .filter((booking) => booking.slotStart && booking.slotEnd)
      .map((booking) => `${booking.slotStart}-${booking.slotEnd}`);

    setSectionBookings(bookedSlotKeys);
  }, [bookingDate]);

  React.useEffect(() => {
    if (!selectedSection) {
      setSectionBookings([]);
      setBookingFeedback(null);
      setBookingError(null);
      setPendingBookingSlot(null);
      setIsLoadingSlots(false);
      return;
    }

    let isActive = true;
    setIsLoadingSlots(true);
    setBookingFeedback(null);
    setBookingError(null);

    loadSelectedSectionBookings(selectedSection.id)
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error
          ? error.message
          : 'Varausten lataus epaonnistui.';
        setBookingError(message);
        setSectionBookings([]);
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoadingSlots(false);
      });

    return () => {
      isActive = false;
    };
  }, [loadSelectedSectionBookings, selectedSection]);

  const onBookSlot = React.useCallback(
    async (slot: TimeSlot) => {
      if (!selectedSection) {
        return;
      }

      const userId = auth?.currentUser?.uid;
      if (!userId) {
        setBookingError('Kirjaudu sisaan varataksesi vuoron.');
        return;
      }

      setIsSubmittingBooking(true);
      setBookingError(null);
      setBookingFeedback(null);

      try {
        await createBooking({
          facilitySectionId: selectedSection.id,
          userId,
          bookingDate,
          slotStart: slot.start,
          slotEnd: slot.end,
          status: 'confirmed',
        });

        const facilityName = getFacilityName(selectedSection);
        await scheduleBookingReminder({
          facilityName,
          bookingDate,
          slotStart: slot.start,
          minutesBefore: 15,
        });

        setBookingFeedback(`Vuoro ${slot.label} varattu.`);
        await loadSelectedSectionBookings(selectedSection.id);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Varaus epaonnistui. Yrita uudelleen.';
        setBookingError(message);
      } finally {
        setIsSubmittingBooking(false);
      }
    },
    [bookingDate, loadSelectedSectionBookings, selectedSection]
  );

  const confirmBookSlot = React.useCallback(async () => {
    if (!pendingBookingSlot) {
      return;
    }

    await onBookSlot(pendingBookingSlot);
    setPendingBookingSlot(null);
  }, [onBookSlot, pendingBookingSlot]);

  const selectedSectionSlotRows = React.useMemo(() => {
    const bookedSet = new Set(sectionBookings);

    return todaySlots.map((slot) => {
      const isBooked = bookedSet.has(slot.key);
      const disabled = isBooked || slot.isPast || isSubmittingBooking;
      const statusLabel = isBooked ? 'Varattu' : slot.isPast ? 'Mennyt' : 'Vapaa';

      return React.createElement(
        Pressable,
        {
          key: slot.key,
          style: [
            styles.slotBookingRow,
            disabled ? styles.slotBookingRowDisabled : null,
            isBooked ? styles.slotBookingRowBooked : null,
          ],
          disabled,
          onPress: () => setPendingBookingSlot(slot),
        },
        React.createElement(Text, {
          style: styles.slotBookingLabel,
          children: slot.label,
        }),
        React.createElement(Text, {
          style: [
            styles.slotBookingStatus,
            isBooked ? styles.slotBookingStatusBooked : null,
            !isBooked && slot.isPast ? styles.slotBookingStatusPast : null,
          ],
          children: statusLabel,
        })
      );
    });
  }, [isSubmittingBooking, sectionBookings, todaySlots, styles]);

  const filteredSections = React.useMemo(() => {
    const visibleSections = sections
      .filter((section) => matchesDateFilter(section, activeDateFilter))
      .filter((section) => {
        if (!showFavoritesOnly) {
          return true;
        }

        const facilityKey = normalizeFacilityKey(section.facilityId);
        return !!facilityKey && favoriteFacilityIds.has(facilityKey);
      });

    return [...visibleSections].sort((left, right) => {
      const rightValue = favoriteFacilityIds.has(normalizeFacilityKey(right.facilityId)) ? 1 : 0;
      const leftValue = favoriteFacilityIds.has(normalizeFacilityKey(left.facilityId)) ? 1 : 0;
      return rightValue - leftValue;
    });
  }, [activeDateFilter, favoriteFacilityIds, sections, showFavoritesOnly]);
  const slotsTitle = React.useMemo(() => {
    const selectedDay = new Date(slotDate);
    selectedDay.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneDayInMs = 24 * 60 * 60 * 1000;
    const dayDiff = Math.round((selectedDay.getTime() - today.getTime()) / oneDayInMs);

    if (dayDiff === 0) {
      return 'Vuorot tänään';
    }

    if (dayDiff === 1) {
      return 'Vuorot huomenna';
    }

    if (dayDiff === 2) {
      return 'Vuorot ylihuomenna';
    }

    return `Vuorot ${formatDateAsDisplayDate(selectedDay)}`;
  }, [slotDate]);

  const filteredSections = React.useMemo(() => sections, [sections]);

  const placeOptions = React.useMemo(
    () =>
      Array.from(new Set(Object.values(facilityNameById)))
        .filter((value) => !!value)
        .sort((left, right) => left.localeCompare(right, 'fi')),
    [facilityNameById]
  );

  const formatSectionLabel = React.useCallback(
    (section: FacilitySection) => {
      const facilityName =
        facilityNameById[normalizeFacilityKey(section.facilityId)] ?? 'Tuntematon halli';
      const sportName = section.sport?.trim() || 'Tuntematon laji';
      const rawSectionName = section.name?.trim() || 'Nimeton kentta';
      const sectionName = stripSportPrefixFromSectionName(rawSectionName, sportName);
      return `${facilityName}, ${sportName}, ${sectionName}`;
    },
    [facilityNameById]
  );

  const getFacilityName = React.useCallback(
    (section: FacilitySection) =>
      facilityNameById[normalizeFacilityKey(section.facilityId)] ?? 'Tuntematon halli',
    [facilityNameById]
  );

  const getSportAndFieldLabel = React.useCallback((section: FacilitySection) => {
    const sportName = section.sport?.trim() || 'Tuntematon laji';
    const rawSectionName = section.name?.trim() || 'Nimeton kentta';
    const sectionName = stripSportPrefixFromSectionName(rawSectionName, sportName);
    return `${sportName}, ${sectionName}`;
  }, []);

  const getFacilityAddress = React.useCallback(
    (section: FacilitySection) =>
      facilityAddressById[normalizeFacilityKey(section.facilityId)] ?? null,
    [facilityAddressById]
  );

  const isFacilityFavorite = React.useCallback(
    (section: FacilitySection) => {
      const facilityKey = normalizeFacilityKey(section.facilityId);
      return !!facilityKey && favoriteFacilityIds.has(facilityKey);
    },
    [favoriteFacilityIds]
  );

  const toggleFavoriteForSection = React.useCallback(
    async (section: FacilitySection) => {
      const facilityKey = normalizeFacilityKey(section.facilityId);

      if (!facilityKey) {
        setErrorMessage('Hallia ei voitu lisata suosikkeihin.');
        return;
      }

      if (!currentUserId) {
        setErrorMessage(null);
        Alert.alert('Kirjaudu sisaan', 'Sinun tulee kirjautua sisaan ennen suosikkien lisaamista.');
        return;
      }

      const wasFavorite = favoriteFacilityIds.has(facilityKey);
      setIsSyncingFavoriteFacilityId(facilityKey);
      setErrorMessage(null);

      setFavoriteFacilityIds((previous) => {
        const next = new Set(previous);
        if (wasFavorite) {
          next.delete(facilityKey);
        } else {
          next.add(facilityKey);
        }
        return next;
      });

      try {
        if (wasFavorite) {
          await removeFavoriteFacility(currentUserId, facilityKey);
        } else {
          await addFavoriteFacility(currentUserId, facilityKey);
        }
      } catch {
        setFavoriteFacilityIds((previous) => {
          const next = new Set(previous);
          if (wasFavorite) {
            next.add(facilityKey);
          } else {
            next.delete(facilityKey);
          }
          return next;
        });
        setErrorMessage('Suosikin paivitys epaonnistui. Yrita uudelleen.');
      } finally {
        setIsSyncingFavoriteFacilityId(null);
      }
    },
    [currentUserId, favoriteFacilityIds]
  );

  const openInMaps = React.useCallback(async () => {
    if (!selectedSection) {
      return;
    }

    const address = getFacilityAddress(selectedSection);
    const fallbackQuery = encodeURIComponent(
      address ?? `${getFacilityName(selectedSection)}, Oulu, Finland`
    );

    const primaryUrl =
      Platform.OS === 'ios'
        ? `maps://?q=${fallbackQuery}`
        : `geo:0,0?q=${fallbackQuery}`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`;

    try {
      const supported = await Linking.canOpenURL(primaryUrl);
      if (supported) {
        await Linking.openURL(primaryUrl);
        return;
      }

      await Linking.openURL(fallbackUrl);
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  }, [getFacilityAddress, getFacilityName, selectedSection]);

  React.useEffect(() => {
    let isActive = true;

    const loadMapPreview = async () => {
      if (!selectedSection) {
        setMapPreview(null);
        return;
      }

      const address = getFacilityAddress(selectedSection);
      if (!address) {
        setMapPreview(null);
        return;
      }

      try {
        const query = encodeURIComponent(`${address}, Finland`);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=jsonv2&limit=1&countrycodes=fi`,
          {
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'fi',
              'User-Agent': 'hallille-app/1.0 (expo)',
            },
          }
        );

        if (!response.ok) {
          setMapPreview(null);
          return;
        }

        const results = (await response.json()) as Array<{ lat: string; lon: string }>;

        if (!isActive || !results[0]) {
          setMapPreview(null);
          return;
        }

        const latitude = Number(results[0].lat);
        const longitude = Number(results[0].lon);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          setMapPreview(null);
          return;
        }

        const zoom = 15;
        const tileCoords = latLonToTile(latitude, longitude, zoom);
        const centerTileX = Math.floor(tileCoords.x);
        const centerTileY = Math.floor(tileCoords.y);
        const fracX = tileCoords.x - centerTileX;
        const fracY = tileCoords.y - centerTileY;
        const tileSize = 256;

        const tiles: MapTile[] = [];
        for (let row = -1; row <= 1; row += 1) {
          for (let col = -1; col <= 1; col += 1) {
            const tileX = centerTileX + col;
            const tileY = centerTileY + row;
            tiles.push({
              key: `${zoom}-${tileX}-${tileY}`,
              uri: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
              left: (col + 1) * tileSize,
              top: (row + 1) * tileSize,
            });
          }
        }

        setMapPreview({
          tiles,
          pointX: (1 + fracX) * tileSize,
          pointY: (1 + fracY) * tileSize,
        });
      } catch {
        if (!isActive) {
          return;
        }
        setMapPreview(null);
      }
    };

    void loadMapPreview();

    return () => {
      isActive = false;
    };
  }, [getFacilityAddress, selectedSection]);

  const onMapViewportLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setMapViewport({ width: nextWidth, height: nextHeight });
  }, []);

  const mapCanvasOffset = React.useMemo(() => {
    if (!mapPreview) {
      return { left: 0, top: 0 };
    }

    return {
      left: mapViewport.width / 2 - mapPreview.pointX,
      top: mapViewport.height / 2 - mapPreview.pointY,
    };
  }, [mapPreview, mapViewport.height, mapViewport.width]);

  const slotRows = filteredSections.map((section) =>
    React.createElement(
      Pressable,
      {
        key: section.id,
        style: styles.slotRow,
        onPress: () => setSelectedSection(section),
      },
      React.createElement(
        View,
        { style: styles.slotTextWrap },
        React.createElement(Text, {
          style: [styles.slotTitle, { color: colors.onSurface }],
          children: getFacilityName(section),
        }),
        React.createElement(Text, {
          style: [styles.slotTime, { color: colors.onSurface }],
          children: getSportAndFieldLabel(section),
        })
      ),
      React.createElement(
        View,
        { style: styles.slotActions },
        React.createElement(
          Pressable,
          {
            style: [
              styles.favoriteButton,
              isSyncingFavoriteFacilityId === normalizeFacilityKey(section.facilityId)
                ? styles.favoriteButtonDisabled
                : null,
            ],
            onPress: (event) => {
              event.stopPropagation();
              void toggleFavoriteForSection(section);
            },
          },
          React.createElement(Text, {
            style: [
              styles.favoriteButtonText,
              isFacilityFavorite(section) ? styles.favoriteButtonTextActive : null,
            ],
            children: isFacilityFavorite(section) ? '★' : '☆',
          })
        ),
        React.createElement(Text, {
          style: styles.chevron,
          children: '>',
        })
      )
    )
  );

  const listContent =
    slotRows.length > 0
      ? slotRows
      : [
          React.createElement(Text, {
            key: 'empty-slots',
            style: styles.emptyText,
            children: 'Ei vapaita vuoroja valitulla päivällä.',
          }),
        ];

  return React.createElement(
    Screen,
    { style: [styles.safeArea, { backgroundColor: colors.background }] },
    React.createElement(
      View,
      { style: [styles.screen, { backgroundColor: colors.background }] },
      React.createElement(
        View,
        { style: styles.topArea },
        React.createElement(
          View,
          { style: styles.headerRow },
          React.createElement(
            Pressable,
            { style: styles.backButton, onPress: onBack },
            React.createElement(Text, { style: styles.backIcon, children: '<' })
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
          style: [styles.title, { color: colors.onSurface }],
          variant: 'titleMedium',
          children: 'HALLILLE',
        }),
        React.createElement(
          View,
          { style: styles.filtersRow },
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'sport',
            onPress: openSportPicker,
            children: 'Laji',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'name',
            onPress: openPlacePicker,
            children: 'Paikka',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            onPress: () => setIsDatePickerVisible(true),
            children: activeDateFilter
              ? `${`${selectedDate.getDate()}`.padStart(2, '0')}.${`${selectedDate.getMonth() + 1}`.padStart(2, '0')}.${selectedDate.getFullYear()}`
              : 'Pvm',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'status',
            onPress: toggleBookingStatus,
            children: bookedOnly ? 'Vapaat' : 'Varatut',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: showFavoritesOnly,
            onPress: toggleFavoritesFilter,
            children: showFavoritesOnly ? 'Suosikit ✓' : 'Suosikit',
          })
        ),
      ),
      React.createElement(
        Surface,
        {
          style: styles.listSurface,
          elevation: 0,
          children: React.createElement(
            ScrollView,
            { contentContainerStyle: styles.listContent },
            errorMessage
              ? React.createElement(Text, {
                  style: styles.errorText,
                  children: errorMessage,
                })
              : null,
            isLoading
              ? React.createElement(ActivityIndicator, {
                  size: 'small',
                  style: styles.loading,
                })
              : null,
            !isLoading && filteredSections.length === 0
              ? React.createElement(Text, {
                  style: styles.emptyText,
                  children: 'Ei tuloksia valituilla hakuehdoilla.',
                })
              : null,
            ...slotRows
          ),
        }
      ),
      React.createElement(
        Modal,
        {
          visible: isSportPickerOpen,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsSportPickerOpen(false),
        },
        React.createElement(
          View,
          { style: styles.modalBackdrop },
          React.createElement(Pressable, {
            style: styles.modalDismissLayer,
            onPress: () => setIsSportPickerOpen(false),
          }),
          React.createElement(
            View,
            { style: styles.modalPickerCard },
            React.createElement(Text, {
              style: styles.modalPickerTitle,
              children: 'Valitse laji',
            }),
            React.createElement(
              ScrollView,
              {
                style: styles.sportPickerList,
                contentContainerStyle: styles.sportPickerListContent,
              },
              sportOptions.length > 0
                ? sportOptions.map((option) =>
                    React.createElement(
                      Pressable,
                      {
                        key: option.value,
                        style: [
                          styles.sportOption,
                          sportInput === option.value ? styles.sportOptionActive : null,
                        ],
                        onPress: () => selectSport(option.value),
                      },
                      React.createElement(Text, {
                        style: [
                          styles.sportOptionText,
                          sportInput === option.value ? styles.sportOptionTextActive : null,
                        ],
                        children: option.label,
                      })
                    )
                  )
                : React.createElement(Text, {
                    style: styles.emptySportText,
                    children: 'Lajeja ei löytynyt vielä tietokannasta.',
                  })
            ),
            React.createElement(
              View,
              { style: styles.modalPickerActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => void clearSportFilter(),
                children: 'Kaikki',
              }),
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsSportPickerOpen(false),
                children: 'Sulje',
              })
            )
          )
        )
      ),
      React.createElement(
        Modal,
        {
          visible: isPlacePickerOpen,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsPlacePickerOpen(false),
        },
        React.createElement(
          Pressable,
          {
            style: styles.modalBackdrop,
            onPress: () => setIsPlacePickerOpen(false),
          },
          React.createElement(
            Pressable,
            {
              style: styles.modalPickerCard,
              onPress: () => undefined,
            },
            React.createElement(Text, {
              style: styles.modalPickerTitle,
              children: 'Valitse paikka',
            }),
            React.createElement(
              ScrollView,
              {
                style: styles.sportPickerList,
                contentContainerStyle: styles.sportPickerListContent,
              },
              placeOptions.length > 0
                ? placeOptions.map((option) =>
                    React.createElement(
                      Pressable,
                      {
                        key: option,
                        style: [
                          styles.sportOption,
                          nameInput === option ? styles.sportOptionActive : null,
                        ],
                        onPress: () => selectPlace(option),
                      },
                      React.createElement(Text, {
                        style: [
                          styles.sportOptionText,
                          nameInput === option ? styles.sportOptionTextActive : null,
                        ],
                        children: option,
                      })
                    )
                  )
                : React.createElement(Text, {
                    style: styles.emptySportText,
                    children: 'Paikkoja ei löytynyt tietokannasta.',
                  })
            ),
            React.createElement(
              View,
              { style: styles.modalPickerActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => void clearPlaceFilter(),
                children: 'Kaikki',
              }),
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsPlacePickerOpen(false),
                children: 'Sulje',
              })
            )
          )
        )
      ),
      React.createElement(
        Modal,
        {
          visible: isDatePickerVisible,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsDatePickerVisible(false),
        },
        React.createElement(
          Pressable,
          {
            style: styles.modalBackdrop,
            onPress: () => setIsDatePickerVisible(false),
          },
          React.createElement(
            Pressable,
            {
              style: styles.modalPickerCard,
              onPress: () => undefined,
            },
            React.createElement(Text, {
              style: styles.modalPickerTitle,
              children: 'Valitse päivämäärä',
            }),
            React.createElement(DateTimePicker, {
              value: selectedDate,
              mode: 'date',
              locale: 'fi-FI',
              display: Platform.OS === 'ios' ? 'inline' : 'calendar',
              themeVariant: dark ? 'dark' : 'light',
              onChange: (event: DateTimePickerEvent, date?: Date) => {
                if (!date || event.type === 'dismissed') {
                  setIsDatePickerVisible(false);
                  return;
                }

                setSelectedDate(date);
                const nextDateFilter = applyDateFilter(date);
                void runSearch(undefined, undefined, undefined, undefined, nextDateFilter);
                setIsDatePickerVisible(false);
              },
            }),
            React.createElement(
              View,
              { style: styles.modalPickerActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsDatePickerVisible(false),
                children: 'Sulje',
              })
            )
          )
        )
      ),
      React.createElement(Portal, {
        children: React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Dialog,
            {
              visible: !!selectedSection,
              onDismiss: () => setSelectedSection(null),
              style: styles.dialog,
              children: React.createElement(
                View,
                { style: styles.modalCard },
                React.createElement(
                  View,
                  { style: styles.modalTopRow },
                  React.createElement(Text, {
                    style: styles.modalHall,
                    children: selectedSection ? getFacilityName(selectedSection) : '-',
                  }),
                  React.createElement(
                    View,
                    { style: styles.modalTopActions },
                    React.createElement(
                      Pressable,
                      {
                        style: [
                          styles.favoriteButton,
                          selectedSection &&
                          isSyncingFavoriteFacilityId === normalizeFacilityKey(selectedSection.facilityId)
                            ? styles.favoriteButtonDisabled
                            : null,
                        ],
                        onPress: () => {
                          if (selectedSection) {
                            void toggleFavoriteForSection(selectedSection);
                          }
                        },
                      },
                      React.createElement(Text, {
                        style: [
                          styles.favoriteButtonText,
                          selectedSection && isFacilityFavorite(selectedSection)
                            ? styles.favoriteButtonTextActive
                            : null,
                        ],
                        children:
                          selectedSection && isFacilityFavorite(selectedSection) ? '★' : '☆',
                      })
                    ),
                    React.createElement(Text, {
                      style: styles.modalTime,
                      children: selectedSection?.isBooked ? 'Varattu' : null,
                    })
                  )
                ),
                React.createElement(Text, {
                  style: styles.modalSubLine,
                  children: selectedSection ? getSportAndFieldLabel(selectedSection) : '-',
                }),
                React.createElement(
                  Pressable,
                  {
                    style: styles.mapPlaceholder,
                    onPress: () => void openInMaps(),
                    onLayout: onMapViewportLayout,
                  },
                  mapPreview
                    ? React.createElement(
                        View,
                        {
                          style: [
                            styles.mapCanvas,
                            {
                              left: mapCanvasOffset.left,
                              top: mapCanvasOffset.top,
                            },
                          ],
                        },
                        ...mapPreview.tiles.map((tile) =>
                          React.createElement(Image, {
                            key: tile.key,
                            source: { uri: tile.uri },
                            style: [styles.mapTile, { left: tile.left, top: tile.top }],
                            resizeMode: 'cover',
                          })
                        )
                      )
                    : React.createElement(Text, {
                        style: styles.mapPin,
                        children: 'Karttaa ladataan...',
                      }),
                  mapPreview
                    ? React.createElement(View, {
                        style: [
                          styles.mapDot,
                          {
                            left: '50%',
                            top: '50%',
                          },
                        ],
                      })
                    : null
                ),
                React.createElement(Text, {
                  style: styles.modalSubLine,
                  children: `Osoite: ${selectedSection ? getFacilityAddress(selectedSection) ?? 'Ei saatavilla' : '-'}`,
                }),
                React.createElement(Text, {
                  style: styles.modalSubLine,
                  children: `Kuvaus: ${selectedSection?.description ?? 'Ei kuvausta'}`,
                }),
                React.createElement(Text, {
                  style: styles.modalSubLine,
                  children: `Facility ID: ${selectedSection?.facilityId ?? '-'}`,
                }),
                bookingError
                  ? React.createElement(Text, {
                      style: styles.bookingErrorText,
                      children: bookingError,
                    })
                  : null,
                bookingFeedback
                  ? React.createElement(Text, {
                      style: styles.bookingFeedbackText,
                      children: bookingFeedback,
                    })
                  : null,
                React.createElement(
                  View,
                  { style: styles.slotsContainer },
                  React.createElement(Text, {
                    style: styles.slotsTitle,
                    children: slotsTitle,
                  }),
                  isLoadingSlots
                    ? React.createElement(ActivityIndicator, {
                        size: 'small',
                        style: styles.slotLoader,
                      })
                    : React.createElement(
                        ScrollView,
                        {
                          style: styles.slotBookingList,
                          contentContainerStyle: styles.slotBookingListContent,
                        },
                        ...selectedSectionSlotRows
                      )
                ),
                React.createElement(Button, {
                  mode: 'text',
                  style: styles.closeBookingModalButton,
                  onPress: () => setSelectedSection(null),
                  children: 'Sulje',
                })
              ),
            }
          ),
          React.createElement(
            Dialog,
            {
              visible: !!pendingBookingSlot,
              onDismiss: () => setPendingBookingSlot(null),
              style: styles.confirmDialog,
              children: [
                React.createElement(Dialog.Title, {
                  key: 'confirm-title',
                  children: 'Vahvista varaus',
                }),
                React.createElement(
                  Dialog.Content,
                  {
                    key: 'confirm-content',
                    children: React.createElement(Text, {
                      children: `Haluatko varata vuoron ${pendingBookingSlot?.label ?? ''}?`,
                    }),
                  }
                ),
                React.createElement(
                  Dialog.Actions,
                  {
                    key: 'confirm-actions',
                    children: [
                      React.createElement(Button, {
                        key: 'confirm-cancel',
                        onPress: () => setPendingBookingSlot(null),
                        disabled: isSubmittingBooking,
                        children: 'Peruuta',
                      }),
                      React.createElement(Button, {
                        key: 'confirm-submit',
                        onPress: confirmBookSlot,
                        loading: isSubmittingBooking,
                        disabled: isSubmittingBooking,
                        children: 'Varaa',
                      }),
                    ],
                  }
                ),
              ],
            },

          )
        ),
      })
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
      paddingHorizontal: metrics.horizontalPadding,
      paddingTop: metrics.scale(16, 12, 24),
      paddingBottom: metrics.scale(20, 16, 28),
      alignItems: 'center',
    },
    topArea: {
      marginBottom: metrics.scale(12, 10, 18),
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(22, 16, 28),
      paddingHorizontal: metrics.scale(14, 10, 20),
      paddingTop: metrics.scale(10, 8, 14),
      paddingBottom: metrics.scale(14, 10, 20),
      alignItems: 'center',
    },
    headerRow: {
      width: '100%',
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
      fontSize: metrics.scale(22, 18, 28),
      lineHeight: metrics.scale(22, 18, 28),
      color: colors.onSurface,
      marginTop: -1,
    },
    headerSpacer: {
      width: metrics.scale(34, 32, 42),
      height: metrics.scale(34, 32, 42),
    },
    logo: {
      width: metrics.scale(120, 92, 140),
      height: metrics.scale(98, 74, 120),
      alignSelf: 'center',
      marginTop: metrics.scale(4, 2, 10),
    },
    title: {
      alignSelf: 'center',
      marginTop: 2,
      fontSize: metrics.scale(20, 17, 24),
      fontWeight: '700',
    },
    filtersRow: {
      marginTop: metrics.scale(18, 12, 24),
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      width: '100%',
      gap: metrics.scale(5, 4, 8),
    },
    filterChip: {
      flex: 1,
      minWidth: metrics.scale(64, 56, 88),
      minHeight: metrics.scale(34, 30, 40),
      justifyContent: 'center',
      backgroundColor: colors.surfaceVariant,
    },
    filterChipText: {
      fontSize: metrics.scale(12, 11, 15),
      fontWeight: '600',
      color: colors.onSurface,
      textAlign: 'center',
    },
    textInput: {
      marginTop: metrics.scale(10, 8, 14),
      backgroundColor: colors.surface,
    },
    sportPickerButton: {
      marginTop: metrics.scale(10, 8, 14),
      alignSelf: 'center',
      width: '100%',
      maxWidth: metrics.scale(320, 230, 380),
      minHeight: metrics.scale(50, 44, 58),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#cfd8e3',
      justifyContent: 'center',
      paddingHorizontal: metrics.scale(12, 10, 16),
      gap: 4,
    },
    sportPickerLabel: {
      color: '#0f172a',
      fontSize: metrics.scale(16, 14, 20),
      fontWeight: '700',
      textAlign: 'center',
    },
    sportPickerHint: {
      color: '#64748b',
      fontSize: metrics.scale(12, 11, 14),
      fontWeight: '500',
    },
    statusRow: {
      marginTop: metrics.scale(10, 8, 14),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusText: {
      color: '#475569',
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '600',
    },
    searchButton: {
      marginTop: metrics.scale(12, 10, 16),
      borderRadius: metrics.scale(12, 10, 16),
      alignSelf: 'center',
      width: metrics.scale(200, 168, 240),
    },
    searchButtonContent: {
      height: metrics.scale(36, 34, 42),
    },
    searchButtonLabel: {
      fontSize: metrics.scale(16, 14, 20),
      fontWeight: '700',
      textAlign: 'center',
    },
    dateButton: {
      marginTop: 0,
      alignSelf: 'auto',
      borderRadius: metrics.scale(10, 8, 14),
    },
    listSurface: {
      flex: 1,
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(22, 16, 28),
      paddingHorizontal: metrics.scale(12, 8, 18),
    },
    listContent: {
      paddingBottom: metrics.scale(12, 8, 20),
    },
    loading: {
      marginVertical: metrics.scale(14, 10, 18),
    },
    errorText: {
      color: '#b91c1c',
      fontSize: metrics.scale(13, 11, 16),
      fontWeight: '500',
      marginTop: metrics.scale(8, 6, 10),
    },
    emptyText: {
      color: colors.onSurfaceVariant,
      fontSize: metrics.scale(14, 12, 17),
      marginTop: metrics.scale(12, 8, 18),
      textAlign: 'center',
    },
    slotRow: {
      minHeight: metrics.scale(66, 52, 78),
      borderBottomWidth: 1,
      borderBottomColor: colors.outline,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: metrics.scale(6, 4, 10),
    },
    slotTextWrap: {
      paddingVertical: metrics.scale(8, 6, 12),
      flexShrink: 1,
      paddingRight: 10,
    },
    slotActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.scale(8, 6, 10),
    },
    slotTitle: {
      fontSize: metrics.scale(19, 15, 24),
      fontWeight: '500',
    },
    slotTime: {
      fontSize: metrics.scale(17, 14, 22),
      marginTop: 2,
    },
    chevron: {
      fontSize: metrics.scale(20, 16, 26),
      color: colors.outline,
      marginLeft: 8,
    },
    favoriteButton: {
      width: metrics.scale(30, 28, 34),
      height: metrics.scale(30, 28, 34),
      borderRadius: metrics.scale(15, 14, 17),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceVariant,
    },
    favoriteButtonDisabled: {
      opacity: 0.6,
    },
    favoriteButtonText: {
      fontSize: metrics.scale(18, 16, 22),
      color: colors.onSurfaceVariant,
      marginTop: -1,
    },
    favoriteButtonTextActive: {
      color: '#d97706',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: metrics.horizontalPadding,
    },
    modalDismissLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    modalPickerCard: {
      width: '100%',
      maxWidth: metrics.isTablet ? 460 : 360,
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(24, 18, 30),
      padding: metrics.scale(16, 12, 20),
      gap: metrics.scale(12, 10, 16),
    },
    modalPickerTitle: {
      color: colors.onSurface,
      fontSize: metrics.scale(18, 16, 22),
      fontWeight: '700',
    },
    modalPickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    sportPickerList: {
      maxHeight: metrics.scale(340, 280, 420),
    },
    sportPickerListContent: {
      gap: metrics.scale(8, 6, 10),
      paddingBottom: metrics.scale(4, 2, 8),
    },
    sportOption: {
      paddingHorizontal: metrics.scale(14, 12, 18),
      paddingVertical: metrics.scale(12, 10, 16),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    sportOptionActive: {
      backgroundColor: '#dbeafe',
      borderColor: '#60a5fa',
    },
    sportOptionText: {
      color: colors.onSurface,
      fontSize: metrics.scale(15, 13, 18),
      fontWeight: '600',
    },
    sportOptionTextActive: {
      color: '#1d4ed8',
      fontWeight: '700',
    },
    emptySportText: {
      color: colors.onSurfaceVariant,
      fontSize: metrics.scale(14, 12, 16),
      fontWeight: '500',
    },
    dialog: {
      backgroundColor: 'transparent',
      alignSelf: 'center',
      width: '90%',
      maxWidth: metrics.isTablet ? 520 : 380,
      borderRadius: metrics.scale(18, 14, 24),
      elevation: 0,
      marginTop: 0,
    },
    confirmDialog: {
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(14, 10, 18),
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(18, 14, 24),
      paddingHorizontal: metrics.scale(18, 14, 26),
      paddingVertical: metrics.scale(14, 12, 22),
    },
    modalTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    modalTopActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.scale(8, 6, 10),
    },
    modalHall: {
      color: colors.onSurface,
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
      maxWidth: '65%',
    },
    modalTime: {
      color: colors.onSurface,
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
    },
    modalSubLine: {
      color: colors.onSurface,
      fontSize: metrics.scale(13, 11, 16),
      fontWeight: '700',
      marginTop: 2,
    },
    bookingErrorText: {
      color: '#b91c1c',
      fontSize: metrics.scale(13, 11, 16),
      marginTop: metrics.scale(8, 6, 12),
      fontWeight: '600',
    },
    bookingFeedbackText: {
      color: '#0f766e',
      fontSize: metrics.scale(13, 11, 16),
      marginTop: metrics.scale(8, 6, 12),
      fontWeight: '600',
    },
    slotsContainer: {
      marginTop: metrics.scale(14, 10, 18),
      backgroundColor: colors.surfaceVariant,
      borderRadius: metrics.scale(12, 10, 16),
      paddingHorizontal: metrics.scale(10, 8, 14),
      paddingVertical: metrics.scale(10, 8, 14),
    },
    slotsTitle: {
      color: colors.onSurface,
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
      marginBottom: metrics.scale(8, 6, 12),
    },
    slotLoader: {
      marginVertical: metrics.scale(10, 8, 14),
    },
    slotBookingList: {
      maxHeight: metrics.scale(220, 180, 300),
    },
    slotBookingListContent: {
      gap: metrics.scale(8, 6, 10),
    },
    slotBookingRow: {
      borderRadius: metrics.scale(10, 8, 14),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outline,
      paddingHorizontal: metrics.scale(10, 8, 14),
      paddingVertical: metrics.scale(10, 8, 12),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    slotBookingRowDisabled: {
      opacity: 0.65,
    },
    slotBookingRowBooked: {
      borderColor: '#ef4444',
      backgroundColor: '#fee2e2',
    },
    slotBookingLabel: {
      color: colors.onSurface,
      fontSize: metrics.scale(13, 11, 16),
      fontWeight: '700',
    },
    slotBookingStatus: {
      color: '#047857',
      fontSize: metrics.scale(12, 10, 14),
      fontWeight: '700',
    },
    slotBookingStatusBooked: {
      color: '#991b1b',
    },
    slotBookingStatusPast: {
      color: '#ca8a04',
    },
    closeBookingModalButton: {
      marginTop: metrics.scale(10, 8, 14),
      alignSelf: 'flex-end',
    },
    mapPlaceholder: {
      marginTop: metrics.scale(10, 8, 14),
      marginBottom: metrics.scale(12, 10, 18),
      width: '100%',
      height: metrics.scale(140, 110, 180),
      borderRadius: metrics.scale(12, 10, 16),
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    mapCanvas: {
      position: 'absolute',
      width: 768,
      height: 768,
    },
    mapTile: {
      position: 'absolute',
      width: 256,
      height: 256,
    },
    mapPin: {
      fontSize: metrics.scale(14, 12, 18),
      color: colors.onSurfaceVariant,
      fontWeight: '700',
    },
    mapDot: {
      position: 'absolute',
      width: metrics.scale(14, 12, 16),
      height: metrics.scale(14, 12, 16),
      borderRadius: metrics.scale(7, 6, 8),
      backgroundColor: '#dc2626',
      borderWidth: 2,
      borderColor: '#ffffff',
      marginLeft: -7,
      marginTop: -7,
    },
  });
