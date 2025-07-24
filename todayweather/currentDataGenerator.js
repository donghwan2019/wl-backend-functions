import moment from "moment-timezone";

/**
 * CurrentDataGenerator - Handles generation of current weather data
 * Combines multiple data sources to create unified current weather information
 */
export class CurrentDataGenerator {
  /**
   * Convert and combine current weather data from multiple sources
   * Prioritizes data sources: asosData > ultraSrtNcst > cityWeatherData > srtFcst > vilFcst
   * 
   * @param {Array} cityWeatherData - Web scraped city weather data
   * @param {Array} asosData - ASOS weather station data  
   * @param {Object} ultraSrtNcst - Ultra short-term current conditions
   * @param {Array} ultraSrtFcst - Ultra short-term forecast items
   * @param {Array} vilageFcst - Village forecast items
   * @param {Array} yesterdayCityWeatherData - Yesterday's weather for comparison
   * @returns {Object} Current weather data object
   */
  convertCurrentData(cityWeatherData, asosData, ultraSrtNcst, ultraSrtFcst, vilageFcst, yesterdayCityWeatherData) {
    let fcstDateStr = moment(asosData[0].pubDate, "YYYY.MM.DD.HH:mm").format("YYYYMMDD");
    let fcstTimeStr = moment(asosData[0].pubDate, "YYYY.MM.DD.HH:mm").format("HH");
    let srtFcst = ultraSrtFcst.filter((item) => item.fcstDateStr === fcstDateStr && item.fcstTimeStr === fcstTimeStr)[0];
    let vilFcst = vilageFcst.filter((item) => item.fcstDateStr === fcstDateStr && item.fcstTimeStr === fcstTimeStr)[0];

    yesterdayCityWeatherData.sky = Math.min(Math.floor(yesterdayCityWeatherData.cloud/2.5), 3)+1;

    //TODO pty
    //ultraSrtNcst가 1순위
    //asosData[0].rs15m > 0 ? 비나 눈이 오는 중
    // cityWeatherData[0].weather에 '비', '눈'이 포함되어 있으면 비나 눈이 오는 중
    //srtFcst.pty가 3순위

    let result = {
      //convert format of asosData to YYYYMMDD
      date: fcstDateStr,
      time: fcstTimeStr,
      dateObj: moment(asosData[0].pubDate, "YYYY.MM.DD.HH:mm").format("YYYY.MM.DD HH:mm"),
      t1h: asosData[0]?.t1h || ultraSrtNcst?.t1h || cityWeatherData[0]?.t1h || srtFcst?.t1h || vilFcst?.tmp,
      rn1: asosData[0].rs1h || ultraSrtNcst?.rn1,
      sky: Math.min(Math.floor(cityWeatherData[0].cloud/2.5), 3)+1 || srtFcst?.sky || vilFcst?.sky,
      uuu: ultraSrtNcst?.uuu || srtFcst?.uuu || vilFcst?.uuu,
      vvv: ultraSrtNcst?.vvv || srtFcst?.vvv || vilFcst?.vvv,
      reh: asosData[0].reh || ultraSrtNcst?.reh || cityWeatherData[0].reh || srtFcst?.reh || vilFcst?.reh,
      pty: ultraSrtNcst?.pty || asosData[0].rs15m > 0 ? 1 : 0,
      vec: ultraSrtNcst?.vec || srtFcst?.vec || vilFcst?.vec,
      wsd: ultraSrtNcst?.wsd || srtFcst?.wsd || vilFcst?.wsd,
      sensorytem: cityWeatherData[0].dpt,
      // dspls:
      // dsplsGrade:
      // dsplsStr:
      // decpsn:
      // decpsnGrade:
      // decpsnStr:
      // heatIndex:
      // heatIndexGrade:
      // heatIndexStr:
      // frostGrade:
      // frostStr:
      // night:
      // skyIcon:
      yesterday: yesterdayCityWeatherData[0],
      // dateObj:
      // todayIndex:
      // wsdGrade:
      // wsdStr:
    };

    // Generate summaries after result object is complete
    result.summaryWeather = this.#_makeSummaryWeather(result, yesterdayCityWeatherData[0]);
    result.summary = this.#_makeSummary(result, yesterdayCityWeatherData[0]);

    // console.log(`convert current data: ${JSON.stringify(result, null, 2)}`);
    return result;
  }

  /**
   * Generate weather items for summary
   * @param {Object} current - Current weather data
   * @param {Object} yesterday - Yesterday weather data
   * @returns {Array} Array of weather summary items
   * @private
   */
  #_getWeatherSummaryItems(current, yesterday) {
    const itemList = [];
    let str = "";
    let tmpGrade;

    // Temperature difference from yesterday
    if (current.hasOwnProperty('t1h') && yesterday && yesterday.hasOwnProperty('t1h')) {
      const tempDiffObj = this.#_getDiffTodayYesterday(current, yesterday);
      if (tempDiffObj.grade <= 2) {
        tempDiffObj.grade = 2.5;
      }
      itemList.push({ str: tempDiffObj.str, grade: tempDiffObj.grade });
    }

    // Weather type information
    if (current.hasOwnProperty('weatherType')) {
      tmpGrade = 2.5;
      if (current.weatherType > 3) {
        tmpGrade = 3;
      }
      itemList.push({ str: current.weather || '', grade: tmpGrade });
    }

    // Special weather information (highest priority)
    if (current.hasOwnProperty('specialInfo') && current.specialInfo.length > 0) {
      const obj = current.specialInfo[0];
      itemList.push({ 
        str: (obj.weatherStr || '') + (obj.levelStr || ''), 
        grade: (obj.weather || 0) + 5 
      });
    }

