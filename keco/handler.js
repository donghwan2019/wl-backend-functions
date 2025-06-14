import { CtprvnRltmMesureDnsty } from './getCtprvnRltmMesureDnsty.js';
import { MsrstnList } from './getMsrstnList.js';
import { MinuDustFrcstDspth } from './getMinuDustFrcstDspth.js';
import { MinuDustWeekFrcstDspth } from './getMinuDustWeekFrcstDspth.js';

/**
 * 하루에 한번 업데이트
 * @param {*} event 
 * @returns 
 */
export const msrstnList = async (event) => {
    let msrstnList = new MsrstnList();
    const { queryStringParameters } = event;
    if (queryStringParameters === undefined || queryStringParameters === null) {
        console.info('queryStringParameters is null.');
        return await msrstnList.get();
    }
    else {
        console.info(`queryStringParameters: ${JSON.stringify(queryStringParameters)}`);
        return await msrstnList.getNearStnList(queryStringParameters.lon, queryStringParameters.lat);
    }
};

/**
 * @param {*} event 
 * @returns 
 */
export const ctprvnrltmmesurednsty = async (event) => {
    let ctprvnrltmmesureddnsty = new CtprvnRltmMesureDnsty();
    const { queryStringParameters } = event;
    if (queryStringParameters === undefined || queryStringParameters === null) {
        console.info('queryStringParameters is null.');
        return await ctprvnrltmmesureddnsty.get();
    }
    else {
        console.info(`queryStringParameters: ${JSON.stringify(queryStringParameters)}`);
        return await ctprvnrltmmesureddnsty.getByStations(queryStringParameters.stnNameList);
    }
};

/**
 * @param {*} event 
 * @returns 
 */
export const minudustfrcstdspth = async (event) => {
    let minudustfrcstdspth = new MinuDustFrcstDspth();
    const { queryStringParameters } = event;
    if (queryStringParameters === undefined || queryStringParameters === null) {
        console.info('queryStringParameters is null.');
        return await minudustfrcstdspth.get();
    }
    else {
        console.info(`queryStringParameters: ${JSON.stringify(queryStringParameters)}`);
        return await minudustfrcstdspth.getByLocation(queryStringParameters.region_1depth_name, queryStringParameters.region_2depth_name);
    }
};

export const minudustweekfrcstdspth = async (event) => {
    let minudustweekfrcstdspth = new MinuDustWeekFrcstDspth();
    const { queryStringParameters } = event;
    if (queryStringParameters === undefined || queryStringParameters === null) {
        console.info('queryStringParameters is null.');
        return await minudustweekfrcstdspth.get();
    }
    else {
        console.info(`queryStringParameters: ${JSON.stringify(queryStringParameters)}`);
        return await minudustweekfrcstdspth.getByLocation(queryStringParameters.region_1depth_name, queryStringParameters.region_2depth_name);
    }
};
