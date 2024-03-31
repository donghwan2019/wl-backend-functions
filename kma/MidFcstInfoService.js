/**
 * 
 */

import moment from "moment-timezone";
import { Kma } from "./getKma";

/**
 * 기상청 중기예보 조회 서비스
 * getMidFcst, getMidLandFcst, getMidTa, getMidSeaFcst
 */
export class MidFcstInfoService extends Kma {

  releaseTimeList = [6, 18];

  constructor() {
    super();
    this.domain = 'http://apis.data.go.kr/1360000/MidFcstInfoService';
    this.path = "";

    this.params = {
      serviceKey: process.env.DATA_GO_KR_SERVICE_KEY,
      pageNo: 1,
      numOfRows: 9999,
      dataType: 'json',
    };

    let now = moment().tz('Asia/Seoul');
    let hour = now.hour();
    if (hour < 6) {
      now.subtract(1, 'days');
      this.params.tmFc = now.format('YYYYMMDD') + '1800';
    }
    else if (hour >= 18) {
      this.params.tmFc = now.format('YYYYMMDD') + '1800';
    }
    else {
      this.params.tmFc = now.format('YYYYMMDD') + '0600';
    }
  }

  parseEvent(event) {
    const { queryStringParameters } = event;
    if (queryStringParameters === undefined || queryStringParameters === null) {
      console.info('queryStringParameters is null.');
    }
    else {
      const { stnId, regId, tmFc } = queryStringParameters;
      if (stnId !== undefined)
        this.params.stnId = stnId;
      if (regId !== undefined)
        this.params.regId = regId;
      if (tmFc !== undefined)
        this.params.tmFc = tmFc;
    }
  }
}