    // Precipitation information
    if (current.rn1 && current.pty) {
      let ptyStr = "";
      switch (current.pty) {
        case 1:
          ptyStr = "비";
          break;
        case 2:
          ptyStr = "비/눈";
          break;
        case 3:
          ptyStr = "눈";
          break;
        default:
          ptyStr = "";
      }

      const precipStr = ptyStr + " " + current.rn1 + 'mm';
      itemList.push({ str: precipStr, grade: current.rn1 + 3 });
    }

    // Discomfort index (only when temperature >= 20°C)
    if (current.dsplsGrade && current.t1h >= 20) {
      str = "불쾌지수 " + (current.dsplsStr || '');
      itemList.push({ str: str, grade: current.dsplsGrade });
    }

    // Sensory temperature (feels like)
    if (current.sensorytem && current.sensorytem !== current.t1h) {
      const diffTemp = Math.round(current.sensorytem - current.t1h);
      str = "체감온도 " + current.sensorytem + "°";
      itemList.push({ str: str, grade: Math.abs(diffTemp) });
    }

    // UV index (only before 3 PM)
    const time = typeof current.time === 'string' ? Number(current.time) / 100 : current.time;
    if (current.ultrv && time <= 15) {
      tmpGrade = current.ultrvGrade;
      if (time >= 11) {
        tmpGrade++;
      }
      str = "자외선 " + (current.ultrvStr || '');
      itemList.push({ str: str, grade: tmpGrade });
    }

    // Wind speed
    if (current.wsdGrade && current.wsdStr) {
      // Add 1 to grade (treat "weak" as "normal")
      itemList.push({ str: current.wsdStr, grade: current.wsdGrade + 1 });
    }

    return itemList;
  }

  /**
   * Generate air quality items for summary
   * @param {Object} current - Current weather data
   * @returns {Array} Array of air quality summary items
   * @private
   */
  #_getAirQualitySummaryItems(current) {
    const itemList = [];
    let str = "";
    let tmpGrade = 0;

    // Air quality information (PM2.5, PM10, AQI)
    const airInfo = current.arpltn || current;
    airInfo.aqiGrade = airInfo.khaiGrade || airInfo.aqiGrade;
    airInfo.aqiStr = airInfo.khaiStr || airInfo.aqiStr;

    if (airInfo.pm25Grade) {
      tmpGrade = airInfo.pm25Grade;
      str = "미세먼지 " + (airInfo.pm25Str || '');
    }
    if (airInfo.pm10Grade && tmpGrade < airInfo.pm10Grade) {
      tmpGrade = airInfo.pm10Grade;
      str = "미세먼지 " + (airInfo.pm10Str || '');
    }
    if (airInfo.aqiGrade && tmpGrade < airInfo.aqiGrade) {
      tmpGrade = airInfo.aqiGrade;
      str = "대기질 " + (airInfo.aqiStr || '');
    }

    if (tmpGrade > 0) {
      itemList.push({ str: str, grade: tmpGrade });
    }

    return itemList;
  }

  /**
   * Format summary string from item list
   * @param {Array} itemList - Array of summary items
   * @param {string} logContext - Context for logging
   * @returns {string} Formatted summary string
   * @private
   */
  #_formatSummaryString(itemList, logContext = 'Summary') {
    // Sort by grade (descending - highest priority first)
    itemList.sort((a, b) => b.grade - a.grade);

    console.log(`${logContext} items:`, JSON.stringify(itemList));

    // Return summary string
    if (itemList.length === 0) {
      console.error(`Failed to make ${logContext.toLowerCase()}`);
      return "";
    } else if (itemList.length > 1) {
      return itemList[0].str + ", " + itemList[1].str;
    } else {
      return itemList[0].str;
    }
  }

  /**
   * Generate comprehensive summary from current and yesterday data
   * Includes both weather and air quality information
   * 
   * @param {Object} current - Current weather data
   * @param {Object} yesterday - Yesterday weather data  
   * @returns {string} Complete summary string
   * @private
   */
  #_makeSummary(current, yesterday) {
    const weatherItems = this.#_getWeatherSummaryItems(current, yesterday);
    const airQualityItems = this.#_getAirQualitySummaryItems(current);
    
    const allItems = [...weatherItems, ...airQualityItems];
    return this.#_formatSummaryString(allItems, 'Summary');
  }

  /**
   * Generate weather-only summary from current and yesterday data
   * Adapted from controllerTown24h.js makeSummaryWeather method
   * 
   * @param {Object} current - Current weather data
   * @param {Object} yesterday - Yesterday weather data
   * @returns {string} Weather summary string
   * @private
   */
  #_makeSummaryWeather(current, yesterday) {
    const weatherItems = this.#_getWeatherSummaryItems(current, yesterday);
    return this.#_formatSummaryString(weatherItems, 'Weather Summary');
  }

  /**
   * Calculate temperature difference between today and yesterday
   * 
   * @param {Object} current - Current weather data
   * @param {Object} yesterday - Yesterday weather data
   * @returns {Object} Object with str and grade properties
   * @private
   */
  #_getDiffTodayYesterday(current, yesterday) {
    const strSameAsYesterday = "어제와 비슷함";
    const strThanYesterday = "어제보다 %s도";

    let str = "";
    let diffTemp = 0;
    let grade = 0;

    if (current.t1h !== undefined && yesterday && yesterday.t1h !== undefined) {
      diffTemp = current.t1h - yesterday.t1h;
      grade = Math.round(Math.abs(diffTemp));
      diffTemp = Math.round(diffTemp);

      if (diffTemp === 0) {
        str += strSameAsYesterday;
      } else {
        const tempStr = diffTemp > 0 ? '+' + diffTemp : '' + diffTemp;
        str += strThanYesterday.replace('%s', tempStr);
      }
    }

    return { str: str, grade: grade };
  }
}