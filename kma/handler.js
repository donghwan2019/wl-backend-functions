const { VilageFcst } = require('./getVilageFcst');
const { UltraSrtFcst } = require('./getUltraSrtFcst');
const { UltraSrtNcst } = require('./getUltraSrtNcst');
const { MidFcst } = require('./getMidFcst');
const { MidLandFcst } = require('./getMidLandFcst');
const { MidTa } = require('./getMidTa');
const { MidSeaFcst } = require('./getMidSeaFcst');
/**
 * 
 * @param {object} event 
 * @returns 
 */
module.exports.vilagefcst = async (event) => {
    let vilageFcst = new VilageFcst();
    return await vilageFcst.get(event);
}

/**
 * 
 * @param {object} event 
 * @returns 
 */
module.exports.ultrasrtfcst = async (event) => {
    let ultraSrtFcst = new UltraSrtFcst();
    return await ultraSrtFcst.get(event);
}

/**
 * @param {object} event
 * @returns
 */
module.exports.ultrasrtncst = async (event) => {
    let ultraSrtNcst = new UltraSrtNcst();
    return await ultraSrtNcst.get(event);
}

module.exports.midfcst = async (event) => {
    let midFcst = new MidFcst();
    return await midFcst.get(event);
}

module.exports.midlandfcst = async (event) => {
    let midLandFcst = new MidLandFcst();
    return await midLandFcst.get(event);
}

module.exports.midta = async (event) => {
    let midTa = new MidTa();
    return await midTa.get(event);
}

module.exports.midseafcst = async (event) => {
    let midSeaFcst = new MidSeaFcst();
    return await midSeaFcst.get(event);
}
