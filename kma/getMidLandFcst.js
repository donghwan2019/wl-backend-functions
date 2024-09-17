
import moment from 'moment-timezone';
import { MidFcstInfoService } from "./MidFcstInfoService";

/**
 * 중기육상예보조회 
 * - 맑음
 * - 구름많음, 구름많고 비, 구름많고 눈, 구름많고 비/눈, 구름많고 소나기
 * - 흐림, 흐리고 비, 흐리고 눈, 흐리고 비/눈, 흐리고 소나기
 */
export class MidLandFcst extends MidFcstInfoService {
  regIdList = [
    { regId: '11B00000', regName: '서울,인천,경기도' },
    { regId: '11D10000', regName: '강원도영서' },
    { regId: '11D20000', regName: '강원도영동' },
    { regId: '11C10000', regName: '충청북도' },
    { regId: '11C20000', regName: '대전,세종,충청남도' },
    { regId: '11F10000', regName: '전라북도' },
    { regId: '11F20000', regName: '광주,전라남도' },
    { regId: '11H10000', regName: '대구,경상북도' },
    { regId: '11H20000', regName: '부산,울산,경상남도' },
    { regId: '11G00000', regName: '제주도' },
  ];

  gangwonYeonSeo = [ "춘천", "원주", "철원", "화천", "양구", "인제", "홍천", "횡성", "평창", "영월", "정선" ];

  gangwonYeongDong = [ "강릉", "속초", "동해", "삼척", "태백", "고성", "양양"];

  
  constructor() {
    super();
    this.path = '/getMidLandFcst'; 
    this.params.regId = '11B00000'; //서울,인천,경기도
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

      if (source[`rnSt${day}Am`] !== undefined) {
        dayData.rnStAm = source[`rnSt${day}Am`];
        dayData.rnStPm = source[`rnSt${day}Pm`];
        dayData.wfAm = source[`wfAm${day}`];
        dayData.wfPm = source[`wfPm${day}`];
      }
      else {
        dayData.rnStAm = source[`rnSt${day}`];
        dayData.rnStPm = source[`rnSt${day}`];
        dayData.wfAm = source[`wf${day}`];
        dayData.wfPm = source[`wf${day}`];
      }
      result.push(dayData);
    }
    return result;
  }

  #parseKmaData(kmaData) {
    let { statusCode, body } = super.parseKmaData(kmaData);
    if (statusCode !== 200) {
      return { statusCode: statusCode, body: body };
    }

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
      return { statusCode: 500, body: 'Fail to get KMA MidLandFcstInfoService data.' };
    }
    let result = this.#parseKmaData(kmaData);
    return result;
  }

  getRegId(reg_1depth, reg_2depth) {
    // Remove '특별시', '광역시', '특별자치도', '특별자치시' from the regName if present
    const simplifiedRegName = reg_1depth.replace(/(특별시|광역시|특별자치도|특별자치시)/, '').trim();
    
    let regId = this.regIdList.find(reg => 
      reg.regName.includes(simplifiedRegName)
    );

    if (regId === '11D10000' || regId === '11D20000') {

      const reg_2depth_simple = reg_2depth.slice(0, 2);
      if (this.gangwonYeonSeo.includes(reg_2depth_simple)) {
        regId = '11D10000';
      }
      else if (this.gangwonYeongDong.includes(reg_2depth_simple)) {
        regId = '11D20000';
      }
    }

    return regId ? regId.regId : null;
  }
}