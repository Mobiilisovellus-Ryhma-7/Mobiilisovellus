import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { Booking, FacilitySection } from '../../services/firebase';

export type StatisticsDatum = {
	label: string;
	value: number;
};

export type StatisticsSummary = {
	currentMonthSportData: StatisticsDatum[];
	facilityData: StatisticsDatum[];
	sportData: StatisticsDatum[];
	timeData: StatisticsDatum[];
};

const MAX_ITEMS_PER_CHART = 6;

function normalizeLabel(value: string | null | undefined, fallback: string) {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function toSortedData(counter: Map<string, number>) {
	return Array.from(counter.entries())
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => {
			if (b.value === a.value) {
				return a.label.localeCompare(b.label);
			}

			return b.value - a.value;
		})
		.slice(0, MAX_ITEMS_PER_CHART);
}

function getTimeBucketLabel(slotStart: string) {
	const match = slotStart.match(/^(\d{2}):(\d{2})$/);

	if (!match) {
		return 'Yö';
	}

	const hour = Number(match[1]);
	const minute = Number(match[2]);
	const totalMinutes = hour * 60 + minute;

	if (totalMinutes >= 22 * 60 || totalMinutes < 6 * 60 + 1) {
		return 'Yö';
	}

	if (totalMinutes <= 11 * 60 + 59) {
		return 'Aamu';
	}

	if (totalMinutes <= 16 * 60 + 59) {
		return 'Päivä';
	}

	return 'Ilta';
}

function toOrderedTimeData(counter: Map<string, number>) {
	return ['Yö', 'Aamu', 'Päivä', 'Ilta'].map((label) => ({
		label,
		value: counter.get(label) ?? 0,
	}));
}

function parseBookingDate(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) {
		return null;
	}

	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}

function isInCurrentMonth(bookingDate: string, now: Date) {
	const parsedDate = parseBookingDate(bookingDate);
	if (!parsedDate) {
		return false;
	}

	return parsedDate.getFullYear() === now.getFullYear() && parsedDate.getMonth() === now.getMonth();
}

export function buildStatisticsData(
	bookings: Booking[],
	facilitySectionsById: Record<string, FacilitySection>
): StatisticsSummary {
	const now = new Date();
	const facilityCounter = new Map<string, number>();
	const sportCounter = new Map<string, number>();
	const currentMonthSportCounter = new Map<string, number>();
	const timeCounter = new Map<string, number>([
		['Yö', 0],
		['Aamu', 0],
		['Päivä', 0],
		['Ilta', 0],
	]);

	bookings.forEach((booking) => {
		const section = facilitySectionsById[booking.facilitySectionId];
		const facilityLabel = normalizeLabel(
			section?.facilityName ?? section?.description,
			'Tuntematon halli'
		);
		const sportLabel = normalizeLabel(section?.sport, 'Tuntematon laji');

		facilityCounter.set(facilityLabel, (facilityCounter.get(facilityLabel) ?? 0) + 1);
		sportCounter.set(sportLabel, (sportCounter.get(sportLabel) ?? 0) + 1);
		if (isInCurrentMonth(booking.bookingDate, now)) {
			currentMonthSportCounter.set(
				sportLabel,
				(currentMonthSportCounter.get(sportLabel) ?? 0) + 1
			);
		}
		const timeLabel = getTimeBucketLabel(booking.slotStart);
		timeCounter.set(timeLabel, (timeCounter.get(timeLabel) ?? 0) + 1);
	});

	return {
		currentMonthSportData: toSortedData(currentMonthSportCounter),
		facilityData: toSortedData(facilityCounter),
		sportData: toSortedData(sportCounter),
		timeData: toOrderedTimeData(timeCounter),
	};
}

export function buildCurrentMonthSportData(
	bookings: Booking[],
	facilitySectionsById: Record<string, FacilitySection>
) {
	const now = new Date();
	const currentMonthSportCounter = new Map<string, number>();

	bookings.forEach((booking) => {
		const section = facilitySectionsById[booking.facilitySectionId];
		const sportLabel = normalizeLabel(section?.sport, 'Tuntematon laji');

		if (isInCurrentMonth(booking.bookingDate, now)) {
			currentMonthSportCounter.set(
				sportLabel,
				(currentMonthSportCounter.get(sportLabel) ?? 0) + 1
			);
		}
	});

	return toSortedData(currentMonthSportCounter);
}

