export const dynamicSportHallLogoLight = require('../../Documents/Dynamic_Sport_Hall_Logo_in_Blue_and_Orange kopio.png');
export const dynamicSportHallLogoDark = require('../../Documents/Dynamic_Sport_Hall_Logo_in_Blue_and_Orange Dark.png');

export function getDynamicSportHallLogoSource(isDarkMode: boolean) {
	return isDarkMode ? dynamicSportHallLogoDark : dynamicSportHallLogoLight;
}