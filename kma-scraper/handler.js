import { KmaScraper } from "./kma-web-scraper.js";

/**
 * 
 * @returns 
 */
export const asosmin = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getASOS(event.queryStringParameters);
};

export const cityweather = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getCityWeather(event.queryStringParameters);
};

export const nearStnList = async (event) => {
    let kmaScraper = new KmaScraper();
    return await kmaScraper.getNearStnList(event.queryStringParameters);
};
