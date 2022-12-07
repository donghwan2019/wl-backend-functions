
const { CtprvnRltmMesureDnsty } = require('./getCtprvnRltmMesureDnsty.js');
const { MsrstnList } = require('./getMsrstnList.js');
const { MinuDustFrcstDspth } = require('./getMinuDustFrcstDspth.js');

/**
 * 하루에 한번 업데이트
 * @param {*} event 
 * @returns 
 */
module.exports.msrstnList = async (event) => {
    let msrstnList = new MsrstnList();
    return await msrstnList.get();
};

/**
 * 20분전까지 5분간 캐시하고, 이후는 완성된 데이터로 보고 1달간 캐시 
 * @param {*} event 
 * @returns 
 */
module.exports.ctprvnrltmmesurednsty = async (event) => {
    let ctprvnrltmmesureddnsty = new CtprvnRltmMesureDnsty();
    return await ctprvnrltmmesureddnsty.get();
};

/**
 * 20분전까지 5분간 캐시하고, 이후는 완성된 데이터로 보고 1달간 캐시
 * @param {*} event 
 * @returns 
 */
module.exports.minudustfrcstdspth = async (event) => {
    let minudustfrcstdspth = new MinuDustFrcstDspth();
    return await minudustfrcstdspth.get();
};
