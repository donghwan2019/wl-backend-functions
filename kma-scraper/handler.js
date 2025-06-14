import { KmaScraper } from "./kma-web-scraper.js";

/**
 * 
 * @param {*} event 
 * @returns 
 */
export const asosminweather = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getASOS();
};

export const cityweather = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getCityWeather();
};

export const nearStnList = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getNearStnList();
};
