import { VilageFcst } from './getVilageFcst.js';
import { UltraSrtFcst } from './getUltraSrtFcst.js';
import { UltraSrtNcst } from './getUltraSrtNcst.js';
import { MidFcst } from './getMidFcst.js';
import { MidLandFcst } from './getMidLandFcst.js';
import { MidTa } from './getMidTa.js';
import { MidSeaFcst } from './getMidSeaFcst.js';
import { AsosDalyInfoService } from './AsosDalyInfoService.js';

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

/**
 * ASOS 지점 일자료 조회 서비스 핸들러
 * 
 * @param {object} event - Lambda 이벤트 객체
 * @param {object} event.queryStringParameters - 쿼리 스트링 파라미터
 * @param {string} [event.queryStringParameters.startDt] - 조회 시작 날짜 (YYYYMMDD)
 * @param {string} [event.queryStringParameters.endDt] - 조회 종료 날짜 (YYYYMMDD)
 * @param {string} [event.queryStringParameters.stnIds] - 지점번호 (복수 시 콤마 구분)
 * @returns {Promise<Object>} ASOS 일자료 API 응답
 */
export const asosdaly = async (event) => {
    let asosDalyInfoService = new AsosDalyInfoService();
    return await asosDalyInfoService.get(event);
}
