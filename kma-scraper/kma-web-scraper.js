/**
 * 
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import iconv from 'iconv-lite';
import moment from 'moment-timezone';

import { ControllerS3 } from "../aws/controllerS3.js";
import { KakaoApi } from "../geo/getKakaoApi.js";

export class KmaScraper extends ControllerS3 {
    
    constructor() {
        super();
        this.domain = "https://www.weather.go.kr";
        this.cityWeatherList;
        this.cityWeatherKey;
        this.asosList;
        this.asosKey;
        this.stnInfoList;
        this.stnInfoKey;
    }

    /**
     * 
     * @param {*} $ 
     * @returns 
     */
    #parseASOS($) {
        let asosInfoList = {pubDate: '', asosInfo: []};

        let strAr = $('.ehead').text().split(' ');

        asosInfoList.pubDate = strAr[strAr.length - 1];

        if (asosInfoList.pubDate === ''
            || asosInfoList.pubDate === undefined
            || asosInfoList.pubDate === null
            || asosInfoList.pubDate.length < 12) {
                console.warn('Fail to get weather data.', asosInfoList.pubDate);

                return asosInfoList;
        }

        console.info('parse ASOS pubDate: ', asosInfoList.pubDate);

        const propertyName = ['stnId', 'stnName', 'altitude', 'rns', 'rs15m', 'rs1h', 'rs3h', 'rs6h', 'rs12h', 'rs1d', 't1h',
            'vec1', 'wdd1', 'wsd1', 'vec', 'wdd', 'wsd', 'reh', 'hPa', 'addr'];

        let table = $('table table');

        let trs = table.find('tr');
        console.info('parse ASOS trs: ', trs.length);

        trs.each((i, tr) => {
            if (i === 0) {
                //skip header
                return;
            }

            let tds = $(tr).find('td');

            let stnMinInfo = {};
            stnMinInfo.pubDate = asosInfoList.pubDate;
            stnMinInfo.date = moment(asosInfoList.pubDate, "YYYY.MM.DD.HH:mm", "Asia/Seoul");

            tds.each((j, td) => {
               let tdText = $(td).text().replace(/\s+/, '');
               tdText = tdText.replace(/(\r\n|\n|\r)/gm, '');
               tdText = tdText.replace(/\s+/g, '');

                if (tdText === '.' || tdText === '-') {
                    //skip invalid data
                    return;
                }

                let val;
                switch(propertyName[j]) {
                    case 'altitude':
                    case 'reh':
                        val = parseInt(tdText);
                        if(!isNaN(val)) {
                            stnMinInfo[propertyName[j]] = val;
                        }
                        break;
                    case 'rns':
                        stnMinInfo[propertyName[j]]  = tdText === '●' ? true: false;
                        break;
                    case 'rs15m':
                    case 'rs1h':
                    case 'rs3h':
                    case 'rs6h':
                    case 'rs12h':
                    case 'rs1d':
                    case 't1h':
                    case 'vec1':
                    case 'wsd1':
                    case 'vec':
                    case 'wsd':
                    case 'hPa':
                        val = parseFloat(tdText);
                        if (!isNaN(val)) {
                            stnMinInfo[propertyName[j]] = val;
                        }
                        break;
                    default: 
                        stnMinInfo[propertyName[j]] = tdText;
                }
            });

            if (stnMinInfo.t1h === 0
                && stnMinInfo.vec === 0
                && stnMinInfo.wsd === 0
                && stnMinInfo.vec1 === 0) {
                console.error('Invalid data. ', stnMinInfo);
            }
            else {
                // console.log(stnMinInfo);
                asosInfoList.asosInfo.push(stnMinInfo);
            }
        });

        console.log(`asosInfoList.asosInfo[0]: ${JSON.stringify(asosInfoList.asosInfo[0], null, 2)}`);
        return asosInfoList.asosInfo;
    }
    
    /**
     * 2022.11.22 21:30 -> 202211222130 
     * 
     * @param {object} params 
     * @param {string} [params.datetime] 
     * @returns 
     */
    async getASOS(params) {
      let tm;
      let now = moment().tz('Asia/Seoul').subtract(3, 'minutes');
      if (params?.datetime) {
        let param = moment(params?.datetime, 'YYYYMMDDHHmm', "Asia/Seoul");
        if (now.isBefore(param)) {
          tm = params.datetime;
        }
        else {
          tm = now.format('YYYYMMDDHHmm');
        }
      }
      else {
        //before 3mins
        tm = now.format('YYYYMMDDHHmm');
      }
      this.asosKey = `kma-scraper/asosmin/${tm}`;

      if (this.asosList) {
        return {statusCode: 200, body: this.asosList};
      }
      else {
        const scrapData = await this._loadFromS3(this.asosKey);
        if (scrapData) {
          this.asosList = scrapData;
          return {statusCode: 200, body: scrapData};
        }
      }

      const url = this.domain + `/cgi-bin/aws/nph-aws_txt_min?${tm}`;

      console.info(`get_ASOS url: ${url}`);
        
      const response = await axios.get(url, {responseEncoding: 'binary', responseType: 'arraybuffer'});
      const body = response.data;

      let result = {statusCode: 200, body: ''};

      if(body === undefined || body === null) {
        result.statusCode = 500;
        result.body = 'Fail to get ASOS data.';
        return result;
      }

      try {
        const strContents = iconv.decode(body, 'euc-kr').toString();
        let $ = cheerio.load(strContents);

        this.asosList = this.#parseASOS($);
        await this._saveToS3(this.asosKey, this.asosList);
        result.body = this.asosList;
      }
      catch(e) {
        console.error(e);
        result.statusCode = 500;
        result.body = 'Fail to parse ASOS data.';
      }

      //console.log(`result: ${JSON.stringify(result, null, 2)}`);
      return result;
    }

    #parseCityWeather($, pubDate) {
      let cityWeather = {pubDate: '', cityList: []};
      cityWeather.pubDate = $(".cmp-table-topinfo").text();
      cityWeather.pubDate = cityWeather.pubDate.replace("기상실황표","");

      console.info(`pubDate: ${cityWeather.pubDate}`);

			if (pubDate) {
      	if (moment(cityWeather.pubDate, "YYYY.MM.DD.HH:00", "Asia/Seoul").isBefore(pubDate)) {
        	let err = new Error("city weather is not updated yet pubDate=" + 
          cityWeather.pubDate);
        	console.warn(err);
        	throw err;
      	}
			}

      var propertyName = ["stnId"];

      $(".table-col thead #table_header2 th").each(function () {
        var thName = $(this).text().replace(/\s+/, "");
        thName = thName.replace(/(\r\n|\n|\r)/gm, "");
        thName = thName.replace(/\s+/, "");
        console.log("[" + thName + "]");
        switch (thName) {
					case "이름":
            propertyName.push("stnName");
						break;
          case "현재일기":
            propertyName.push("weather");
            break;
          case "시정km":
            propertyName.push("visibility");
            break;
          case "운량1/10":
            propertyName.push("cloud");
            break;
          case "중하운량":
            propertyName.push("heavyCloud");
            break;
          case "현재기온":
            propertyName.push("t1h");
            break;
          case "이슬점온도":
            propertyName.push("dpt");
            break;
          case "체감온도":
            propertyName.push("sensoryTem");
            break;
          case "불쾌지수":
            propertyName.push("dspls");
            break;
          case "일강수mm":
            propertyName.push("r1d");
            break;
          case "적설cm":
            propertyName.push("s1d");
            break;
          case "습도%":
            propertyName.push("reh");
            break;
          case "풍향":
            propertyName.push("wdd");
            break;
          case "풍속m/s":
            propertyName.push("wsd");
            break;
          case "풍속writeWindSpeedUnit();":
            propertyName.push("wsd2");
            break;
          case "해면기압":
            propertyName.push("hPa");
            break;
          default:
            console.warn("unknown city weather property=", thName);
            propertyName.push("unknown");
            break;
        }
      });
      
      console.log(`propertyName: ${propertyName}`);

      $(".table-col tbody tr").each(function () {
      	var weather = {};

        var i = 0;

        let thUrl = $(this).children("th").children().first().attr("href");
        //thUrl = city-obs.do?tm=2024.9.28.6:00&type=t99&mode=0&reg=100&auto_man=m&stn=105
        if (thUrl) {
          //get stnId from URL
          const index = thUrl.indexOf("stn=");
          const stnId = thUrl.substring(index + 4, thUrl.length);
          weather['stnId'] = stnId;
        } else {
            console.warn("No URL found for this row");
        }
        i++;
        let stnName = $(this).children("th").text();
        stnName = stnName === "백령도" ? "백령" : stnName;
        weather['stnName'] = stnName;
        i++;

        $(this).children("td").filter(function () {
          var val = 0;
          var tdText = $(this).text().replace(/\s+/, "");
          tdText = tdText.replace(/(\r\n|\n|\r)/gm, "");
          tdText = tdText.replace(/\s+/, "");

          // console.log(`propertyName[i]: ${propertyName[i]}, tdText: ${tdText}`);

          if (
            propertyName[i] === "visibility" ||
            propertyName[i] === "cloud" ||
            propertyName[i] === "heavyCloud" ||
            propertyName[i] === "dspls" ||
            propertyName[i] === "reh"
          ) {
            val = parseInt(tdText);
            if (!isNaN(val)) {
              weather[propertyName[i]] = val;
            }
          } else if (
            propertyName[i] === "t1h" ||
            propertyName[i] === "sensoryTem" ||
            propertyName[i] === "dpt" ||
            propertyName[i] === "r1d" ||
            propertyName[i] === "s1d" ||
            propertyName[i] === "wsd" ||
            propertyName[i] === "hPa"
          ) {
            val = parseFloat(tdText);
            if (!isNaN(val)) {
              weather[propertyName[i]] = val;
            }
          } else if (propertyName[i] === "wsd2") {
            //tdText = writeWindSpeed('8.1',false,'', '', 1);
            //parsing for get 8.1
            const match = tdText.match(/writeWindSpeed\('(\d+\.\d+)',false,'', '', 1\)/);
            if (match) {
              weather['wsd'] = parseFloat(match[1]);
            }
          } else if (propertyName[i] === "wdd") {
            weather[propertyName[i]] = tdText
              .replace(/동/g, "E")
              .replace(/서/g, "W")
              .replace(/남/g, "S")
              .replace(/북/g, "N")
              .replace(/정온/g, "");
          } else {
            //weather(현재일기)가 없는 경우도 특이사항없다는 정보임
            //DB상에서는 city weather stn만이 weather값을 가짐
            weather[propertyName[i]] = tdText;
          }
          i++;
        });

        weather.pubDate = cityWeather.pubDate;
        weather.date = moment(cityWeather.pubDate, "YYYY.MM.DD.HH:00", "Asia/Seoul");

        if (weather.stnName === '제주') {
          console.info(`weather: ${JSON.stringify(weather)}`);
        }

        if (weather.stnId) {
          //console.info(JSON.stringify(weather));
          cityWeather.cityList.push(weather);
        }
      });

      return cityWeather.cityList;
    }

    /**
     * 
     * @param {object} params 
     * @param {string} [params.datetime] 
     * @returns 
     */
    async getCityWeather(params) {
        let tm;
        if (params?.datetime) {
            tm = moment(params?.datetime, 'YYYYMMDDHHmm', "Asia/Seoul").format('YYYY.MM.DD.HH:00');
        }
        else {
          tm = moment().tz('Asia/Seoul').format('YYYY.MM.DD.HH:00');
        }
        this.cityWeatherKey = `kma-scraper/cityweather/${tm}`;

        if (this.cityWeatherList) {
          return {statusCode: 200, body: this.cityWeatherList};
        }
        else {
          const scrapData = await this._loadFromS3(this.cityWeatherKey);
          if (scrapData) {
            this.cityWeatherList = scrapData;
            return {statusCode: 200, body: scrapData};
          }
        }


        //example: https://www.weather.go.kr/w/observation/land/city-obs.do?tm=2025.07.22.05:00
        let url = this.domain + '/w/observation/land/city-obs.do';
        url += `?tm=${tm}`;
        console.info(`url: ${url}`);

        const response = await axios.get(url, {responseEncoding: 'binary', responseType: 'arraybuffer'});
        const body = response.data;

        let result = {statusCode: 200, body: ''};

        if(body === undefined || body === null) {
            result.statusCode = 500;
            result.body = 'Fail to get city weather data.';
            return result;
        }

        try {
            const strContents = iconv.decode(body, 'utf-8').toString();
            let $ = cheerio.load(strContents);

            this.cityWeatherList = this.#parseCityWeather($, tm);
            await this._saveToS3(this.cityWeatherKey, this.cityWeatherList);
            result.body = this.cityWeatherList;
        }
        catch(e) {
            console.error(e);
            result.statusCode = 500;
            result.body = 'Fail to parse city weather data.';
        }

        return result;
    }

    async getASOSbyStnList(datetime, stnId) {
    }

    //get city weather by city name or near geocoordinate
    async getCityWeatherByCityName(datetime, cityName) {
    }

    async #makeStnInfoList() {
      console.log('********* makeStnInfoList *********');

      const now = moment().tz('Asia/Seoul');
      this.stnInfoKey = `kma-scraper/stnInfo/${now.format('YYYYMM')}`;
      if (this.stnInfoList) {
        return this.stnInfoList;
      }
      else {
        const scrapData = await this._loadFromS3(this.stnInfoKey);
        if (scrapData) {
          this.stnInfoList = scrapData;
          return this.stnInfoList;
        }
      }

      let latestAsosList;
      if (this.asosList) {
        latestAsosList = this.asosList;
      }
      else {
        let lastestAsosKey = await this._latestS3Object('kma-scraper/asos/'+now.format('YYYYMM'));
        if (lastestAsosKey) {
          lastestAsosKey = lastestAsosKey.replace('.ndjson', '');
          latestAsosList = await this._loadFromS3(lastestAsosKey);
          this.asosList = latestAsosList;
        }
      }

      if (!latestAsosList) {
        console.info('There is no ASOS data in S3.');
        await this.getASOS();
        latestAsosList = this.asosList;
      }

      console.log(`latestAsosList: ${latestAsosList.length}`);
      // console.log(`latestAsosList: ${JSON.stringify(latestAsosList[0], null, 2)}`);

      let latestCityWeatherList;
      if (this.cityWeatherList) {
        latestCityWeatherList = this.cityWeatherList;
      }
      else {
        let latestCityWeatherKey = await this._latestS3Object('kma-scraper/cityWeather/'+now.format('YYYY.MM'));
        if (latestCityWeatherKey) {
          latestCityWeatherKey = latestCityWeatherKey.replace('.ndjson', '');
          latestCityWeatherList = await this._loadFromS3(latestCityWeatherKey);
          this.cityWeatherList = latestCityWeatherList;
        }
      }
      if (!latestCityWeatherList) {
        console.info('There is no city weather data in S3.');
        await this.getCityWeather();
        latestCityWeatherList = this.cityWeatherList;
      }
      console.log(`latestCityWeatherList: ${latestCityWeatherList.length}`);
      // console.log(`latestCityWeatherList: ${JSON.stringify(latestCityWeatherList[0], null, 2)}`);

      //mark asos is city weather stn in asosList
      for (let i = 0; i < latestAsosList.length; i++) {
        for (let j = 0; j < latestCityWeatherList.length; j++) {
          if (latestAsosList[i].stnId === latestCityWeatherList[j].stnId) {
            latestAsosList[i].isCityWeather = true;
            break;
          }
        }
        if (!latestAsosList[i].isCityWeather) {
          latestAsosList[i].isCityWeather = false;
        }
      }

      let kakaoApi = new KakaoApi();
      // await Promise.all(latestAsosList.map(async (asos) => {
      //   asos.geoInfo = await kakaoApi.byAddress(asos.addr);
      // }));
      for (const asos of latestAsosList) {
        asos.geoInfo = await kakaoApi.byAddress(asos.addr);
        //sleep 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(`latestAsosList: ${JSON.stringify(latestAsosList[0], null, 2)}`);
      //stnId, stnName, isCityWeather, addr, region_1depth_name, region_2depth_name, region_3depth_name, x, y
      let optAsosList = latestAsosList.map(asos => {
        return {
          stnId: asos.stnId,
          stnName: asos.stnName,
          isCityWeather: asos.isCityWeather,
          addr: asos.addr,
          region_1depth_name: asos.geoInfo[0].address.region_1depth_name,
          region_2depth_name: asos.geoInfo[0].address.region_2depth_name,
          region_3depth_name: asos.geoInfo[0].address.region_3depth_name,
          x: asos.geoInfo[0].x,
          y: asos.geoInfo[0].y
        }
      });

      this.stnInfoList = optAsosList;
      await this._saveToS3(this.stnInfoKey, this.stnInfoList);
      return this.stnInfoList;
    }

    async #getStnInfoList() {
      const now = moment().tz('Asia/Seoul');
      this.stnInfoKey = `kma-scraper/stnInfo/${now.format('YYYYMM')}`;
      const scrapData = await this._loadFromS3(this.stnInfoKey);
      if (scrapData) {
        this.stnInfoList = scrapData;
        console.log(`load from S3: length: ${this.stnInfoList.length}, key: ${this.stnInfoKey}`);
        return this.stnInfoList;
      }
      return null;
    }

    /**
     * get stninfo near geocoordinate 3 stations 
     * @param {object} locInfo 
     * @param {number} locInfo.lat
     * @param {number} locInfo.lon
     * @param {string} [locInfo.reg_1depth_name]
     * @param {string} [locInfo.reg_2depth_name]
     * @returns {object[]} nearStnList
     */
    async getNearStnList(locInfo) {
      let nearStnList = null;

      if (!this.stnInfoList) {
        this.stnInfoList = await this.#getStnInfoList();
        if (!this.stnInfoList) {
          await this.#makeStnInfoList();
          this.stnInfoList = await this.#getStnInfoList();
        }
      }
      console.log(`this.stnInfoList[0]: ${JSON.stringify(this.stnInfoList[0], null, 2)}`);

      if (locInfo) {
        if (locInfo.reg_1depth_name) {
          nearStnList = this.stnInfoList.filter(stn => stn.region_1depth_name === locInfo.reg_1depth_name);
          if (locInfo.reg_2depth_name && nearStnList.length > 0) {
            nearStnList = nearStnList.filter(stn => stn.region_2depth_name === locInfo.reg_2depth_name);
          }
          nearStnList = nearStnList.slice(0, 3);
          return nearStnList;
        }

        if (locInfo.lat && locInfo.lon) {
          const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const toRad = (value) => (value * Math.PI) / 180;
            const R = 6371; // Radius of the Earth in km
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in km
          };

          //가장 가까운 station 3개 찾는데, 그중에 city weather stn이 있으면 그것을 0번으로 변경해서 전달
          nearStnList = this.stnInfoList
            .map(stn => ({
              ...stn,
              distance: calculateDistance(locInfo.lat, locInfo.lon, parseFloat(stn.y), parseFloat(stn.x))
            }))
            .sort((a, b) => a.distance - b.distance);

          if (nearStnList.length > 0) {
            for (let i = 0; i < nearStnList.length; i++) {
              if (nearStnList[i].isCityWeather) {
                let temp = nearStnList[0];
                nearStnList[0] = nearStnList[i];
                nearStnList[i] = temp;
                break;
              }
            }
          }
          nearStnList = nearStnList.slice(0, 3);
          return nearStnList;
        }

        console.warn('lat and lon or reg_1depth_name and reg_2depth_name are required');
      }
      else {
        console.warn('locInfo(queryStringParameters) is null');
      }

      return nearStnList;
    }
}