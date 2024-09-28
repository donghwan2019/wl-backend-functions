const { KmaScraper } = require("./kma-web-scraper");

// import KmaScraper from './kma-web-scraper.js';

/**
 * 
 * @param {*} event 
 * @returns 
 */
module.exports.asosminweather = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getASOS();
};

module.exports.cityweather = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getCityWeather();
};
