const { VilageFcst } = require('./getVilageFcst.js');
const { UltraSrtFcst } = require('./getUltraSrtFcst.js');
const { UltraSrtNcst } = require('./getUltraSrtNcst.js');

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
