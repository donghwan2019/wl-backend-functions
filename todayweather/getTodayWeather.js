import { VilageFcst } from "../kma/getVilageFcst.js";
import { UltraSrtNcst } from "../kma/getUltraSrtNcst.js";
import { UltraSrtFcst } from "../kma/getUltraSrtFcst.js";
import { MidFcst } from "../kma/getMidFcst.js";
import { MidLandFcst } from "../kma/getMidLandFcst.js";
import { MidTa } from "../kma/getMidTa.js";
import { AsosDalyInfoService } from "../kma/AsosDalyInfoService.js";

import { KmaScraper } from "../kma-scraper/kma-web-scraper.js";

import { KakaoApi } from "../geo/getKakaoApi.js";

import { CurrentDataGenerator } from "./currentDataGenerator.js";

import { MsrstnList } from "../keco/getMsrstnList.js";
import { CtprvnRltmMesureDnsty } from "../keco/getCtprvnRltmMesureDnsty.js";
import { MinuDustFrcstDspth } from "../keco/getMinuDustFrcstDspth.js";
import { MinuDustWeekFrcstDspth } from "../keco/getMinuDustWeekFrcstDspth.js";

import moment, { min } from "moment-timezone";

/**
 * 통합 날씨 서비스 클래스
 * KMA 기상청 API, KECO 대기환경 API, 웹스크래핑을 통합하여 포괄적인 날씨 정보 제공
 * 
 * 주요 기능:
 * - 현재 날씨 및 초단기 예보 (1-6시간)
 * - 단기 예보 (3일)  
 * - 중기 예보 (7-10일)
 * - 대기질 정보 및 미세먼지 예보
 * - 기상 관측소 데이터 (ASOS)
 * - 도시별 실시간 날씨
 */
export class TodayWeather {
  constructor() {
    this.vilageFcst = new VilageFcst();
    this.ultraSrtNcst = new UltraSrtNcst();
    this.ultraSrtFcst = new UltraSrtFcst();
    this.midFcst = new MidFcst();
    this.midLandFcst = new MidLandFcst();
    this.midTa = new MidTa();
    this.asosDalyInfoService = new AsosDalyInfoService();
    this.ctpvrvnRltm = new CtprvnRltmMesureDnsty();
    this.msrStnList = new MsrstnList();
    this.minuDustFrcstDspth = new MinuDustFrcstDspth();
    this.minuDustWeekFrcstDspth = new MinuDustWeekFrcstDspth();
    this.kmaScraper = new KmaScraper();
    this.kmaScraperForYesterday = new KmaScraper();
    this.currentDataGenerator = new CurrentDataGenerator();
    this.params = {};
  }

  /**
   * 통합 날씨 정보 조회 메인 메서드
   * KMA, KECO, 웹스크래핑 등 다양한 데이터 소스를 통합하여 날씨 정보를 제공
   *
   * @param {object} event - Lambda 이벤트 객체
   * @param {object} event.queryStringParameters - 쿼리 파라미터
   * @param {string} [event.queryStringParameters.lat] - 위도 (WGS84 좌표계)
   * @param {string} [event.queryStringParameters.lon] - 경도 (WGS84 좌표계)
   * @param {string} [event.queryStringParameters.address] - 주소 (lat/lon 대신 사용 가능)
   * @returns {Promise<object>} 통합 날씨 정보 응답 객체
   */
  async get(event) {
    await this.#_parseEvent(event);

    try {
      //todo: midLandFcst, midTa 모두 regIdForTa 값으로 받아오고 있음. 오류 확인 필요
      let now = moment().tz("Asia/Seoul");
      let dateTime = now.format("YYYYMMDDHHmm");
      this.params.datetime = dateTime;
      console.log(`get dateTime: ${dateTime}`);

      let [
        vilageFcstData,
        ultraSrtNcstData,
        ultraSrtFcstData,
        midFcstData,
        midLandFcstData,
        midTaData,
        ctprvnRltmData,
        minuDustFrcstDspthData,
        minuDustWeekFrcstDspthData,
        nearStnList,
        cityWeatherData,
        asosData,
        // yesterdayCityWeatherData,
      ] = await Promise.all([
        this.vilageFcst.get({ queryStringParameters: this.params }),
        this.ultraSrtNcst.get({ queryStringParameters: this.params }),
        this.ultraSrtFcst.get({ queryStringParameters: this.params }),
        this.midFcst.get({ queryStringParameters: this.params }),
        this.midLandFcst.get({ queryStringParameters: this.params }),
        this.midTa.get({ queryStringParameters: this.params }),
        this.ctpvrvnRltm.getByStations(this.params.stationList),
        this.minuDustFrcstDspth.getByLocation(
          this.params.region_1depth_name,
          this.params.region_2depth_name
        ),
        this.minuDustWeekFrcstDspth.getByLocation(
          this.params.region_1depth_name,
          this.params.region_2depth_name
        ),
        this.kmaScraper.getNearStnList(this.params),
        this.kmaScraper.getCityWeather(this.params),
        this.kmaScraper.getASOS(this.params),
        // this.kmaScraperForYesterday.getCityWeather({
        //   datetime: moment(dateTime, "YYYYMMDDHHmm", "Asia/Seoul")
        //     .tz("Asia/Seoul")
        //     .subtract(1, "days")
        //     .format("YYYYMMDDHHmm"),
        // }),
      ]);

      //get 3days cityWeather for making short
      let threeDaysCityWeatherData = [];
      const currentHour = now.hour();
      console.log(`now: ${now}, currentHour: ${currentHour}`);

      // Create array of promises for fetching 3 days of historical cityweather data (every hour)
      let cityWeatherPromises = [];
      for (let day = 0; day <= 3; day++) {
        for (let hour = 0; hour < 24; hour++) {
          if (day === 0 && hour > currentHour) continue;
          const targetDateTime = now
            .clone()
            .subtract(day, "days")
            .hour(hour)
            .minute(0)
            .format("YYYYMMDDHHmm");

          cityWeatherPromises.push(
            new KmaScraper().getCityWeather({
              datetime: targetDateTime,
            })
          );
        }
      }

      // Execute all cityweather requests in parallel
      try {
        const cityWeatherResults = await Promise.allSettled(
          cityWeatherPromises
        );

        // console.log(`cityWeatherResults.length : ${cityWeatherResults.length}`);
        // console.log(`cityWeatherResults[0].status: ${cityWeatherResults[0].status}`);
        // console.log(`cityWeatherResults[0].value.statusCode: ${cityWeatherResults[0].value.statusCode}`);
        // console.log(`cityWeatherResults[0].value.body.length: ${cityWeatherResults[0].value.body.length}`);

        // Process successful results and filter out failures
        threeDaysCityWeatherData = cityWeatherResults
          .filter(
            (result) =>
              result.status === "fulfilled" && result.value.statusCode === 200
          )
          .map((result) => result.value)
          .flat(); // Flatten array since each response contains an array

        console.log(
          `Retrieved ${threeDaysCityWeatherData.length} historical cityweather records`
        );
        console.log(
          `Count of ${threeDaysCityWeatherData[0].body.length} in first historical cityweather records`
        );
        console.log(
          `threeDaysCityWeatherData[0].body[0]: ${JSON.stringify(
            threeDaysCityWeatherData[0].body[0],
            null,
            2
          )}`
        );
      } catch (error) {
        console.error("Error fetching 3-day cityweather data:", error);
        threeDaysCityWeatherData = [];
      }

      let yesterdayDateTime = now 
        .subtract(1, "days")
        .format("YYYY.MM.DD.HH:00");
      console.log(`yesterdayDateTime: ${yesterdayDateTime}`);

      let yesterdayCityWeatherData = threeDaysCityWeatherData.filter(
        (item) => item.body[0].pubDate === yesterdayDateTime
      );

      console.log(
        `yesterdayCityWeatherData count: ${yesterdayCityWeatherData.length}`
      );
      // if (yesterdayCityWeatherData.length > 0) {
      //   console.log(`yesterdayCityWeatherData sample: ${JSON.stringify(yesterdayCityWeatherData[0], null, 2)}`);
      // }

      //get 7days ASOS daily data for historical analysis
      let sevenDaysAsosData = [];
      try {
        // Calculate date range: 7 days ago to yesterday
        const endDate = now.subtract(1, "days");
        const startDate = endDate.clone().subtract(6, "days");

        console.log(
          `Fetching 7-day ASOS data from ${startDate.format(
            "YYYYMMDD"
          )} to ${endDate.format("YYYYMMDD")}`
        );

        // Get nearest weather station ID for ASOS data
        // console.log(`nearStnList: ${JSON.stringify(nearStnList)}`);

        const nearestStnId =
          nearStnList.length > 0 ? nearStnList[0].stnId : "0"; // Default to Seoul station

        console.log(`7days asos nearestStnId: ${nearestStnId}`);

        const asosResult = await this.asosDalyInfoService.getByDateRange(
          startDate.format("YYYYMMDD"),
          endDate.format("YYYYMMDD"),
          nearestStnId
        );

        if (asosResult.statusCode === 200) {
          sevenDaysAsosData = asosResult.body;
          console.log(
            `Retrieved ${sevenDaysAsosData.length} days of ASOS data`
          );
        } else {
          console.warn("Failed to fetch ASOS daily data:", asosResult.body);
        }
      } catch (error) {
        console.error("Error fetching 7-day ASOS data:", error);
      }

      // console.log(
      //   `cityWeatherData.body[0]: ${JSON.stringify(cityWeatherData.body[0], null, 2)}`
      // );
      // console.log(`asosData.body[0]: ${JSON.stringify(asosData.body[0], null, 2)}`);

      // console.log(`ultraSrtNcstData before: ${JSON.stringify(ultraSrtNcstData, null, 2)}`);
      ultraSrtNcstData.body = this.#_extractUltraSrtNcstData(
        ultraSrtNcstData.body
      );
      // console.log(`ultraSrtNcstData after: ${JSON.stringify(ultraSrtNcstData, null, 2)}`);

      // console.log(
      //   `ultraSrtFcstData before: ${JSON.stringify(ultraSrtFcstData, null, 2)}`
      // );
      ultraSrtFcstData.body = this.#_extractUltraSrtFcstData(
        ultraSrtFcstData.body
      );
      // console.log(
      //   `ultraSrtFcstData.body.items[0] after: ${JSON.stringify(ultraSrtFcstData.body.items[0], null, 2)}`
      // );

