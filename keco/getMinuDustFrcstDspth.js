import moment from "moment-timezone";
import { Keco } from "./getKeco.js";

/**
 * 기능명 : 대기질 예보통보 조회
 * 데이터 생성 주기 : 매일 4회(5,11,17,23시), 각 시별 10분내외
 */
export class MinuDustFrcstDspth extends Keco {
  constructor() {
    super();
    this.path = "/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";
    delete this.params.base_date;
    delete this.params.base_time;

    this.data;

    this.params.searchDate = moment().tz("Asia/Seoul").format("YYYY-MM-DD");

    //it's 05, 11, 17, 23
    let now = moment().tz("Asia/Seoul");
    if (now.hour() < 5) {
      this.params.searchDate = now.subtract(1, "day").format("YYYY-MM-DD");
    }
    else {
      this.params.searchDate = now.format("YYYY-MM-DD");
    }
    if (now.hour() < 5) {
      this.params.dataTime = `${this.params.searchDate} 23`;
    }
    else if (now.hour() < 11) {
      this.params.dataTime = `${this.params.searchDate} 05`;
    }
    else if (now.hour() < 17) {
      this.params.dataTime = `${this.params.searchDate} 11`;
    }
    else if (now.hour() < 23) {
      this.params.dataTime = `${this.params.searchDate} 17`;
    }
    else {
      this.params.dataTime = `${this.params.searchDate} 23`;
    }

    this.key = `keco/${this.params.dataTime}_minuDustFrcstDspth`;
  }

  async #getKecoData() {
    return super.getKecoData();
  }

  /**
   *
   * @param {*} kecoData
   * @param {string} kecoData.header.resultCode
   * @param {number} kecoData.body.totalCount -
   * @param {object[]} kecoData.body.items -  {dataTime, informCode, informOverall, informCause, informGrade, actionKnack, imageUrl1, imageUrl2, imageUrl3, imageUrl4, imageUrl5, imageUrl6, imageUrl7, imageUrl8, imageUrl9, informData}
   * @returns
   */
  #parseKecoData(kecoData) {
    return super.parseKecoData(kecoData);
  }

  async get() {

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

    let kecoData = await this.#getKecoData();
    console.info(`get from KECO: ${this.key}`);
    if (kecoData === undefined || kecoData === null) {
      return { statusCode: 500, body: "Fail to get KECO data." };
    }

    let result = this.#parseKecoData(kecoData);
    
    await this._saveToS3(this.key, result.body);
    this.data = result.body;

    return { statusCode: 200, body: result.body };
  }

  /**
   *  서울 : 좋음, 제주 : 좋음, 전남 : 좋음, 전북 : 좋음, 광주 : 좋음, 경남 : 좋음, 
   *  경북 : 좋음, 울산 : 좋음, 대구 : 좋음, 부산 : 좋음, 충남 : 보통, 충북 : 좋음,
   *  세종 : 좋음, 대전 : 좋음, 영동 : 좋음, 영서 : 좋음, 경기남부 : 좋음, 경기북부 : 좋음,
   *  인천 : 보통
   * @param {string} reg_1depth
   * @param {string} reg_2depth
   */
  async getByLocation(reg_1depth, reg_2depth) {
    if (this.data == undefined) {
      this.data = await this._loadFromS3(this.key);
      if (this.data == undefined) {
        let kecoData = await this.#getKecoData();
        let result = this.#parseKecoData(kecoData);
        await this._saveToS3(this.key, result.body);
        console.info(`get from KECO: ${this.key}`);
        this.data = result.body;
      }
      else {
        console.info(`load from S3: ${this.key}`);
      }
    }

    console.log(`this.data: ${JSON.stringify(this.data, null, 2)}`);

    let target = this.getTargetFromLocationForFrcstDspth(reg_1depth, reg_2depth);

    /**
     * this.data
     * from
     * [
     *  {
     *    informCode: "PM10",
     *    "informData": "2024-09-18",
          "informGrade": "서울 : 나쁨,제주 : 보통,전남 : 나쁨,전북 : 나쁨,광주 : 보통,경남 : 보통,경북 : 보통,울산 : 보통,대구 : 보통,부산 : 보통,충남 : 나쁨,충북 : 보통,세종 : 보통,대전 : 보통,영동 : 보통,영서 : 보통,경기남부 : 나쁨,경기북부 : 보통,인천 : 나쁨",
          "dataTime": "2024-09-18 05시 발표",
        },
        {
        "informCode": "O3",
        "informData": "2024-09-19",
        "informGrade": "서울 : 나쁨,제주 : 보통,전남 : 나쁨,전북 : 나쁨,광주 : 보통,경남 : 보통,경북 : 보통,울산 : 보통,대구 : 보통,부산 : 보통,충남 : 나쁨,충북 : 보통,세종 : 보통,대전 : 보통,영동 : 보통,영서 : 보통,경기남부 : 나쁨,경기북부 : 보통,인천 : 나쁨",
        "dataTime": "2024-09-18 05시 발표",
        }
     * ]
     * to
     * {
     *  dataTime: "2024-05-01 00:00",
     *  location: "서울",
     *  informData: [
     *    { informDate: "2024-09-18",
     *      informData: [
     *        {informCode: "PM10", informGrade: "좋음", dataTime: "2024-09-18 05시 발표"},
     *        {informCode: "PM25", informGrade: "좋음"},
     *        {informCode: "O3", informGrade: "좋음"},
     *      ]
     *    },
     *    { informDate: "2024-09-19",
     *      informData: [
     *        {informCode: "PM10", informGrade: "좋음"},
     *        {informCode: "PM25", informGrade: "좋음"},
     *        {informCode: "O3", informGrade: "좋음"},
     *      ]
     *    }
     *  ]
     * }
     */

    let result = {
      // dataTime: this.data[0].dataTime,
      location: target,
      informData: []
    };

    let dayDataList = [];

    this.data.forEach(item => {
      let tempCodeData = dayDataList
        .find((dayItem) => dayItem.date == item.informData)
        ?.data.find((codeItem) => codeItem.code == item.informCode);
      if (tempCodeData == undefined) {
        tempCodeData = {
          code: item.informCode,
          grade: this.getGradeFromInformGradeByTarget(item.informGrade, target),
          dataTime: item.dataTime,
        };
      }
      else {
        if (tempCodeData.dataTime < item.dataTime) {
          tempCodeData.dataTime = item.dataTime;
          tempCodeData.grade = this.getGradeFromInformGradeByTarget(item.informGrade, target);
        }
        else {
          return;
        }
      }

      let tempDayDate = dayDataList.find(dayItem => dayItem.date == item.informData);
      if (tempDayDate == undefined) {
        tempDayDate = {
          date: item.informData,
          data: []
        }
        dayDataList.push(tempDayDate);
      }
      tempDayDate.data.push(tempCodeData);
    });
    result.informData = dayDataList;

    console.info(`result: ${JSON.stringify(result, null, 2)}`);
    return { statusCode: 200, body: result };
  }
}
