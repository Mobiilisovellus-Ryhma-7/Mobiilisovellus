export const dynamicSportHallLogoLight = require('../../assets/dynamic-sport-hall-logo.png');
export const dynamicSportHallLogoDark = require('../../assets/dynamic-sport-hall-logo.png');

export function getDynamicSportHallLogoSource(isDarkMode: boolean) {
	return isDarkMode ? dynamicSportHallLogoDark : dynamicSportHallLogoLight;
}