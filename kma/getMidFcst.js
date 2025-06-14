
import moment from "moment-timezone";
import { MidFcstInfoService } from "./MidFcstInfoService.js";

/**
 * 중기전망조회
 * -일 2회(06:00,18:00)회 생성 되며 발표시각을 입력
 */
export class MidFcst extends MidFcstInfoService {

  stnIdList = [
    { stnId: '108', stnName: '전국' },
    { stnId: '105', stnName: '강원도' },
    { stnId: '109', stnName: '서울,인천,경기도' },
    { stnId: '131', stnName: '충청북도' },
    { stnId: '133', stnName: '대전,세종,충청남도' },
    { stnId: '146', stnName: '전라북도' },
    { stnId: '156', stnName: '광주,전라남도' },
    { stnId: '143', stnName: '대구,경상북도' },
    { stnId: '159', stnName: '부산,울산,경상남도' },
    { stnId: '184', stnName: '제주도' },
  ];

  constructor() {
    super();
    this.path = "/getMidFcst";
    this.params.stnId = '108'; // 전국
    this.key = `kma/${this.params.tmFc}_${this.params.stnId}_midFcst`;
    this.data;
  }

  /**
   * 
   * @param {*} kmaData 
   * @param {string} kmaData.header.resultCode
   * @param {string} kmaData.header.resultMsg
   * @param {number} kmaData.body.totalCount
   * @param {string} kmaData.body.wfSv
   */
  #parseKmaData(kmaData) {
    let { statusCode, body } = super.parseKmaData(kmaData);
    if (statusCode !== 200) {
      return { statusCode: statusCode, body: body };
    }
    // console.log(body);

    let result = [{
      stnId: this.params.stnId,
      fcstDate : moment(this.params.tmFc, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
      tmFc: this.params.tmFc,
      wfSv: body.item[0].wfSv,
    }];
    // console.log(result);
    return { statusCode: 200, body: result };
  }

  async get(event) {
    try {
      this.parseEvent(event);
    }
    catch (error) {
      return { statusCode: 400, body: error.message };
    }
    if (this.data) {
      console.info(`load from memory: ${this.key}`);
      return { statusCode: 200, body: this.data };
    }
    else {
      this.data = await this._loadFromS3(this.key);
      if (this.data) {
        console.info(`load from S3: ${this.key}`);
        return { statusCode: 200, body: this.data };
      }
    }
    const kmaData = await this.getKmaData();
    if (kmaData == undefined || kmaData == null) {
      return { statusCode: 500, body: 'Fail to get KMA MidFcstInfoService data.' };
    }
    let result = this.#parseKmaData(kmaData);
    console.info(`get from KMA: ${this.key}`);

    await this._saveToS3(this.key, result.body);
    this.data = result.body;
    return result;
  }

  /**
   * check if the stnName is in the stnIdList
   * @param {string} stnName 
   * @returns {string}
   */
  getStnId(stnName) {
    // Remove '특별시', '광역시' from the stnName if present
    const simplifiedStnName = stnName.replace(/(특별시|광역시|특별자치도|특별자치시)/, '').trim();
    
    return this.stnIdList.find(stn => 
      stn.stnName.includes(simplifiedStnName)
    )?.stnId;
  }
}