export type StatisticsChartsProps = {
	currentMonthAllUsersSportData: StatisticsDatum[];
	facilityData: StatisticsDatum[];
	sportData: StatisticsDatum[];
	timeData: StatisticsDatum[];
};

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function createChartHtml(
	currentMonthAllUsersSportData: StatisticsDatum[],
	facilityData: StatisticsDatum[],
	sportData: StatisticsDatum[],
	timeData: StatisticsDatum[],
	backgroundColor: string,
	textColor: string,
	accentColor: string,
	secondaryColor: string
) {
	const facilityJson = JSON.stringify(
		facilityData.map((item) => ({
			name: item.label,
			count: item.value,
		}))
	);
	const currentMonthAllUsersSportJson = JSON.stringify(
		currentMonthAllUsersSportData.map((item) => ({
			name: item.label,
			count: item.value,
		}))
	);
	const sportJson = JSON.stringify(
		sportData.map((item) => ({
			name: item.label,
			count: item.value,
		}))
	);
	const timeJson = JSON.stringify(
		timeData.map((item) => ({
			name: item.label,
			count: item.value,
		}))
	);

	return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
	* { box-sizing: border-box; }
	body {
		margin: 0;
		padding: 6px;
		background: ${backgroundColor};
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}
	.chart-wrap {
		border-radius: 12px;
		padding: 7px;
		margin-bottom: 6px;
		background: rgba(127, 127, 127, 0.12);
	}
	.chart-title {
		margin: 0 0 10px;
		font-size: 14px;
		font-weight: 700;
		color: ${textColor};
	}
	canvas {
		display: block;
		width: 100%;
		height: 150px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.2);
	}
