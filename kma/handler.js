import { VilageFcst } from './getVilageFcst.js';
import { UltraSrtFcst } from './getUltraSrtFcst.js';
import { UltraSrtNcst } from './getUltraSrtNcst.js';
import { MidFcst } from './getMidFcst.js';
import { MidLandFcst } from './getMidLandFcst.js';
import { MidTa } from './getMidTa.js';
import { MidSeaFcst } from './getMidSeaFcst.js';

/**
 * 
 * @param {object} event 
 * @returns 
 */
export const vilagefcst = async (event) => {
    let vilageFcst = new VilageFcst();
    return await vilageFcst.get(event);
}

/**
 * 
 * @param {object} event 
 * @returns 
 */
export const ultrasrtfcst = async (event) => {
    let ultraSrtFcst = new UltraSrtFcst();
    return await ultraSrtFcst.get(event);
}

/**
 * @param {object} event
 * @returns
 */
export const ultrasrtncst = async (event) => {
    let ultraSrtNcst = new UltraSrtNcst();
    return await ultraSrtNcst.get(event);
}

export const midfcst = async (event) => {
    let midFcst = new MidFcst();
    return await midFcst.get(event);
}

export const midlandfcst = async (event) => {
    let midLandFcst = new MidLandFcst();
    return await midLandFcst.get(event);
}

export const midta = async (event) => {
    let midTa = new MidTa();
    return await midTa.get(event);
}

export const midseafcst = async (event) => {
    let midSeaFcst = new MidSeaFcst();
    return await midSeaFcst.get(event);
}
