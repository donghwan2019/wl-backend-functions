
import moment from "moment-timezone";
import { MidFcstInfoService } from "./MidFcstInfoService";

import regCodeList from '../data/MidFcstInfoService_regCode.csv';

/**
 * 중기기온조회
 * regId 예보구역 코드 별첨 엑셀파일 참조
 */
export class MidTa extends MidFcstInfoService {

  constructor() {
    super();
    this.path = '/getMidTa';
    this.params.regId = '11B10101'; // 서울

    //load data/MidFcstInfoService_regCode.csv
    this.regCodeList = [];
    for (const regCode of regCodeList) {
      this.regCodeList.push({ regName: regCode['구역'], regId: regCode['예보구역코드'] });
    }
    // console.info(this.regCodeList);
  }

  #transformData(source, baseDate) {
    const result = [];
    for (let day = 3; day <= 10; day++) {
      const fcstDate = moment(baseDate).add(day, 'days');
      const fcstDateStr = fcstDate.tz('Asia/Seoul').format('YYYYMMDD');
      const dayData = {
        fcstDate: fcstDate.toDate(),
        fcstDateStr: fcstDateStr,
      };

      dayData.taMin = source[`taMin${day}`];
      dayData.taMinLow = source[`taMin${day}Low`];
      dayData.taMinHigh = source[`taMin${day}High`];
      dayData.taMax = source[`taMax${day}`];
      dayData.taMaxLow = source[`taMax${day}Low`];
      dayData.taMaxHigh = source[`taMax${day}High`];
    
      result.push(dayData);
    }
    return result;
  }

  #parseKmaData(kmaData) {
    let { statusCode, body } = super.parseKmaData(kmaData);
    if (statusCode !== 200) {
      return { statusCode: statusCode, body: body };
    }

    // console.info(body);
    let item = kmaData.body.items.item[0];
    delete item.regId;

    let result = {
      regId: this.params.regId,
      baseDate : moment(this.params.tmFc, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
      tmFc: this.params.tmFc,
    };

    let baseDate = moment(this.params.tmFc, 'YYYYMMDD', "Asia/Seoul").toDate();
    let data = this.#transformData(item, baseDate);
    result.data = data;

    // console.info(result);
    return { statusCode: 200, body: result };
  }

  async get(event) {
    try {
      this.parseEvent(event);
    }
    catch (error) {
      return { statusCode: 400, body: error.message };
    }

    const kmaData = await this.getKmaData();
    if (kmaData == undefined || kmaData == null) {
      return { statusCode: 500, body: 'Fail to get KMA data.' };
    }

    let result = this.#parseKmaData(kmaData);
    return result;
  } 

  getRegId(reg_1depth, reg_2depth) {
    let regId = this.regCodeList.find(reg => 
      reg_2depth.includes(reg.regName)
    );
    if (regId == undefined) {
      regId = this.regCodeList.find(reg => 
        reg_1depth.includes(reg.regName)
      );
    }
    return regId ? regId.regId : null;
  }
}