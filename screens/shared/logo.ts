export const dynamicSportHallLogoLight = require('../../assets/Dynamic_Sport_Hall_Logo_in_Blue_and_Orange kopio.png');
export const dynamicSportHallLogoDark = require('../../assets/Dynamic_Sport_Hall_Logo_in_Blue_and_Orange Dark.png');

export function getDynamicSportHallLogoSource(isDarkMode: boolean) {
	return isDarkMode ? dynamicSportHallLogoDark : dynamicSportHallLogoLight;
}