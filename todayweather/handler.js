const { TodayWeather } = require('./getTodayWeather.js');

/**
 * Handler for today's weather
 * @param {*} event 
 * @returns 
 */
module.exports.todayweather = async (event) => {
    let todayWeather = new TodayWeather();
    return await todayWeather.get(event);
};
