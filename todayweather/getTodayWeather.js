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
   *
   * @param {object} event
   * @param {object} event.queryStringParameters
   * @param {string} [event.queryStringParameters.lat]
   * @param {string} [event.queryStringParameters.lon]
   * @param {string} [event.queryStringParameters.address]
   */
  async get(event) {
    await this.#_parseEvent(event);

    try {
      //todo: midLandFcst, midTa 모두 regIdForTa 값으로 받아오고 있음. 오류 확인 필요
      let dateTime = moment().tz("Asia/Seoul").format("YYYYMMDDHHmm");
      this.params.datetime = dateTime;

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
        //   datetime: moment(dateTime, "YYYYMMDDHHmm")
        //     .tz("Asia/Seoul")
        //     .subtract(1, "days")
        //     .format("YYYYMMDDHHmm"),
        // }),
      ]);

      //get 3days cityWeather for making short
      let threeDaysCityWeatherData = [];
      const currentDateTime = moment(dateTime, "YYYYMMDDHHmm").tz("Asia/Seoul");
      
      // Create array of promises for fetching 3 days of historical cityweather data (every hour)
      let cityWeatherPromises = [];
      for (let day = 1; day <= 3; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const targetDateTime = currentDateTime
            .clone()
            .subtract(day, "days")
            .hour(hour)
            .minute(0)
            .format("YYYYMMDDHHmm");
          
          cityWeatherPromises.push(
            (new KmaScraper()).getCityWeather({
              datetime: targetDateTime,
            })
          );
        }
      }

      // Execute all cityweather requests in parallel
      try {
        const cityWeatherResults = await Promise.allSettled(cityWeatherPromises);
        
        // console.log(`cityWeatherResults.length : ${cityWeatherResults.length}`);
        // console.log(`cityWeatherResults[0].status: ${cityWeatherResults[0].status}`);
        // console.log(`cityWeatherResults[0].value.statusCode: ${cityWeatherResults[0].value.statusCode}`);
        // console.log(`cityWeatherResults[0].value.body.length: ${cityWeatherResults[0].value.body.length}`);

        // Process successful results and filter out failures
        threeDaysCityWeatherData = cityWeatherResults
          .filter(result => result.status === 'fulfilled' && result.value.statusCode === 200)
          .map(result => result.value)
          .flat(); // Flatten array since each response contains an array
          
        console.log(`Retrieved ${threeDaysCityWeatherData.length} historical cityweather records`);
        console.log(`Count of ${threeDaysCityWeatherData[0].body.length} in first historical cityweather records`);
        console.log(`threeDaysCityWeatherData[0].body[0]: ${JSON.stringify(threeDaysCityWeatherData[0].body[0], null, 2)}`);
      } catch (error) {
        console.error("Error fetching 3-day cityweather data:", error);
        threeDaysCityWeatherData = [];
      }

      let yesterdayDateTime = moment(dateTime, "YYYYMMDDHHmm")
        .tz("Asia/Seoul")
        .subtract(1, "days")
        .format("YYYY.MM.DD.HH:00");
      console.log(`yesterdayDateTime: ${yesterdayDateTime}`);

      let yesterdayCityWeatherData = threeDaysCityWeatherData.filter(
        (item) => item.body[0].pubDate === yesterdayDateTime
      );

      console.log(`yesterdayCityWeatherData count: ${yesterdayCityWeatherData.length}`);
      // if (yesterdayCityWeatherData.length > 0) {
      //   console.log(`yesterdayCityWeatherData sample: ${JSON.stringify(yesterdayCityWeatherData[0], null, 2)}`);
      // }

      //get 7days ASOS daily data for historical analysis
      let sevenDaysAsosData = [];
      try {
        // Calculate date range: 7 days ago to yesterday
        const endDate = moment().tz("Asia/Seoul").subtract(1, "days");
        const startDate = endDate.clone().subtract(6, "days");
        
        console.log(`Fetching 7-day ASOS data from ${startDate.format('YYYYMMDD')} to ${endDate.format('YYYYMMDD')}`);
        
        // Get nearest weather station ID for ASOS data
        console.log(`nearStnList: ${JSON.stringify(nearStnList)}`);

        const nearestStnId = nearStnList.length > 0 
          ? nearStnList[0].stnId 
          : "0"; // Default to Seoul station
        
        console.log(`7days asos nearestStnId: ${nearestStnId}`);

        const asosResult = await this.asosDalyInfoService.getByDateRange(
          startDate.format('YYYYMMDD'),
          endDate.format('YYYYMMDD'),
          nearestStnId
        );
        
        if (asosResult.statusCode === 200) {
          sevenDaysAsosData = asosResult.body;
          console.log(`Retrieved ${sevenDaysAsosData.length} days of ASOS data`);
        } else {
          console.warn('Failed to fetch ASOS daily data:', asosResult.body);
        }
      } catch (error) {
        console.error('Error fetching 7-day ASOS data:', error);
      }

      // return { statusCode: 200, body: null };

      //get 7days cityWeather for making daily


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
      console.log(`vilageFcst.items[0]: ${JSON.stringify(result.vilageFcst.items[0], null, 2)}`);
      console.log(`vilageFcst.items[1]: ${JSON.stringify(result.vilageFcst.items[1], null, 2)}`);
      // console.log(`cityWeatherData: ${JSON.stringify(result.cityWeatherData, null, 2)}`);
      // console.log(`asosData: ${JSON.stringify(result.asosData, null, 2)}`);
      // console.log(`yesterdayCityWeatherData: ${JSON.stringify(result.yesterdayCityWeatherData, null, 2)}`);
      console.log(`threeDaysCityWeatherData count: ${result.threeDaysCityWeatherData.length}`);
      if (result.threeDaysCityWeatherData.length > 0) {
        console.log(`threeDaysCityWeatherData sample: ${JSON.stringify(result.threeDaysCityWeatherData[0], null, 2)}`);
      }
      console.log(`sevenDaysAsosData count: ${result.sevenDaysAsosData.length}`);
      if (result.sevenDaysAsosData.length > 0) {
        console.log(`sevenDaysAsosData sample: ${JSON.stringify(result.sevenDaysAsosData[0], null, 2)}`);
      }

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
      }
      else {
        console.warn(`unknown category: ${item.data[0].category}`);
      }
    }
    result.items = dataItems;
    return result;
  }

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
   *
   * @param {object} event
   * @param {object} event.queryStringParameters
   * @param {string} [event.queryStringParameters.lat]
   * @param {string} [event.queryStringParameters.lon]
   * @param {string} [event.queryStringParameters.address]
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

  #_combineData(
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
    let now = moment().tz("Asia/Seoul");

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

    console.log(`yesterdayCityWeatherData length: ${yesterdayCityWeatherData.length}`);

    let filteredYesterdayCityWeatherData = yesterdayCityWeatherData.filter(
      (item) => nearStnList.some((stn) => stn.stnId === item.stnId)
    );

    console.log(`threeDaysCityWeatherData length: ${threeDaysCityWeatherData.length}`);

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

    console.log (` current pub date: ${data.ultraSrtNcst?.response?.header?.resultMsg}`);

    let result = {
      regionName: this.params.region_1depth_name,
      cityName: this.params.region_2depth_name,
      townName: "",
      // currentPubDate:
      //   data.ultraSrtNcst?.response?.header?.resultMsg ||
      //   moment().tz("Asia/Seoul").format("YYYYMMDDHHmm"),
      current: this.currentDataGenerator.convertCurrentData(
        data.cityWeatherData,
        data.asosData,
        data.ultraSrtNcst,
        data.ultraSrtFcst.items,
        data.vilageFcst.items,
        data.yesterdayCityWeatherData
      ),
      // shortPubDate:
      //   data.vilageFcst?.response?.header?.resultMsg ||
      //   moment().tz("Asia/Seoul").format("YYYYMMDDHHmm"),
      // shortRssPubDate:
      //   data.vilageFcst?.response?.header?.resultMsg ||
      //   moment().tz("Asia/Seoul").format("YYYYMMDDHHmm"),
      short: this.#_convertShortForecastData(
        data.vilageFcst,
        data.ultraSrtNcst,
        data.ultraSrtFcst,
        data.threeDaysCityWeatherData
      ), 
      // midData: {
      //   forecast: this.#_convertMidForecastData(data.midFcst),
      //   dailyData: this.#_convertMidDailyData(data.midLandFcst, data.midTa),
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


  #_convertShortForecastData(vilageFcst, ultraSrtNcst, ultraSrtFcst, threeDaysCityWeatherData) {
    // Combine and transform short-term forecast data from vilage, ultra short term current and forecast
    let shortData = [];

    // Process vilage forecast data
    const items =
      vilageFcst?.response?.body?.items?.item || vilageFcst?.item || [];
    console.log("vilageFcst items:", items);

    if (items && items.length > 0) {
      const groupedData = {};
      items.forEach((item) => {
        const key = `${item.fcstDate}_${item.fcstTime}`;
        if (!groupedData[key]) {
          groupedData[key] = {
            date: item.fcstDate,
            time: parseInt(item.fcstTime) / 100,
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
          };
        }

        switch (item.category) {
          case "POP":
            groupedData[key].pop = parseFloat(item.fcstValue);
            break;
          case "PTY":
            groupedData[key].pty = parseFloat(item.fcstValue);
            break;
          case "R06":
            groupedData[key].r06 = parseFloat(item.fcstValue);
            break;
          case "REH":
            groupedData[key].reh = parseFloat(item.fcstValue);
            break;
          case "S06":
            groupedData[key].s06 = parseFloat(item.fcstValue);
            break;
          case "SKY":
            groupedData[key].sky = parseFloat(item.fcstValue);
            break;
          case "T3H":
            groupedData[key].t3h = parseFloat(item.fcstValue);
            break;
          case "TMN":
            groupedData[key].tmn = parseFloat(item.fcstValue);
            break;
          case "TMX":
            groupedData[key].tmx = parseFloat(item.fcstValue);
            break;
          case "UUU":
            groupedData[key].uuu = parseFloat(item.fcstValue);
            break;
          case "VVV":
            groupedData[key].vvv = parseFloat(item.fcstValue);
            break;
          case "WAV":
            groupedData[key].wav = parseFloat(item.fcstValue);
            break;
          case "VEC":
            groupedData[key].vec = parseFloat(item.fcstValue);
            break;
          case "WSD":
            groupedData[key].wsd = parseFloat(item.fcstValue);
            break;
        }
      });

      // Convert to array and add additional fields
      shortData = Object.values(groupedData)
        .map((item) => {
          const hour = parseInt(item.time);
          const isNight = hour < 6 || hour >= 18;

          return {
            ...item,
            rn1: 0,
            lgt: 0,
            sensorytem: Math.round(item.t3h) || 20,
            dspls: 50,
            dsplsGrade: 0,
            dsplsStr: "보통",
            decpsn: 0,
            decpsnGrade: 0,
            decpsnStr: "낮음",
            heatIndex: item.t3h || 20,
            heatIndexGrade: 0,
            heatIndexStr: "낮음",
            frostGrade: 0,
            frostStr: "낮음",
            night: isNight,
            skyIcon: this.#_getSkyIcon(item.sky, item.pty, isNight),
            dateObj: this.#_formatDateObj(item.date, item.time),
            fromToday: this.#_getFromToday(item.date),
            wsdGrade: this.#_getWindGrade(item.wsd),
            wsdStr: this.#_getWindStr(item.wsd),
          };
        })
        .sort((a, b) => {
          // Sort by date and time
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time - b.time;
        });
    }

    // console.log("Converted short data:", shortData);
    return shortData;
  }

  #_convertMidForecastData(midFcst) {
    const items = midFcst?.response?.body?.items?.item || midFcst?.item || [];
    console.log("midFcst items:", items);

    if (!items || items.length === 0) {
      return { date: "", time: "", cnt: 0, wfsv: "" };
    }

    const item = items[0];
    return {
      date: item?.tmFc || "",
      time: item?.tmFc?.substr(8, 4) || "",
      cnt: 0,
      wfsv: item?.wf || "",
    };
  }

  #_convertMidDailyData(midLandFcst, midTa) {
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
            fromToday: this.#_getFromToday(date),
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

  #_getSkyIcon(sky, pty, isNight) {
    if (pty > 0) {
      if (sky === 1) return isNight ? "MoonRain" : "SunRain";
      else return "CloudRain";
    }

    if (sky === 1) return isNight ? "Moon" : "Sun";
    else if (sky === 2) return isNight ? "MoonSmallCloud" : "SunSmallCloud";
    else if (sky === 3) return isNight ? "MoonBigCloud" : "SunBigCloud";
    else return "Cloud";
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
    if (weather.includes("비")) return 1;
    if (weather.includes("눈")) return 3;
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

  #_getFromToday(date) {
    if (!date) return 0;
    const today = moment().tz("Asia/Seoul").format("YYYYMMDD");
    const targetDate = moment(date, "YYYYMMDD");
    const todayDate = moment(today, "YYYYMMDD");
    return targetDate.diff(todayDate, "days");
  }

  #_getDayOfWeek(date) {
    if (!date) return 0;
    return moment(date, "YYYYMMDD").day();
  }

  #_getWindGrade(wsd) {
    if (wsd < 4) return 1;
    else if (wsd < 9) return 2;
    else if (wsd < 14) return 3;
    else return 4;
  }

  #_getWindStr(wsd) {
    if (wsd < 4) return "바람약함";
    else if (wsd < 9) return "바람보통";
    else if (wsd < 14) return "바람강함";
    else return "바람매우강함";
  }
}
