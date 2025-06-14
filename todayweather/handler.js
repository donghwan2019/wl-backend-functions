import { TodayWeather } from './getTodayWeather.js';

/**
 * Handler for today's weather
 * @param {*} event 
 * @returns 
 */
export const todayweather = async (event) => {
    let todayWeather = new TodayWeather();
    return await todayWeather.get(event);
};
