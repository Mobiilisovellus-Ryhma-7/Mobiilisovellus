import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'booking-reminders';

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

function parseLocalDateTime(dateKey: string, timeKey: string) {
	const dateMatch = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const timeMatch = timeKey.match(/^(\d{2}):(\d{2})$/);

	if (!dateMatch || !timeMatch) {
		return null;
	}

	const year = Number(dateMatch[1]);
	const month = Number(dateMatch[2]) - 1;
	const day = Number(dateMatch[3]);
	const hour = Number(timeMatch[1]);
	const minute = Number(timeMatch[2]);

	return new Date(year, month, day, hour, minute, 0, 0);
}

export async function initializeNotifications() {
	const { status } = await Notifications.getPermissionsAsync();
	if (status !== 'granted') {
		const requested = await Notifications.requestPermissionsAsync();
		if (requested.status !== 'granted') {
			return false;
		}
	}

	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
			name: 'Booking reminders',
			importance: Notifications.AndroidImportance.HIGH,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#FF231F7C',
		});
	}

	return true;
}

export async function scheduleBookingReminder(input: {
	facilityName: string;
	bookingDate: string;
	slotStart: string;
	minutesBefore?: number;
}) {
	const ready = await initializeNotifications();
	if (!ready) {
		return null;
	}

	const minutesBefore = input.minutesBefore ?? 15;
	const startDate = parseLocalDateTime(input.bookingDate, input.slotStart);
	if (!startDate) {
		return null;
	}

	const reminderDate = new Date(startDate.getTime() - minutesBefore * 60_000);
	if (reminderDate.getTime() <= Date.now()) {
		return null;
	}

	return Notifications.scheduleNotificationAsync({
		content: {
			title: 'Kohta liikutaan!',
			body: `${input.facilityName}: vuoro alkaa klo ${input.slotStart}.`,
			sound: true,
		},
		trigger:
			Platform.OS === 'android'
				? {
						type: Notifications.SchedulableTriggerInputTypes.DATE,
						date: reminderDate,
						channelId: ANDROID_CHANNEL_ID,
					}
				: {
						type: Notifications.SchedulableTriggerInputTypes.DATE,
						date: reminderDate,
					},
	});
}

