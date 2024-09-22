
const { CtprvnRltmMesureDnsty } = require('./getCtprvnRltmMesureDnsty.js');
const { MsrstnList } = require('./getMsrstnList.js');
const { MinuDustFrcstDspth } = require('./getMinuDustFrcstDspth.js');
const { MinuDustWeekFrcstDspth } = require('./getMinuDustWeekFrcstDspth.js');

/**
 * 하루에 한번 업데이트
 * @param {*} event 
 * @returns 
 */
module.exports.msrstnList = async (event) => {
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
module.exports.ctprvnrltmmesurednsty = async (event) => {
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
module.exports.minudustfrcstdspth = async (event) => {
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

module.exports.minudustweekfrcstdspth = async (event) => {
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