</style>
</head>
<body>
	<div class="chart-wrap">
		<h3 class="chart-title">Tämän kuun suosituimmat lajit</h3>
		<canvas id="currentMonthSportChart" width="900" height="220"></canvas>
	</div>
	<div class="chart-wrap">
		<h3 class="chart-title">Omat varaukset halleittain</h3>
		<canvas id="facilityChart" width="900" height="220"></canvas>
	</div>
	<div class="chart-wrap">
		<h3 class="chart-title">Pelaamasi lajit</h3>
		<canvas id="sportChart" width="900" height="220"></canvas>
	</div>
	<div class="chart-wrap">
		<h3 class="chart-title">Omat treeniajat</h3>
		<canvas id="timeChart" width="900" height="220"></canvas>
	</div>

	<script>
		const currentMonthAllUsersSportData = ${currentMonthAllUsersSportJson};
		const facilityData = ${facilityJson};
		const sportData = ${sportJson};
		const timeData = ${timeJson};

		function makeHighRes(canvas) {
			const dpr = window.devicePixelRatio || 1;
			const cssWidth = canvas.clientWidth || canvas.width;
			const cssHeight = canvas.clientHeight || canvas.height;
			canvas.width = Math.round(cssWidth * dpr);
			canvas.height = Math.round(cssHeight * dpr);
			const ctx = canvas.getContext('2d');
			ctx.scale(dpr, dpr);
			return { ctx, width: cssWidth, height: cssHeight };
		}

		function drawBarChart(canvasId, data) {
			const canvas = document.getElementById(canvasId);
			if (!canvas) return;
			const out = makeHighRes(canvas);
			const ctx = out.ctx;
			const width = out.width;
			const height = out.height;

			if (!width || !height) {
				return;
			}

			ctx.clearRect(0, 0, width, height);
			const left = 48;
			const right = width - 14;
			const top = 16;
			const bottom = height - 34;

			ctx.strokeStyle = '#8a8a8a';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(left, top);
			ctx.lineTo(left, bottom);
			ctx.lineTo(right, bottom);
			ctx.stroke();

			if (!data.length) {
				ctx.fillStyle = '#7a7a7a';
				ctx.font = '13px sans-serif';
				ctx.fillText('Ei dataa', left + 8, top + 18);
				return;
			}

			const maxValue = Math.max.apply(null, data.map((d) => d.count));
			const safeMax = Math.max(maxValue, 1);
			const gap = (right - left) / (data.length * 2);

			ctx.font = '11px sans-serif';
			ctx.textAlign = 'center';
			for (let i = 0; i < data.length; i += 1) {
				const item = data[i];
				const x = left + (1 + i * 2) * gap;
				const h = ((bottom - top) * item.count) / safeMax;
				const y = bottom - h;

				ctx.fillStyle = '${accentColor}';
				ctx.fillRect(x - gap / 2, y, gap, h);

				ctx.fillStyle = '${textColor}';
				ctx.fillText(String(item.count), x, y - 6);
				const shortLabel = item.name.length > 12 ? item.name.slice(0, 12) + '...' : item.name;
				ctx.fillText(shortLabel, x, bottom + 14);
			}
		}

		function drawSportChart(canvasId, data) {
			drawBarChart(canvasId, data);
		}

		function randomColor(index) {
			const colors = ['${secondaryColor}', '${accentColor}', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
			return colors[index % colors.length];
		}

		function drawPieChart(canvasId, data) {
			const canvas = document.getElementById(canvasId);
			if (!canvas) return;
			const out = makeHighRes(canvas);
			const ctx = out.ctx;
			const width = out.width;
			const height = out.height;

			if (!width || !height) {
				return;
			}
			ctx.clearRect(0, 0, width, height);

			if (!data.length) {
				ctx.fillStyle = '#7a7a7a';
				ctx.font = '13px sans-serif';
				ctx.fillText('Ei dataa', 16, 22);
				return;
			}

			const total = data.reduce((sum, item) => sum + item.count, 0);
			const centerX = Math.round(width * 0.28);
			const centerY = Math.round(height * 0.5);
			const radius = Math.min(width * 0.2, height * 0.34);

			let startAngle = -Math.PI / 2;
			for (let i = 0; i < data.length; i += 1) {
				const item = data[i];
				const ratio = item.count / total;
				const endAngle = startAngle + ratio * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(centerX, centerY);
				ctx.arc(centerX, centerY, radius, startAngle, endAngle);
				ctx.closePath();
				ctx.fillStyle = randomColor(i);
				ctx.fill();
				startAngle = endAngle;
			}

			ctx.fillStyle = '${textColor}';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'left';
			for (let i = 0; i < data.length; i += 1) {
				const item = data[i];
				const y = 30 + i * 24;
				ctx.fillStyle = randomColor(i);
				ctx.beginPath();
				ctx.arc(width * 0.55, y - 4, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '${textColor}';
				const percentage = total === 0 ? 0 : Math.round((item.count / total) * 100);
				ctx.fillText(item.name + ' (' + percentage + '%)', width * 0.57, y);
			}
		}

		function drawTimeChart(canvasId, data) {
			const canvas = document.getElementById(canvasId);
			if (!canvas) return;
			const out = makeHighRes(canvas);
			const ctx = out.ctx;
			const width = out.width;
			const height = out.height;

			if (!width || !height) {
				return;
			}

			ctx.clearRect(0, 0, width, height);

			const total = data.reduce((sum, item) => sum + item.count, 0);
			if (total <= 0) {
				ctx.fillStyle = '#7a7a7a';
				ctx.font = '13px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('Ei dataa', width / 2, height / 2);
				return;
			}

			const centerX = Math.round(width * 0.28);
			const centerY = Math.round(height * 0.5);
			const radius = Math.min(width * 0.22, height * 0.34);
			const innerRadius = radius * 0.58;

			let startAngle = -Math.PI / 2;
			data.forEach((item, index) => {
				const ratio = item.count / total;
				const endAngle = startAngle + ratio * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(centerX, centerY);
				ctx.arc(centerX, centerY, radius, startAngle, endAngle);
				ctx.closePath();
				ctx.fillStyle = randomColor(index);
				ctx.fill();
				startAngle = endAngle;
			});

			ctx.beginPath();
			ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
			ctx.fillStyle = '${backgroundColor}';
			ctx.fill();

			ctx.textAlign = 'left';
			ctx.font = '700 12px sans-serif';
			data.forEach((item, index) => {
				const y = 34 + index * 34;
				ctx.fillStyle = randomColor(index);
				ctx.beginPath();
				ctx.arc(width * 0.56, y - 4, 6, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '${textColor}';
				ctx.fillText(item.name, width * 0.58, y);
			});
		}

		function drawAll() {
			try {
				drawSportChart('currentMonthSportChart', currentMonthAllUsersSportData);
				drawTimeChart('timeChart', timeData);
				drawBarChart('facilityChart', facilityData);
				drawPieChart('sportChart', sportData);
			} catch (error) {
				const body = document.body;
				if (body && !document.getElementById('chartErrorText')) {
					const p = document.createElement('p');
					p.id = 'chartErrorText';
					p.style.color = '#b91c1c';
					p.style.font = '600 12px sans-serif';
					p.textContent = 'Tilastografiikan piirto epaonnistui.';
					body.appendChild(p);
				}
			}
		}

		window.addEventListener('load', () => {
			drawAll();
			setTimeout(drawAll, 50);
			setTimeout(drawAll, 200);
		});

		window.addEventListener('resize', drawAll);
	</script>
</body>
</html>
	`;
}

export function StatisticsCharts({
	currentMonthAllUsersSportData,
	facilityData,
	sportData,
	timeData,
}: StatisticsChartsProps) {
	const { colors } = useTheme();
	const html = React.useMemo(
		() =>
			createChartHtml(
				currentMonthAllUsersSportData,
				facilityData,
				sportData,
				timeData,
				escapeHtml(colors.surface),
				escapeHtml(colors.onSurface),
				escapeHtml(colors.primary),
				escapeHtml(colors.tertiary ?? colors.secondary)
			),
		[
			colors.onSurface,
			colors.primary,
			colors.secondary,
			colors.surface,
			colors.tertiary,
			facilityData,
			currentMonthAllUsersSportData,
			sportData,
			timeData,
		]
	);

	return React.createElement(
		View,
		{ style: styles.container },
		React.createElement(WebView, {
			originWhitelist: ['*'],
			source: { html },
			javaScriptEnabled: true,
			domStorageEnabled: true,
			scrollEnabled: false,
			nestedScrollEnabled: false,
			showsVerticalScrollIndicator: false,
			style: styles.webView,
		})
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	webView: {
		width: '100%',
		height: 820,
		minHeight: 820,
		backgroundColor: 'transparent',
	},
});