      vilageFcstData.body = this.#_extractVilageFcstData(vilageFcstData.body);
      // console.log(`vilageFcstData.body.items[0] after: ${JSON.stringify(vilageFcstData.body.items[0], null, 2)}`);

      let result = this.#_combineData(
        dateTime, 
        vilageFcstData,
        ultraSrtNcstData,
        ultraSrtFcstData,
        midFcstData,
        midLandFcstData,
        midTaData,
        ctprvnRltmData,
        minuDustFrcstDspthData,
        minuDustWeekFrcstDspthData,
        nearStnList,
        cityWeatherData,
        asosData,
        yesterdayCityWeatherData,
        threeDaysCityWeatherData,
        sevenDaysAsosData
      );
      // console.log(`ultraSrtNcst: ${JSON.stringify(result.ultraSrtNcst, null, 2)}`);
      // console.log(`ultraSrtFcst.items[0]: ${JSON.stringify(result.ultraSrtFcst.items[0], null, 2)}`);
      // console.log(`vilageFcst.items[0]: ${JSON.stringify(result.vilageFcst.items[0], null, 2)}`);
      // console.log(`vilageFcst.items[1]: ${JSON.stringify(result.vilageFcst.items[1], null, 2)}`);
      // console.log(`cityWeatherData: ${JSON.stringify(result.cityWeatherData, null, 2)}`);
      // console.log(`asosData: ${JSON.stringify(result.asosData, null, 2)}`);
      // console.log(`yesterdayCityWeatherData: ${JSON.stringify(result.yesterdayCityWeatherData, null, 2)}`);
      console.log(
        `threeDaysCityWeatherData count: ${result.threeDaysCityWeatherData.length}`
      );
      // if (result.threeDaysCityWeatherData.length > 0) {
      //   console.log(`threeDaysCityWeatherData sample: ${JSON.stringify(result.threeDaysCityWeatherData[0], null, 2)}`);
      // }
      console.log(
        `sevenDaysAsosData count: ${result.sevenDaysAsosData.length}`
      );
      // if (result.sevenDaysAsosData.length > 0) {
      //   console.log(`sevenDaysAsosData sample: ${JSON.stringify(result.sevenDaysAsosData[0], null, 2)}`);
      // }

      // console.log("Raw data before conversion:", JSON.stringify(result, null, 2));
      result = this.#_convertToOldType(result);
      // console.log("Converted result:", JSON.stringify(result, null, 2));
      // return { statusCode: 200, body: JSON.stringify(result) };
      return { statusCode: 200, body: null };
    } catch (error) {
      console.error(error);
      return { statusCode: 500, body: "Failed to fetch weather data" };
    }
  }

  /**
   * T1H	기온	℃
   * RN1	1시간 강수량	mm - 1mm 미만, 실수값+mm, 30.0~50.0mm, 50.0mm 이상, 강수없음
   * UUU	동서바람성분	m/s
   * VVV	남북바람성분	m/s
   * REH	습도	%
   * PTY	강수형태	코드값
   * VEC	풍향	deg
   * WSD	풍속	m/s
   * @param {*} ultraSrtNcstData
   * @returns
   */
  #_extractUltraSrtNcstData(ultraSrtNcstData) {
    // ultraSrtNcstData is an array, get the first element
    const data = ultraSrtNcstData[0];

    let result = {
      baseDateTime: data.baseDate,
      baseDateTimeStr: data.baseDateTimeStr,
      nx: data.nx,
      ny: data.ny,
    };

    result.t1h = data.items.find(
      (item) => item.data[0].category === "T1H"
    )?.data[0].value;
    result.rn1 = data.items.find(
      (item) => item.data[0].category === "RN1"
    )?.data[0].value;
    result.uuu = data.items.find(
      (item) => item.data[0].category === "UUU"
    )?.data[0].value;
    result.vvv = data.items.find(
      (item) => item.data[0].category === "VVV"
    )?.data[0].value;
    result.reh = data.items.find(
      (item) => item.data[0].category === "REH"
    )?.data[0].value;
    result.pty = data.items.find(
      (item) => item.data[0].category === "PTY"
    )?.data[0].value;
    result.vec = data.items.find(
      (item) => item.data[0].category === "VEC"
    )?.data[0].value;
    result.wsd = data.items.find(
      (item) => item.data[0].category === "WSD"
    )?.data[0].value;

    return result;
  }

  /**
   * T1H: 기온	℃
   * RN1: 1시간 강수량	범주 (1 mm)	 - 1mm 미만, 실수값+mm, 30.0~50.0mm, 50.0mm 이상, 강수없음
   * SKY: 하늘상태	코드값	- 맑음(1) 구름조금(2) 구름많음(3) 흐림(4)
   * UUU: 동서바람성분	m/s
   * VVV: 남북바람성분	m/s
   * REH: 습도	%
   * PTY: 강수형태	코드값	 - 없음(0), 비(1), 비/눈(2), 눈(3), 빗방울(5), 빗방울눈날림(6), 눈날림(7)
   * LGT: 낙뢰	kA(킬로암페어)
   * VEC: 풍향	deg
   * WSD: 풍속	m/s
   * @param {*} ultraSrtFcstData
   */
  #_extractUltraSrtFcstData(ultraSrtFcstData) {
    // ultraSrtFcstData is an array, get the first element
    const data = ultraSrtFcstData[0];

    let result = {
      baseDateTime: data.baseDate,
      nx: data.nx,
      ny: data.ny,
      items: [],
    };

    let dataItems = [];
    for (let item of data.items) {
      let dataItem = dataItems.find(
        (data) =>
          item.fcstDateStr === data.fcstDateStr &&
          item.fcstTimeStr === data.fcstTimeStr
      );
      if (dataItem === undefined) {
        dataItem = {
          fcstDateStr: item.fcstDateStr,
          fcstTimeStr: item.fcstTimeStr,
        };
        dataItems.push(dataItem);
      }

      if (item.data[0].category === "T1H") {
        dataItem.t1h = item.data[0].value;
      } else if (item.data[0].category === "RN1") {
        dataItem.rn1 = item.data[0].value;
      } else if (item.data[0].category === "SKY") {
        dataItem.sky = item.data[0].value;
      } else if (item.data[0].category === "UUU") {
        dataItem.uuu = item.data[0].value;
      } else if (item.data[0].category === "VVV") {
        dataItem.vvv = item.data[0].value;
      } else if (item.data[0].category === "REH") {
        dataItem.reh = item.data[0].value;
      } else if (item.data[0].category === "PTY") {
        dataItem.pty = item.data[0].value;
      } else if (item.data[0].category === "LGT") {
        dataItem.lgt = item.data[0].value;
      } else if (item.data[0].category === "VEC") {
        dataItem.vec = item.data[0].value;
      } else if (item.data[0].category === "WSD") {
        dataItem.wsd = item.data[0].value;
      }
    }
    result.items = dataItems;
    return result;
  }

  /**
   * Extract and organize vilage forecast data
   * POP: 강수확률 %
   * PTY: 강수형태 코드값 - 없음(0), 비(1), 비/눈(2), 눈(3), 빗방울(5), 빗방울눈날림(6), 눈날림(7)
   * PCP: 강수량 mm
   * REH: 습도 %
   * SNO: 적설 cm
   * SKY: 하늘상태 코드값 - 맑음(1) 구름조금(2) 구름많음(3) 흐림(4)
   * TMP: 기온 ℃
   * TMN: 일 최저기온 ℃
   * TMX: 일 최고기온 ℃
   * UUU: 동서바람성분 m/s
   * VVV: 남북바람성분 m/s
   * WAV: 파고 m
   * VEC: 풍향 deg
   * WSD: 풍속 m/s
   * @param {*} vilageFcstData
   * @returns
   */
  #_extractVilageFcstData(vilageFcstData) {
    // vilageFcstData is an array, get the first element
    const data = vilageFcstData[0];

    let result = {
      baseDateTime: data.baseDate,
      nx: data.nx,
      ny: data.ny,
      items: [],
    };

    let dataItems = [];
    for (let item of data.items) {
      let dataItem = dataItems.find(
        (data) =>
          item.fcstDateStr === data.fcstDateStr &&
          item.fcstTimeStr === data.fcstTimeStr
      );
      if (dataItem === undefined) {
        dataItem = {
          fcstDateStr: item.fcstDateStr,
          fcstTimeStr: item.fcstTimeStr,
        };
        dataItems.push(dataItem);
      }

      if (item.data[0].category === "POP") {
        dataItem.pop = item.data[0].value;
      } else if (item.data[0].category === "PTY") {
        dataItem.pty = item.data[0].value;
      } else if (item.data[0].category === "PCP") {
        dataItem.pcp = item.data[0].value;
      } else if (item.data[0].category === "REH") {
        dataItem.reh = item.data[0].value;
      } else if (item.data[0].category === "SNO") {
        dataItem.sno = item.data[0].value;
      } else if (item.data[0].category === "SKY") {
        dataItem.sky = item.data[0].value;
      } else if (item.data[0].category === "TMP") {
        dataItem.tmp = item.data[0].value;
      } else if (item.data[0].category === "TMN") {
        dataItem.tmn = item.data[0].value;
      } else if (item.data[0].category === "TMX") {
        dataItem.tmx = item.data[0].value;
      } else if (item.data[0].category === "UUU") {
        dataItem.uuu = item.data[0].value;
      } else if (item.data[0].category === "VVV") {
        dataItem.vvv = item.data[0].value;
      } else if (item.data[0].category === "WAV") {
        dataItem.wav = item.data[0].value;
      } else if (item.data[0].category === "VEC") {
        dataItem.vec = item.data[0].value;
      } else if (item.data[0].category === "WSD") {
        dataItem.wsd = item.data[0].value;
      } else {
        console.warn(`unknown category: ${item.data[0].category}`);
      }
    }
    result.items = dataItems;
    return result;
  }

  /**
   * WGS84 좌표계를 KMA 격자 좌표계(nx, ny)로 변환
   * 기상청 API에서 사용하는 Lambert Conformal Conic 투영법 기반 격자 좌표 변환
   *
   * @param {number} lat - 위도 (WGS84)
   * @param {number} lon - 경도 (WGS84)
   * @returns {object} 격자 좌표 {nx, ny}
   * @private
   */
  #_convertToNxNy(lat, lon) {
    // Constants for the conversion (these are specific to the Korean coordinate system)
    const RE = 6371.00877; // Earth radius in km
    const GRID = 5.0; // Grid interval in km
    const SLAT1 = 30.0; // Standard latitude 1
    const SLAT2 = 60.0; // Standard latitude 2
    const OLON = 126.0; // Origin longitude
    const OLAT = 38.0; // Origin latitude
    const XO = 43; // X-axis origin point
    const YO = 136; // Y-axis origin point

    // Conversion logic
    const DEGRAD = Math.PI / 180.0;
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn =
      Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
      Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    let nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    let ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

    return { nx, ny };
  }

  /**
   * 이벤트 파라미터 파싱 및 검증
   * 위경도 좌표를 KMA 격자 좌표(nx, ny)로 변환하고 지역 정보를 조회
   *
   * @param {object} event - Lambda 이벤트 객체
   * @param {object} event.queryStringParameters - 쿼리 파라미터
   * @param {string} [event.queryStringParameters.lat] - 위도 (WGS84 좌표계, 예: "37.5665")
   * @param {string} [event.queryStringParameters.lon] - 경도 (WGS84 좌표계, 예: "126.9780")
   * @param {string} [event.queryStringParameters.address] - 한국 주소 (예: "서울특별시 중구")
   * @throws {Error} lat/lon 또는 address 중 하나는 필수
   * @private
   */
  async #_parseEvent(event) {
    if (event.queryStringParameters) {
      this.params = { ...event.queryStringParameters };
    }
    //make base_date and base_time
    // let now = moment().tz("Asia/Seoul");
    // this.params.base_date = now.format("YYYYMMDD");
    // this.params.base_time = now.format("HHmm");

    let { nx, ny } = this.#_convertToNxNy(this.params.lat, this.params.lon);

    let regionList;

    if (this.params.lat && this.params.lon) {
      //get info from lat and lon
      const kakaoApi = new KakaoApi();
      const data = await kakaoApi.byGeoCoord(this.params.lat, this.params.lon);
      console.log("byGeoCoord :", data);
      regionList = data;
    } else if (this.params.address) {
      //get info from address
      const kakaoApi = new KakaoApi();
      const temp = await kakaoApi.byAddress(this.params.address);
      this.params.lon = temp[0].x;
      this.params.lat = temp[0].y;
      const data = await kakaoApi.byGeoCoord(this.params.lat, this.params.lon);
      console.log("byGeoCoord :", data);
      regionList = data;
    } else {
      throw new Error(`Invalid parameters: ${JSON.stringify(this.params)}`);
    }

    //stnId, regId, address
    let stnId;
    for (let region of regionList) {
      stnId = this.midFcst.getStnId(region.region_1depth_name);
      if (stnId) break;
    }
    if (!stnId) {
      throw new Error(
        `Could not find stnId for regions: ${regionList
          .map((r) => r.region_1depth_name)
          .join(", ")}`
      );
    }
    this.params.stnId = stnId;

    let regId;
    for (let region of regionList) {
      regId = this.midLandFcst.getRegId(
        region.region_1depth_name,
        region.region_2depth_name
      );
      if (regId) break;
    }
    if (!regId) {
      throw new Error(
        `Could not find regId for regions: ${regionList
          .map((r) => r.region_1depth_name)
          .join(", ")}`
      );
    }
    this.params.regId = regId;

    let regIdForTa;
    for (let region of regionList) {
      regIdForTa = this.midTa.getRegId(
        region.region_1depth_name,
        region.region_2depth_name
      );
      if (regIdForTa) break;
    }
    if (!regIdForTa) {
      throw new Error(
        `Could not find regId for regions: ${regionList
          .map((r) => r.region_1depth_name)
          .join(", ")}`
      );
    }
    this.params.regIdForTa = regIdForTa;

    let stationList = await this.msrStnList.getNearStnList(
      this.params.lon,
      this.params.lat
    );

    this.params.nx = nx;
    this.params.ny = ny;
    this.params.region_1depth_name = regionList[0].region_1depth_name;
    this.params.region_2depth_name = regionList[0].region_2depth_name;
    this.params.stationList = stationList.map((item) => item.stationName);

    console.log(`this.params: ${JSON.stringify(this.params, null, 2)}`);
  }

  /**
   * 다양한 데이터 소스의 날씨 정보를 하나의 통합 객체로 결합
   *
   * @param {object} vilageFcstData - 동네예보 (3일 예보)
   * @param {object} ultraSrtNcstData - 초단기실황 (현재 날씨)
   * @param {object} ultraSrtFcstData - 초단기예보 (1-6시간)
   * @param {object} midFcstData - 중기예보 (7-10일)
   * @param {object} midLandFcstData - 중기육상예보 (날씨 상태)
   * @param {object} midTaData - 중기기온예보 (최고/최저 기온)
   * @param {object} ctprvnRltmData - 시도별 실시간 대기질
   * @param {object} minuDustFrcstDspthData - 미세먼지 예보
   * @param {object} minuDustWeekFrcstDspthData - 주간 미세먼지 예보
   * @param {Array} nearStnList - 인근 기상 관측소 목록
   * @param {object} cityWeatherData - 도시별 실시간 날씨
   * @param {object} asosData - ASOS 관측 데이터
   * @param {Array} yesterdayCityWeatherData - 전일 도시 날씨 데이터
   * @param {Array} threeDaysCityWeatherData - 3일간 도시 날씨 이력
   * @param {Array} sevenDaysAsosData - 7일간 ASOS 일별 데이터
   * @returns {object} 통합된 날씨 데이터 객체
   * @private
   */
  #_combineData(
    dateTime,
    vilageFcstData,
    ultraSrtNcstData,
    ultraSrtFcstData,
    midFcstData,
    midLandFcstData,
    midTaData,
    ctprvnRltmData,
    minuDustFrcstDspthData,
    minuDustWeekFrcstDspthData,
    nearStnList,
    cityWeatherData,
    asosData,
    yesterdayCityWeatherData,
    threeDaysCityWeatherData,
    sevenDaysAsosData
  ) {
    let now = moment(dateTime, "YYYYMMDDHHmm", "Asia/Seoul");

    console.log(`near stn list length: ${nearStnList.length}`);

    //only stnId of cityWeatherData is in nearStnList
    console.log(`cityWeatherData length: ${cityWeatherData.body.length}`);

    let filteredCityWeatherData = cityWeatherData.body.filter((item) =>
      nearStnList.some((stn) => stn.stnId === item.stnId)
    );

    console.log(`asosData length: ${asosData.body.length}`);

    let filteredAsosData = asosData.body.filter((item) =>
      nearStnList.some((stn) => stn.stnId === item.stnId)
    );

    console.log(
      `yesterdayCityWeatherData length: ${yesterdayCityWeatherData.length}`
    );

    let filteredYesterdayCityWeatherData = yesterdayCityWeatherData.filter(
      (item) => nearStnList.some((stn) => stn.stnId === item.stnId)
    );

    console.log(
      `threeDaysCityWeatherData length: ${threeDaysCityWeatherData.length}`
    );

    // Filter 3-day cityweather data to only include stations from nearStnList
    // let filteredThreeDaysCityWeatherData = threeDaysCityWeatherData.filter(
    //   (item) => nearStnList.some((stn) => stn.stnId === item.stnId)
    // );
    let filteredThreeDaysCityWeatherData = [];
    for (let items of threeDaysCityWeatherData) {
      for (let item of items.body) {
        if (nearStnList.some((stn) => stn.stnId === item.stnId)) {
          filteredThreeDaysCityWeatherData.push(item);
        }
      }
    }

    let result = {
      baseDateTime: now.format("YYYY-MM-DD HH:mm:ss"),
      nx: this.params.nx,
      ny: this.params.ny,
      vilageFcst: vilageFcstData.body,
      ultraSrtNcst: ultraSrtNcstData.body,
      ultraSrtFcst: ultraSrtFcstData.body,
      midFcst: midFcstData.body,
      midLandFcst: midLandFcstData.body,
      midTa: midTaData.body,
      ctprvnRltmData: ctprvnRltmData.body,
      minuDustFrcstDspth: minuDustFrcstDspthData.body,
      minuDustWeekFrcstDspth: minuDustWeekFrcstDspthData.body,
      nearStnList: nearStnList,
      cityWeatherData: filteredCityWeatherData,
      asosData: filteredAsosData,
      yesterdayCityWeatherData: filteredYesterdayCityWeatherData,
      threeDaysCityWeatherData: filteredThreeDaysCityWeatherData,
      sevenDaysAsosData: sevenDaysAsosData,
    };
    return result;
  }

  /**
   * convert to old type format that is defined in data/todayweather-sample.json
   * @param {object} data
   * @returns
   */
  #_convertToOldType(data) {
    let result = {
      regionName: this.params.region_1depth_name,
      cityName: this.params.region_2depth_name,
      townName: "",
      // currentPubDate:
      //   data.ultraSrtNcst?.response?.header?.resultMsg ||
      //   moment().tz("Asia/Seoul").format("YYYYMMDDHHmm"),
      // current: this.currentDataGenerator.convertCurrentData(
      //   data.cityWeatherData,
      //   data.asosData,
      //   data.ultraSrtNcst,
      //   data.ultraSrtFcst.items,
      //   data.vilageFcst.items,
      //   data.yesterdayCityWeatherData
      // ),
      // shortPubDate:
      //   data.vilageFcst?.response?.header?.resultMsg ||
      //   moment().tz("Asia/Seoul").format("YYYYMMDDHHmm"),
      // shortRssPubDate:
      //   data.vilageFcst?.response?.header?.resultMsg ||
      //   moment().tz("Asia/Seoul").format("YYYYMMDDHHmm"),
      short: this.#_convertShortForecastData(
        data.baseDateTime,
        data.vilageFcst,
        data.ultraSrtNcst,
        data.ultraSrtFcst,
        data.threeDaysCityWeatherData
      ),
      // midData: {
      //   forecast: this.#_convertMidForecastData(data.midFcst),
      //   dailyData: this.#_convertMidDailyData(data.midLandFcst, data.midTa, data.baseDateTime),
      //   landPubDate: data.midLandFcst?.response?.header?.resultMsg || "",
      //   tempPubDate: data.midTa?.response?.header?.resultMsg || "",
      //   rssPubDate: data.midFcst?.response?.header?.resultMsg || "",
      //   province: this.params.region_1depth_name,
      //   city: this.params.region_2depth_name,
      //   stnId: this.params.stnId,
      //   regId: this.params.regId,
      // },
      // airInfo: this.#_convertAirInfo(
      //   data.ctprvnRltmData,
      //   data.minuDustFrcstDspth,
      //   data.minuDustWeekFrcstDspth
      // ),
      // source: "KMA",
      // units: {
      //   temperatureUnit: "C",
      //   windSpeedUnit: "m/s",
      //   pressureUnit: "hPa",
      //   distanceUnit: "km",
      //   precipitationUnit: "mm",
      //   airUnit: "airkorea",
      // },
      // location: {
      //   lat: parseFloat(this.params.lat),
      //   long: parseFloat(this.params.lon),
      // },
    };
    return result;
  }

  /**
   * 동네예보 데이터를 단기예보 형식으로 변환
   * vilageFcst의 items 배열을 처리하여 date/time 필드를 추가하고 표준화된 형식으로 변환
   *
   * @param {string} dateTime - 발표 시각 (YYYY-MM-DD HH:mm:ss)
   * @param {object} vilageFcst - 동네예보 데이터, +1일, +2일, +3일 (per hour), +4일 +5일 (per 3 hours)
   * @param {Array} vilageFcst.items - 예보 항목 배열
   * @param {string} vilageFcst.items[].fcstDateStr - 예보 날짜 (YYYYMMDD)
   * @param {string} vilageFcst.items[].fcstTimeStr - 예보 시간 (HHMM)
   * @param {number} vilageFcst.items[].tmp - 기온 (℃)
   * @param {number} vilageFcst.items[].uuu - 동서바람성분 (m/s)
   * @param {number} vilageFcst.items[].vvv - 남북바람성분 (m/s)
   * @param {number} vilageFcst.items[].vec - 풍향 (deg)
   * @param {number} vilageFcst.items[].wsd - 풍속 (m/s)
   * @param {number} vilageFcst.items[].sky - 하늘상태 (1:맑음, 2:구름조금, 3:구름많음, 4:흐림)
   * @param {number} vilageFcst.items[].pty - 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
   * @param {number} vilageFcst.items[].pop - 강수확률 (%)
   * @param {number} vilageFcst.items[].wav - 파고 (m)
   * @param {string} vilageFcst.items[].pcp - 강수량 (mm)
   * @param {number} vilageFcst.items[].reh - 습도 (%)
   * @param {string} vilageFcst.items[].sno - 적설량 (cm)
   * @param {number} [vilageFcst.items[].tmn] - 일 최저기온 (℃)
   * @param {number} [vilageFcst.items[].tmx] - 일 최고기온 (℃)
   *
   * @param {object} ultraSrtFcst - 초단기예보 데이터
   * @param {object} ultraSrtFcst.baseDateTime - 발표 시각
   * @param {number} ultraSrtFcst.nx - 격자 X좌표
   * @param {number} ultraSrtFcst.ny - 격자 Y좌표
   * @param {Array} ultraSrtFcst.items - 초단기예보 항목 배열
   * @param {string} ultraSrtFcst.items[].fcstDateStr - 예보 날짜 (YYYYMMDD)
   * @param {string} ultraSrtFcst.items[].fcstTimeStr - 예보 시간 (HHMM)
   * @param {number} ultraSrtFcst.items[].lgt - 낙뢰 (kA)
   * @param {number} ultraSrtFcst.items[].pty - 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
   * @param {string} ultraSrtFcst.items[].rn1 - 1시간 강수량 (mm)
   * @param {number} ultraSrtFcst.items[].sky - 하늘상태 (1:맑음, 2:구름조금, 3:구름많음, 4:흐림)
   * @param {number} ultraSrtFcst.items[].t1h - 기온 (℃)
   * @param {number} ultraSrtFcst.items[].reh - 습도 (%)
   * @param {number} ultraSrtFcst.items[].uuu - 동서바람성분 (m/s)
   * @param {number} ultraSrtFcst.items[].vvv - 남북바람성분 (m/s)
   * @param {number} ultraSrtFcst.items[].vec - 풍향 (deg)
   * @param {number} ultraSrtFcst.items[].wsd - 풍속 (m/s)
   *
   * @param {object} ultraSrtNcst - 초단기실황 데이터 (현재 미사용)
   * @param {string} ultraSrtNcst.baseDateTime - 발표 시각
   * @param {string} ultraSrtNcst.baseDateTimeStr - 발표 시각 문자열 (YYYYMMDDHHmm)
   * @param {number} ultraSrtNcst.nx - 격자 X좌표
   * @param {number} ultraSrtNcst.ny - 격자 Y좌표
   * @param {number} ultraSrtNcst.t1h - 기온 (℃)
   * @param {string} ultraSrtNcst.rn1 - 1시간 강수량 (mm)
   * @param {number} ultraSrtNcst.uuu - 동서바람성분 (m/s)
   * @param {number} ultraSrtNcst.vvv - 남북바람성분 (m/s)
   * @param {number} ultraSrtNcst.reh - 습도 (%)
   * @param {number} ultraSrtNcst.pty - 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
   * @param {number} ultraSrtNcst.vec - 풍향 (deg)
   * @param {number} ultraSrtNcst.wsd - 풍속 (m/s)
   *
   * @param {Array} threeDaysCityWeatherData - 3일간 도시날씨 데이터 (현재 미사용)
   * @param {string} threeDaysCityWeatherData[].stnId - 관측소 ID
   * @param {string} threeDaysCityWeatherData[].stnName - 관측소명
   * @param {string} threeDaysCityWeatherData[].weather - 날씨상태
   * @param {number} threeDaysCityWeatherData[].visibility - 가시거리 (km)
   * @param {number} threeDaysCityWeatherData[].cloud - 구름 정도 (0-10)
   * @param {number} threeDaysCityWeatherData[].heavyCloud - 흐림 정도 (0-10)
   * @param {number} threeDaysCityWeatherData[].t1h - 기온 (℃)
   * @param {number} threeDaysCityWeatherData[].dpt - 이슬점 (℃)
   * @param {number} [threeDaysCityWeatherData[].sensoryTem] - 체감온도 (℃)
   * @param {number} [threeDaysCityWeatherData[].dspls] - 불쾌지수
   * @param {number} [threeDaysCityWeatherData[].r1d] - 일강수량 (mm)
   * @param {number} [threeDaysCityWeatherData[].s1d] - 일적설량 (cm)
   * @param {number} threeDaysCityWeatherData[].reh - 습도 (%)
   * @param {number} threeDaysCityWeatherData[].wdd - 풍향 (16방위)
   * @param {number} threeDaysCityWeatherData[].wsd - 풍속 (m/s)
   * @param {string} threeDaysCityWeatherData[].hPa - 현지기압 (hPa)
   * @param {string} threeDaysCityWeatherData[].pubDate - 발표 일시 (YYYY.MM.DD.HH:mm)
   * @param {string} threeDaysCityWeatherData[].date - 발표 일시 (YYYY-MM-DDTHH:mm:ss.SSSZ)
   *
   * @returns {Array} shortData - 변환된 단기예보 데이터 배열
   * @returns {string} shortData[].date - 예보 날짜 (YYYYMMDD)
   * @returns {number} shortData[].time - 예보 시간 (HH)
   * @returns {number} shortData[].pop - 강수확률 (%)
   * @returns {number} shortData[].pty - 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
   * @returns {number} shortData[].r06 - 6시간 강수량 (mm)
   * @returns {number} shortData[].reh - 습도 (%)
   * @returns {number} shortData[].s06 - 6시간 적설량 (cm)
   * @returns {number} shortData[].sky - 하늘상태 (1:맑음, 2:구름조금, 3:구름많음, 4:흐림)
   * @returns {number} shortData[].t3h - 기온 (℃)
   * @returns {number} shortData[].tmn - 일 최저기온 (℃)
   * @returns {number} shortData[].tmx - 일 최고기온 (℃)
   * @returns {number} shortData[].uuu - 동서바람성분 (m/s)
   * @returns {number} shortData[].vvv - 남북바람성분 (m/s)
   * @returns {number} shortData[].wav - 파고 (m)
   * @returns {number} shortData[].vec - 풍향 (deg)
   * @returns {number} shortData[].wsd - 풍속 (m/s)
   * @returns {number} shortData[].rn1 - 1시간 강수량 (mm)
   * @returns {number} shortData[].lgt - 낙뢰 (kA)
   * @returns {number} shortData[].sensorytem - 체감온도 (℃)
   * @returns {number} shortData[].dspls - 불쾌지수
   * @returns {number} shortData[].dsplsGrade - 불쾌지수 등급
   * @returns {string} shortData[].dsplsStr - 불쾌지수 등급 문자열
   * @returns {number} shortData[].decpsn - 대기오염지수
   * @returns {number} shortData[].decpsnGrade - 대기오염지수 등급
   * @returns {string} shortData[].decpsnStr - 대기오염지수 등급 문자열
   * @returns {number} shortData[].heatIndex - 열지수
   * @returns {number} shortData[].heatIndexGrade - 열지수 등급
   * @returns {string} shortData[].heatIndexStr - 열지수 등급 문자열
   * @returns {number} shortData[].frostGrade - 냉해지수 등급
   * @returns {string} shortData[].frostStr - 냉해지수 등급 문자열
   * @returns {boolean} shortData[].night - 밤 여부
   * @returns {string} shortData[].skyIcon - 하늘상태 아이콘
   * @returns {string} shortData[].dateObj - 예보 날짜 객체 (YYYY.MM.DD HH:mm)
   * @returns {number} shortData[].fromToday - 오늘부터 며칠 후 (0:오늘, 1:내일, -1:어제)
   * @returns {number} shortData[].wsdGrade - 풍속 등급
   * @returns {string} shortData[].wsdStr - 풍속 등급 문자열
   * @private
   */
  #_convertShortForecastData(
    dateTime,
    vilageFcst,
    ultraSrtNcst,
    ultraSrtFcst,
    threeDaysCityWeatherData
  ) {
    let shortData = [];

    let mergeData = new Map();

    console.log(
      `vilageFcst.items[0]: ${JSON.stringify(vilageFcst.items[0], null, 2)}`
    );
    for (const item of vilageFcst.items) {
      const key = `${item.fcstDateStr}-${parseInt(item.fcstTimeStr) / 100}`;
      console.log(`vilageFcst key: ${key}`);
      item.t3h = item.tmp;
      item.pcp = item.pcp == "강수없음" ? 0 : item.pcp;
      item.sno = item.sno == "적설없음" ? 0 : item.sno;
      item.sky = parseInt(item.sky);
      if (item.fcstDateStr == '20250729') {
        console.log(`item: ${JSON.stringify(item, null, 2)}`);
      }
      mergeData.set(key, item);
    }

    console.log(
      `ultraSrtFcst.items[0]: ${JSON.stringify(ultraSrtFcst.items[0], null, 2)}`
    );
    for (const item of ultraSrtFcst.items) {
      const key = `${item.fcstDateStr}-${parseInt(item.fcstTimeStr) / 100}`;
      // console.log(`ultraSrtFcst key: ${key}`);
      item.t3h = item.t1h;
      item.rn1 = item.rn1 == "강수없음" ? 0 : item.rn1;
      item.sky = parseInt(item.sky);

      let mergeItem = mergeData.get(key);
      if (mergeItem) {
        //merge all of fields of item to mergeItem
        for (const key in item) {
          mergeItem[key] = item[key];
        }
      } else {
        mergeData.set(key, item);
      }
    }

    {
      // console.log(`ultraSrtNcst: ${JSON.stringify(ultraSrtNcst, null, 2)}`);
      let item = ultraSrtNcst;
      const key = `${ultraSrtNcst.baseDateTimeStr.slice(0, 8)}-${parseInt(
        ultraSrtNcst.baseDateTimeStr.slice(8, 10)
      )}`;
      // console.log(`ultraSrtNcst key: ${key}`);
      let mergeItem = mergeData.get(key);
      if (mergeItem) {
        //merge all of fields of item to mergeItem
        for (const key in item) {
          if (item[key] != null) {
            mergeItem[key] = item[key];
          }
        }
      } else {
        mergeData.set(key, ultraSrtNcst);
      }
    }

    console.log(`threeDaysCityWeatherData[0]: ${JSON.stringify(threeDaysCityWeatherData[0], null, 2)}`);
    for (const item of threeDaysCityWeatherData) {
      // console.log(`item.pubDate: ${item.pubDate}`);
      let dateStr = moment(item.pubDate, "YYYY.MM.DD.HH:mm", "Asia/Seoul").format("YYYYMMDD");
      let timeStr = moment(item.pubDate, "YYYY.MM.DD.HH:mm", "Asis/Seoul").format("HH");
      const key = `${dateStr}-${parseInt(timeStr)}`;
      console.log(`threeDaysCityWeatherData key=${key}`);

      item.t3h = item.t1h;
      item.pty = this.#_getPtyFromWeather(item.weather);
      item.cloud = item.hasOwnProperty('cloud') === false ? 0 : item.cloud;
      item.sky = item.cloud <= 0 ? 1 : Math.ceil(item.cloud / 2.5);
      item.vec = this.#_degTo16(item.wdd);

      // console.log(`threeDaysCityWeatherData key: ${key}`);
      let mergeItem = mergeData.get(key);
      if (mergeItem) {
        //merge all of fields of item to mergeItem
        for (const key in item) {
          mergeItem[key] = item[key];
        }
      } else {
        mergeData.set(key, item);
      }
    }

    let hoursData = [];

    //get all of keys of mergeData to hoursData
    for (const key of mergeData.keys()) {
      let item = mergeData.get(key);
      hoursData.push({
        ...item,
        date: key.split("-")[0],
        time: parseInt(key.split("-")[1]),
      });
      if (!(item.sky === 1 || item.sky === 2 || item.sky === 3 || item.sky === 4)) {
        console.log(`item.sky is 0 or NaN: ${JSON.stringify(item, null, 2)}`);
      }
    }

    //sort hoursData by date and time
    hoursData.sort((a, b) => {
      return a.date.localeCompare(b.date) || a.time - b.time;
    });

    //find time is 23 from last of array
    let last23 = hoursData.findLastIndex(item => item.time === 23);
    console.log(`last23: ${last23}`);
    let endMergeIndex = last23 + 1; // 0 hour

    let rainPerDay = new Map();
    let snowPerDay = new Map();

    //merge hoursData to shortData 3 datas  to 1 array per 3 hours
    for (let i = 0; i < endMergeIndex + 1; i += 3) {
      let item = hoursData[i];
      //make fx(r06), fx(s06), max(pop), fx(pty), avg(sky), isValid(tmn), isValid(tmx)
      if (i != 0) {
        item.pop = Math.max(hoursData[i-2].pop, hoursData[i-1].pop, hoursData[i].pop);
        item.tmn = hoursData[i-2].tmn || hoursData[i-1].tmn || hoursData[i].tmn;
        item.tmx = hoursData[i-2].tmx || hoursData[i-1].tmx || hoursData[i].tmx;
        item.sky = Math.ceil((hoursData[i-2].sky + hoursData[i-1].sky + hoursData[i].sky) / 3);
        item.pty = this.#_priorityPty(hoursData[i-2].pty, hoursData[i-1].pty, hoursData[i].pty);
      }

      if (!item.hasOwnProperty("sensoryTem")) {
        item.sensoryTem = this.#_getSensoryTem(item.t3h,item.reh,item.wsd,item.date);
      }

      //todo : check result of r03, s03
      if (hoursData[i].hasOwnProperty("r1d")) {
        let prevRainPerDay = rainPerDay.get(item.date) || 0;
        item.r03 = item.r1d - prevRainPerDay;
        rainPerDay.set(item.date, item.r1d);
      }

      if (hoursData[i].hasOwnProperty("s1d")) {
        let prevSnowPerDay = snowPerDay.get(item.date) || 0;
        item.s03 = item.s1d - prevSnowPerDay;
        snowPerDay.set(item.date, item.s1d);
      }

      item.night = false;
      item.night = item.time >= 18 || item.time < 6;
      item.skyIcon = this.#_getSkyIcon(item.sky, item.pty, item.lgt, item.night);
      item.dataObj = this.#_formatDateObj(item.date, item.time);
      item.fromToday = this.#_getFromToday(item.date, dateTime);
      item.wsdGrade = this.#_getWsdGrade(item.wsd);

      console.log(`item: ${JSON.stringify(item, null, 2)}`);
      shortData.push({
        ...item,
      });
    }

    console.log(`start merge 3 hours data`);

    for (let i = endMergeIndex + 1; i < hoursData.length; i++) {
      let item = hoursData[i];
      item.sensoryTem = this.#_getSensoryTem(item.t3h,item.reh,item.wsd,item.date);
      item.r03 = parseInt(item.pcp);
      item.s03 = parseInt(item.sno);
      item.night = false;
      item.night = item.time >= 18 || item.time < 6;
      item.pty = parseInt(item.pty);
      item.skyIcon = this.#_getSkyIcon(item.sky, item.pty, item.lgt, item.night);
      item.dataObj = this.#_formatDateObj(item.date, item.time);
      item.fromToday = this.#_getFromToday(item.date, dateTime);
      item.wsdGrade = this.#_getWsdGrade(item.wsd);

      console.log(`item: ${JSON.stringify(item, null, 2)}`);

      shortData.push({
        ...item,
      });
    }

    // console.log(`shortData[0]: ${JSON.stringify(shortData[0], null, 2)}`);
    // console.log(`shortData[1]: ${JSON.stringify(shortData[1], null, 2)}`);

    // console.log(`shortData[0]: ${JSON.stringify(shortData[0], null, 2)}`);
    // console.log(`shortData[23]: ${JSON.stringify(shortData[23], null, 2)}`);
    // console.log(`shortData[46]: ${JSON.stringify(shortData[46], null, 2)}`);
    // console.log(`shortData[69]: ${JSON.stringify(shortData[69], null, 2)}`);
    // console.log(`shortData[82]: ${JSON.stringify(shortData[82], null, 2)}`);
    // console.log(`shortData[83]: ${JSON.stringify(shortData[83], null, 2)}`);
    // console.log(`shortData[84]: ${JSON.stringify(shortData[84], null, 2)}`);
    // console.log(`shortData[92]: ${JSON.stringify(shortData[92], null, 2)}`);
    // console.log(`shortData[115]: ${JSON.stringify(shortData[115], null, 2)}`);
    // console.log(`shortData[138]: ${JSON.stringify(shortData[138], null, 2)}`);
    return shortData;
  }

  #_convertMidDailyData(midLandFcst, midTa, dateTime) {
    let dailyData = [];

    const landItems =
      midLandFcst?.response?.body?.items?.item || midLandFcst?.item || [];
    const taItems = midTa?.response?.body?.items?.item || midTa?.item || [];

    console.log("midLandFcst items:", landItems);
    console.log("midTa items:", taItems);

    if (landItems.length > 0 || taItems.length > 0) {
      const landData = {};
      const taData = {};

      // Group land forecast data
      landItems.forEach((item) => {
        const date = item.fcstDate;
        if (!landData[date]) landData[date] = {};

        if (item.code?.includes("AM")) {
          landData[date].wfAm = item.wf;
        } else if (item.code?.includes("PM")) {
          landData[date].wfPm = item.wf;
        }
      });

      // Group temperature data
      taItems.forEach((item) => {
        const date = item.fcstDate;
        if (!taData[date]) taData[date] = {};

        if (item.code?.includes("MIN")) {
          taData[date].tmn = parseFloat(item.ta);
        } else if (item.code?.includes("MAX")) {
          taData[date].tmx = parseFloat(item.ta);
        }
      });

      // Combine data
      const allDates = [
        ...new Set([...Object.keys(landData), ...Object.keys(taData)]),
      ];

      if (allDates.length === 0) {
        // Generate sample dates if no data available
        const today = moment().tz("Asia/Seoul");
        for (let i = 0; i < 7; i++) {
          const date = today.clone().add(i, "days").format("YYYYMMDD");
          allDates.push(date);
        }
      }

      dailyData = allDates
        .map((date) => {
          const land = landData[date] || {};
          const ta = taData[date] || {};

          return {
            date: date,
            wfAm: land.wfAm || "맑음",
            wfPm: land.wfPm || "맑음",
            reliability: "",
            skyAm: this.#_getWeatherIcon(land.wfAm),
            ptyAm: this.#_getPtyFromWeather(land.wfAm),
            lgtAm: 0,
            skyPm: this.#_getWeatherIcon(land.wfPm),
            ptyPm: this.#_getPtyFromWeather(land.wfPm),
            lgtPm: 0,
            sky: this.#_getSkyFromWeather(land.wfPm || land.wfAm),
            pty: this.#_getPtyFromWeather(land.wfPm || land.wfAm),
            lgt: 0,
            skyIcon: this.#_getWeatherIcon(land.wfPm || land.wfAm),
            dateObj: this.#_formatDateObj(date, 0),
            tmx: ta.tmx || 25,
            tmn: ta.tmn || 15,
            fromToday: this.#_getFromToday(date, dateTime),
            dayOfWeek: this.#_getDayOfWeek(date),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // console.log("Converted daily data:", dailyData);
    return dailyData;
  }

  #_convertAirInfo(ctprvnRltmData, minuDustFrcst, minuDustWeekFrcst) {
    console.log("Air quality data:", {
      ctprvnRltmData,
      minuDustFrcst,
      minuDustWeekFrcst,
    });

    return {
      source: "airkorea",
      stationName: this.params.stationList?.[0] || "",
      ctprvnRltm: ctprvnRltmData?.response?.body?.items || ctprvnRltmData || [],
      minuDustFrcst: minuDustFrcst || {},
      minuDustWeekFrcst: minuDustWeekFrcst || {},
    };
  }

  /**
   * wdd to vec (0-360)
   * @param {string} wdd
   * @returns {number} vec (0-360)
   */
  #_degTo16(wdd) {
    const list = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const idx = list.indexOf(wdd);
    return idx >= 0 ? idx * 22.5 : undefined;
  }

  /**
   * 3개의 강수형태 값 중 우선순위에 따라 최종 강수형태를 결정
   * 
   * 우선순위 규칙:
   * - 3개 중에 2(비/눈)가 있다면 2로 확정
   * - 4(소나기)만 있다면 4로 확정  
   * - 5(빗방울)만 있다면 5로 확정
   * - 6(빗방울눈날림)만 있다면 6로 확정
   * - 7(눈날림)만 있다면 7로 확정
   * - 1(비)과 3(눈)이 있다면 2(비/눈)로 확정
   * - 1(비)이 있고, 4(소나기) or 5(빗방울)가 있다면 1(비)로 확정
   * - 1(비)이 있고, 6(빗방울눈날림) or 7(눈날림)이 있다면 2(비/눈)로 확정
   * 
   * @param {number} pty1 - 첫 번째 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
   * @param {number} pty2 - 두 번째 강수형태
   * @param {number} pty3 - 세 번째 강수형태
   * @returns {number} 최종 결정된 강수형태
   * @private
   */
  #_priorityPty(pty1, pty2, pty3) {
    const ptyArray = [pty1, pty2, pty3].filter(pty => pty > 0); // 0(없음) 제외
    
    if (ptyArray.length === 0) return 0; // 모두 없음
    
    // 2(비/눈)가 있다면 최우선
    if (ptyArray.includes(2)) return 2;
    
    // 1(비)과 3(눈)이 함께 있다면 2(비/눈)로 확정
    if (ptyArray.includes(1) && ptyArray.includes(3)) return 2;
    
    // 1(비)이 있고, 6(빗방울눈날림) or 7(눈날림)이 있다면 2(비/눈)로 확정
    if (ptyArray.includes(1) && (ptyArray.includes(6) || ptyArray.includes(7))) return 2;
    
    // 1(비)이 있고, 4(소나기) or 5(빗방울)가 있다면 1(비)로 확정
    if (ptyArray.includes(1) && (ptyArray.includes(4) || ptyArray.includes(5))) return 1;
    
    // 단일 강수형태의 경우 그대로 반환 (우선순위: 7 > 6 > 4 > 3 > 1)
    if (ptyArray.includes(1)) return 1;
    if (ptyArray.includes(3)) return 3;
    if (ptyArray.includes(6)) return 6; 
    if (ptyArray.includes(5)) return 5; 
    if (ptyArray.includes(7)) return 7;
    if (ptyArray.includes(4)) return 4;
    
    // 기타 경우 가장 높은 값 반환
    return Math.min(...ptyArray);
  }

  #_getSensoryTem(tmp, reh, wsd, dateStr) {
    function calcTw(Ta, RH) {
      return (
        Ta * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
        Math.atan(Ta + RH) -
        Math.atan(RH - 1.67633) +
        0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
        4.686035
      );
    }

    const Ta = tmp;
    const RH = reh;
    const windSpeedMS = wsd; // m/s
    const windSpeedKmH = windSpeedMS * 3.6; // km/h
    const month = moment(dateStr, "YYYYMMDD", "Asia/Seoul").month() + 1;
    const isWinter = month >= 10 || month <= 4;

    let result = 0;

    if (isWinter && Ta <= 10 && windSpeedMS >= 1.3) {
      result = (
        13.12 +
        0.6215 * Ta -
        11.37 * Math.pow(windSpeedKmH, 0.16) +
        0.3965 * Ta * Math.pow(windSpeedKmH, 0.16)
      );
    } else {
      const Tw = calcTw(Ta, RH);
      result = (
        -0.2442 +
        0.55399 * Tw +
        0.45535 * Ta -
        0.0022 * Tw * Tw +
        0.00278 * Tw * Ta +
        3.0
      );
    }

    return parseFloat(result.toFixed(1));
  }

  #_getSkyIcon(sky, pty, lgt, isNight) {
    // Base icon depends on day/night
    let skyIconName = isNight ? "Moon" : "Sun";

    // Handle sky conditions
    switch (sky) {
      case 1:
        // Clear sky - keep base icon as is
        break;
      case 2:
        skyIconName += "SmallCloud";
        break;
      case 3:
        skyIconName += "BigCloud";
        break;
      case 4:
        skyIconName = "Cloud"; // Overwrite base for overcast conditions
        break;
      default:
        console.error(`Failed to parse sky condition: AAA${sky}AAAA`);
        break;
    }

    // Handle precipitation types
    switch (pty) {
      case 0:
        // No precipitation
        break;
      case 1:
      case 4:
      case 5:
        skyIconName += "Rain";
        break;
      case 2:
      case 6:
        skyIconName += "RainSnow";
        break;
      case 3:
      case 7:
        skyIconName += "Snow";
        break;
      default:
        console.error(`Failed to parse precipitation type: ${pty}`);
        break;
    }

    // Add lightning if present
    if (lgt === 1) {
      skyIconName += "Lightning";
    }

    return skyIconName;
  }

  #_getWeatherIcon(weather) {
    if (!weather) return "Sun";
    if (weather.includes("비")) return "CloudRain";
    if (weather.includes("눈")) return "CloudSnow";
    if (weather.includes("흐림")) return "Cloud";
    if (weather.includes("구름많음")) return "SunBigCloud";
    if (weather.includes("구름조금")) return "SunSmallCloud";
    return "Sun";
  }

  #_getPtyFromWeather(weather) {
    if (!weather) return 0;
    if (weather.includes("비") && weather.includes("눈")) return 2;
    else if (weather.includes("비")) return 1;
    else if (weather.includes("눈")) return 3;
    else if (weather.includes("소나기")) return 4;
    else if (weather.includes("빗방울")) return 5;
    else if (weather.includes("빗방울눈날림")) return 6;
    else if (weather.includes("눈날림")) return 7;
    return 0;
  }

  #_getSkyFromWeather(weather) {
    if (!weather) return 1;
    if (weather.includes("흐림")) return 4;
    if (weather.includes("구름많음")) return 3;
    if (weather.includes("구름조금")) return 2;
    return 1;
  }

  #_formatDateObj(date, time) {
    if (!date) return "";
    const year = date.substr(0, 4);
    const month = date.substr(4, 2);
    const day = date.substr(6, 2);
    const hour = time === 24 ? "24:00" : String(time).padStart(2, "0") + ":00";
    return `${year}.${month}.${day} ${hour}`;
  }

  #_getWsdGrade(wsd) {
    if (wsd < 4) return 1;
    else if (wsd < 9) return 2;
    else if (wsd < 14) return 3;
    else return 4;
  }

  /**
   * Calculate the difference in days from today to the target date
   * @param {string} date - Target date in YYYYMMDD format
   * @param {string} dateTime - Current datetime in "YYYY-MM-DD HH:mm:ss" format
   * @returns {number} Number of days from today (0: today, 1: tomorrow, -1: yesterday)
   * @private
   */
  #_getFromToday(date, dateTime) {
    if (!date) return 0;
    
    // Parse current datetime and extract today's date in YYYYMMDD format
    const todayString = moment(dateTime, "YYYY-MM-DD HH:mm:ss", "Asia/Seoul").format("YYYYMMDD");
    
    // Create moment objects for date comparison
    const targetDate = moment(date, "YYYYMMDD", "Asia/Seoul");
    const todayDate = moment(todayString, "YYYYMMDD", "Asia/Seoul");
    
    // Return the difference in days
    return targetDate.diff(todayDate, "days");
  }

  /**
   * Generate complete time series from 3 days ago to 3 days forward in 3-hour increments
   * @returns {Array} Array of time slot objects with date and time
   */
  #_generateTimeSlots() {
    const timeSlots = [];
    const now = moment().tz("Asia/Seoul");

    // Start from 3 days ago
    const startDate = now.clone().subtract(3, "days");
    const endDate = now.clone().add(3, "days");

    // 3-hour increments: 0, 3, 6, 9, 12, 15, 18, 21, 24
    const timeIncrement = [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400];

    let currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate, "day")) {
      timeIncrement.forEach((time) => {
        // Handle time=24 rollover: if time is 2400, it should be next day 0000
        let slotDate = currentDate.format("YYYYMMDD");
        let slotTime = time;

        if (time === 2400) {
          // Time 24:00 is actually the next day at 00:00, but keep as 24 for consistency with sample data
          slotDate = currentDate.format("YYYYMMDD");
          slotTime = 2400;
        }

        timeSlots.push({
          date: slotDate,
          time: slotTime,
          // Default values for slots without data
          pop: -1,
          pty: -1,
          r06: -1,
          reh: -1,
          s06: -1,
          sky: -1,
          t3h: -1,
          tmn: -50,
          tmx: -50,
          uuu: -1,
          vvv: -1,
          wav: -999,
          vec: -1,
          wsd: -1,
          rn1: -1,
          lgt: 0,
          sensorytem: null,
          dspls: null,
        });
      });

      currentDate.add(1, "day");
    }

    return timeSlots;
  }

  #_getDayOfWeek(date) {
    if (!date) return 0;
    return moment(date, "YYYYMMDD", "Asia/Seoul").day();
  }

  #_getWindGrade(wsd) {
    if (wsd < 4) return 1;
    else if (wsd < 9) return 2;
    else if (wsd < 14) return 3;
    else return 4;
  }

  #_getWindStr(wsd) {
    if (wsd < 4) return "바람약함";
    else if (wsd < 9) return "바람약간강함";
    else if (wsd < 14) return "바람강함";
    else return "바람매우강함";
  }

  #_getDiscomfortGrade(discomfortIndex) {
    if (discomfortIndex < 68) return 0; // 낮음
    else if (discomfortIndex < 75) return 1; // 보통
    else if (discomfortIndex < 80) return 2; // 높음
    else return 3; // 매우높음
  }

  #_getDiscomfortStr(discomfortIndex) {
    if (discomfortIndex < 68) return "낮음";
    else if (discomfortIndex < 75) return "보통";
    else if (discomfortIndex < 80) return "높음";
    else return "매우높음";
  }

  #_getHeatIndexGrade(heatIndex) {
    if (heatIndex < 27) return 0; // 낮음
    else if (heatIndex < 32) return 1; // 보통
    else if (heatIndex < 40) return 2; // 높음
    else return 3; // 매우높음
  }

  #_getHeatIndexStr(heatIndex) {
    if (heatIndex < 27) return "낮음";
    else if (heatIndex < 32) return "보통";
    else if (heatIndex < 40) return "높음";
    else return "매우높음";
  }
}
