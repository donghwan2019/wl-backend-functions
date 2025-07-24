# Data Models Documentation
## Weather Labs Backend Functions

### Table of Contents
1. [Overview](#overview)
2. [Input Data Models](#input-data-models)
3. [External API Response Models](#external-api-response-models)
4. [Internal Data Transformation Models](#internal-data-transformation-models)
5. [Unified Response Models](#unified-response-models)
6. [Geographic Data Models](#geographic-data-models)
7. [Storage Models](#storage-models)
8. [Time-based Data Models](#time-based-data-models)
9. [Data Enhancement Models](#data-enhancement-models)
10. [Error Response Models](#error-response-models)
11. [Data Flow Architecture](#data-flow-architecture)

---

## Overview

The Weather Labs Backend Functions system processes weather and air quality data from multiple Korean government sources. This document defines the key data models used throughout the system, from input parameters to final response formats.

## Input Data Models

### Geographic Location Models

#### Coordinate-based Input
```javascript
{
  "queryStringParameters": {
    "lat": "37.5665",    // Latitude (decimal degrees, WGS84)
    "lon": "126.9780"    // Longitude (decimal degrees, WGS84)
  }
}
```

#### Address-based Input
```javascript
{
  "queryStringParameters": {
    "address": "서울특별시 중구 퇴계로 100"
  }
}
```

#### KMA Grid System (Internal Conversion)
```javascript
{
  "nx": 60,     // X-axis grid coordinate (Lambert Conformal Conic)
  "ny": 127     // Y-axis grid coordinate (Lambert Conformal Conic)
}
```

### Time-based Query Parameters

#### Standard Time Parameters
```javascript
{
  "queryStringParameters": {
    "datetime": "202506161250",    // YYYYMMDDHHmm format
    "base_date": "20221207",       // YYYYMMDD format
    "base_time": "2000"            // HHmm format (24-hour)
  }
}
```

#### Regional Parameters
```javascript
{
  "queryStringParameters": {
    "sidoName": "서울",           // City/Province name
    "umdName": "중구",            // District name
    "stationName": "종로구"       // Station name
  }
}
```

## External API Response Models

### KMA (Korea Meteorological Administration) Data Models

#### Village Forecast Response (단기예보)
```javascript
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "dataType": "JSON",
      "items": {
        "item": [
          {
            "baseDate": "20221207",
            "baseTime": "2000",
            "category": "POP",        // 강수확률 (%)
            "fcstDate": "20221207",
            "fcstTime": "2100",
            "fcstValue": "30",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "2000",
            "category": "PTY",        // 강수형태 (0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기)
            "fcstDate": "20221207",
            "fcstTime": "2100",
            "fcstValue": "0",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "2000",
            "category": "SKY",        // 하늘상태 (1=맑음, 3=구름많음, 4=흐림)
            "fcstDate": "20221207",
            "fcstTime": "2100",
            "fcstValue": "3",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "2000",
            "category": "TMP",        // 1시간 기온 (℃)
            "fcstDate": "20221207",
            "fcstTime": "2100",
            "fcstValue": "15",
            "nx": 60,
            "ny": 127
          }
        ]
      },
      "pageNo": 1,
      "numOfRows": 1000,
      "totalCount": 312
    }
  }
}
```

#### Ultra Short-term Current Conditions (초단기실황)
```javascript
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "items": {
        "item": [
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "T1H",        // 기온 (℃)
            "obsrValue": "15.2",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "RN1",        // 1시간 강수량 (mm)
            "obsrValue": "0",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "UUU",        // 동서바람성분 (m/s)
            "obsrValue": "-1.5",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "VVV",        // 남북바람성분 (m/s)
            "obsrValue": "2.3",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "REH",        // 습도 (%)
            "obsrValue": "65",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "PTY",        // 강수형태
            "obsrValue": "0",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "VEC",        // 풍향 (deg)
            "obsrValue": "220",
            "nx": 60,
            "ny": 127
          },
          {
            "baseDate": "20221207",
            "baseTime": "1500",
            "category": "WSD",        // 풍속 (m/s)
            "obsrValue": "2.8",
            "nx": 60,
            "ny": 127
          }
        ]
      }
    }
  }
}
```

#### Medium-term Forecast (중기예보)
```javascript
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "items": {
        "item": [
          {
            "regId": "11B10101",
            "rnSt3Am": 30,          // 3일후 오전 강수확률 (%)
            "rnSt3Pm": 30,          // 3일후 오후 강수확률 (%)
            "rnSt4Am": 30,          // 4일후 오전 강수확률 (%)
            "rnSt4Pm": 30,          // 4일후 오후 강수확률 (%)
            "rnSt5Am": 30,          // 5일후 오전 강수확률 (%)
            "rnSt5Pm": 30,          // 5일후 오후 강수확률 (%)
            "rnSt6Am": 30,          // 6일후 오전 강수확률 (%)
            "rnSt6Pm": 30,          // 6일후 오후 강수확률 (%)
            "rnSt7Am": 30,          // 7일후 오전 강수확률 (%)
            "rnSt7Pm": 30,          // 7일후 오후 강수확률 (%)
            "wf3Am": "구름많음",     // 3일후 오전 하늘상태
            "wf3Pm": "구름많음",     // 3일후 오후 하늘상태
            "wf4Am": "구름많음",     // 4일후 오전 하늘상태
            "wf4Pm": "구름많음",     // 4일후 오후 하늘상태
            "wf5Am": "구름많음",     // 5일후 오전 하늘상태
            "wf5Pm": "구름많음",     // 5일후 오후 하늘상태
            "wf6Am": "구름많음",     // 6일후 오전 하늘상태
            "wf6Pm": "구름많음",     // 6일후 오후 하늘상태
            "wf7Am": "구름많음",     // 7일후 오전 하늘상태
            "wf7Pm": "구름많음"      // 7일후 오후 하늘상태
          }
        ]
      }
    }
  }
}
```

### KECO (Korea Environment Corporation) Data Models

#### Real-time Air Quality Data (실시간 대기질 정보)
```javascript
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "items": [
        {
          "so2Grade": "1",              // 아황산가스 지수
          "coFlag": null,               // 일산화탄소 플래그
          "khaiValue": "45",            // 통합대기환경지수
          "so2Value": "0.005",          // 아황산가스 농도 (ppm)
          "coValue": "0.7",             // 일산화탄소 농도 (ppm)
          "pm10Flag": null,             // 미세먼지 플래그
          "pm10Value": "30",            // 미세먼지(PM10) 농도 (㎍/㎥)
          "o3Grade": "1",               // 오존 지수
          "khaiGrade": "1",             // 통합대기환경지수
          "no2Flag": null,              // 이산화질소 플래그
          "no2Grade": "1",              // 이산화질소 지수
          "o3Flag": null,               // 오존 플래그
          "so2Flag": null,              // 아황산가스 플래그
          "dataTime": "2022-12-01 04:00", // 측정일시
          "coGrade": "1",               // 일산화탄소 지수
          "no2Value": "0.032",          // 이산화질소 농도 (ppm)
          "stationName": "종로구",       // 측정소명
          "pm10Grade": "1",             // 미세먼지 지수
          "sidoName": "서울",           // 시도명
          "o3Value": "0.045",           // 오존 농도 (ppm)
          "pm25Value": "15",            // 초미세먼지(PM2.5) 농도 (㎍/㎥)
          "pm25Grade": "1",             // 초미세먼지 지수
          "pm25Flag": null,             // 초미세먼지 플래그
          "mangName": "도시대기"        // 망구분
        }
      ]
    }
  }
}
```

#### Air Quality Station List (측정소 목록)
```javascript
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "items": [
        {
          "stationName": "종로구",
          "addr": "서울 종로구 종로 169",
          "tm": 1.4,                    // 측정소와의 거리 (km)
          "dmX": "126.979",             // 측정소 경도
          "dmY": "37.572"               // 측정소 위도
        }
      ]
    }
  }
}
```

### Web Scraping Data Models

#### City Weather Data (도시별 현재날씨)
```javascript
{
  "stnId": "108",
  "stnName": "서울",
  "weather": "맑음",
  "visibility": 15,                 // 시정 (km)
  "cloud": 2,                       // 운량 (1/10)
  "heavyCloud": 0,                  // 중하운량 (1/10)
  "t1h": 15.2,                     // 현재기온 (℃)
  "dpt": 8.5,                      // 이슬점온도 (℃)
  "sensoryTem": 16.0,              // 체감온도 (℃)
  "dspls": 55,                     // 불쾌지수
  "r1d": 0.0,                      // 일강수량 (mm)
  "s1d": 0.0,                      // 적설 (cm)
  "reh": 65,                       // 습도 (%)
  "wdd": "SW",                     // 풍향
  "wsd": 2.5,                      // 풍속 (m/s)
  "hPa": 1013.2,                   // 해면기압 (hPa)
  "pubDate": "2022.12.07 15:00",   // 발표시각
  "date": "2022-12-07T15:00:00.000Z"
}
```

#### ASOS Minute Data (자동기상관측장비 분별 데이터)
```javascript
{
  "stnId": "108",
  "stnName": "서울",
  "tm": 15.2,                      // 기온 (℃)
  "hm": 65,                        // 습도 (%)
  "ws": 2.5,                       // 풍속 (m/s)
  "wd": "SW",                      // 풍향
  "pa": 1013.2,                    // 현지기압 (hPa)
  "ps": 1017.8,                    // 해면기압 (hPa)
  "rn": 0.0,                       // 강수량 (mm)
  "pubDate": "2022.12.07 15:45",   // 관측시각
  "date": "2022-12-07T15:45:00.000Z"
}
```

## Internal Data Transformation Models

### Normalized Weather Data Structure
```javascript
{
  "nx": 60,
  "ny": 127,
  "baseDate": "2022-12-07T20:00:00.000Z",
  "baseDateTimeStr": "202212072000",
  "items": [
    {
      "fcstDate": "2022-12-07T21:00:00.000Z",
      "fcstDateStr": "20221207",
      "fcstTimeStr": "2100",
      "data": [
        {
          "category": "POP",      // 강수확률 (%)
          "value": "30",
          "unit": "%"
        },
        {
          "category": "PTY",      // 강수형태
          "value": "0",
          "unit": "code",
          "description": "없음"
        },
        {
          "category": "SKY",      // 하늘상태
          "value": "3",
          "unit": "code",
          "description": "구름많음"
        },
        {
          "category": "TMP",      // 기온
          "value": "15.0",
          "unit": "℃"
        }
      ]
    }
  ]
}
```

### Normalized Current Conditions
```javascript
{
  "baseDateTime": "20221207",
  "nx": 60,
  "ny": 127,
  "t1h": 15.0,                    // 기온 (℃)
  "rn1": 0,                       // 1시간 강수량 (mm)
  "uuu": -1.5,                    // 동서바람성분 (m/s)
  "vvv": 2.3,                     // 남북바람성분 (m/s)
  "reh": 65,                      // 습도 (%)
  "pty": 0,                       // 강수형태
  "vec": 220,                     // 풍향 (deg)
  "wsd": 2.8,                     // 풍속 (m/s)
  "calculatedFields": {
    "windDirection": "남서풍",
    "windGrade": 2,
    "windDescription": "바람약함"
  }
}
```

## Unified Response Models

### Comprehensive Weather Response
```javascript
{
  "success": true,
  "timestamp": "2025-06-14T14:00:00.000Z",
  "regionName": "서울특별시",
  "cityName": "용산구",
  "townName": "이촌1동",
  "shortPubDate": "202506141400",
  "shortRssPubDate": "202506141400",
  "short": [
    {
      "date": "20250611",
      "time": 24,
      "pop": 0,                    // 강수확률 (%)
      "pty": 0,                    // 강수형태
      "r06": 0,                    // 6시간 강수량 (mm)
      "reh": 61,                   // 습도 (%)
      "s06": 0,                    // 6시간 신적설 (cm)
      "sky": 2,                    // 하늘상태
      "t3h": 20.4,                 // 3시간 기온 (℃)
      "tmn": 20.4,                 // 최저기온 (℃)
      "tmx": 20.4,                 // 최고기온 (℃)
      "uuu": -1,                   // 동서바람성분 (m/s)
      "vvv": -1,                   // 남북바람성분 (m/s)
      "wav": -999,                 // 파고 (m)
      "vec": 218,                  // 풍향 (deg)
      "wsd": 1.1,                  // 풍속 (m/s)
      "rn1": 0,                    // 1시간 강수량 (mm)
      "lgt": 0,                    // 낙뢰 (kA)
      "sensorytem": 20,            // 체감온도 (℃)
      "dspls": 66,                 // 불쾌지수
      "dsplsGrade": 0,             // 불쾌지수 등급
      "dsplsStr": "낮음",           // 불쾌지수 문자열
      "decpsn": 0,                 // 건조도
      "decpsnGrade": 0,            // 건조도 등급
      "decpsnStr": "낮음",          // 건조도 문자열
      "heatIndex": 20.4,           // 열지수 (℃)
      "heatIndexGrade": 0,         // 열지수 등급
      "heatIndexStr": "낮음",       // 열지수 문자열
      "frostGrade": 0,             // 서리 등급
      "frostStr": "낮음",           // 서리 문자열
      "night": true,               // 밤 여부
      "skyIcon": "MoonSmallCloud", // 하늘상태 아이콘
      "dateObj": "2025.06.11 24:00", // 날짜 객체
      "fromToday": -2,             // 오늘로부터 일수
      "wsdGrade": 1,               // 바람세기 등급
      "wsdStr": "바람약함"          // 바람세기 문자열
    }
  ],
  "current": {
    "date": "20250614",
    "time": 15,
    "t1h": 30.2,                  // 현재기온 (℃)
    "rn1": 0,                     // 1시간 강수량 (mm)
    "sky": 3,                     // 하늘상태
    "uuu": -0.3,                  // 동서바람성분 (m/s)
    "vvv": 2,                     // 남북바람성분 (m/s)
    "reh": 48,                    // 습도 (%)
    "pty": 0,                     // 강수형태
    "vec": 169,                   // 풍향 (deg)
    "wsd": 2,                     // 풍속 (m/s)
    "sensorytem": 31,             // 체감온도 (℃)
    "dspls": 78,                  // 불쾌지수
    "dsplsGrade": 2,              // 불쾌지수 등급
    "dsplsStr": "높음",            // 불쾌지수 문자열
    "yesterday": {
      "date": "20250613",
      "time": 15,
      "t1h": 27.2,
      "rn1": 0,
      "sky": 4,
      "uuu": 1.1,
      "vvv": 0.7,
      "reh": 46,
      "pty": 0,
      "vec": 238,
      "wsd": 1.3
    },
    "summaryWeather": "어제보다 +3˚, 불쾌지수 높음",
    "summaryAir": "대기상태는 보통입니다",
    "summary": "어제보다 +3˚, 불쾌지수 높음"
  },
  "midData": {
    "forecast": {
      "date": "20250614",
      "time": "0600",
      "cnt": 0,
      "wfsv": "강수 및 기온 관련 중기예보 텍스트"
    },
    "dailyData": [
      {
        "date": "20250407",
        "wfAm": "맑음",
        "wfPm": "맑음",
        "reliability": "",
        "skyAm": "Sun",
        "ptyAm": 0,
        "lgtAm": 0,
        "skyPm": "Sun",
        "ptyPm": 0,
        "lgtPm": 0,
        "sky": 1,
        "pty": 0,
        "lgt": 0,
        "skyIcon": "Sun",
        "dateObj": "2025.04.07 00:00",
        "tmx": 18,
        "tmn": 6,
        "fromToday": -68,
        "dayOfWeek": 1
      }
    ]
  },
  "airInfo": {
    "source": "airkorea",
    "stationName": "종로구",
    "dataTime": "2025-06-14T14:00:00.000Z",
    "pm25Value": 15,
    "pm25Grade": 1,
    "pm25GradeStr": "좋음",
    "pm10Value": 30,
    "pm10Grade": 1,
    "pm10GradeStr": "좋음",
    "o3Value": 0.045,
    "o3Grade": 1,
    "o3GradeStr": "좋음",
    "no2Value": 0.032,
    "no2Grade": 1,
    "no2GradeStr": "좋음",
    "coValue": 0.7,
    "coGrade": 1,
    "coGradeStr": "좋음",
    "so2Value": 0.005,
    "so2Grade": 1,
    "so2GradeStr": "좋음",
    "khaiValue": 45,
    "khaiGrade": 1,
    "khaiGradeStr": "좋음"
  },
  "source": "KMA",
  "units": {
    "temperatureUnit": "C",
    "windSpeedUnit": "m/s",
    "pressureUnit": "hPa",
    "distanceUnit": "km",
    "precipitationUnit": "mm",
    "airUnit": "airkorea"
  },
  "location": {
    "lat": 37.518,
    "long": 126.975,
    "address": "서울특별시 용산구 이촌1동",
    "region": {
      "depth1": "서울특별시",
      "depth2": "용산구",
      "depth3": "이촌1동"
    }
  }
}
```

## Geographic Data Models

### Administrative Division Model
```javascript
{
  "region_1depth_name": "서울특별시",      // 시/도 (City/Province)
  "region_2depth_name": "중구",           // 구/시/군 (District/City/County)
  "region_3depth_name": "을지로동",       // 읍/면/동 (Town/Village/Neighborhood)
  "address_name": "서울 중구 을지로",
  "x": "126.991154",                      // 경도 (Longitude)
  "y": "37.566826",                       // 위도 (Latitude)
  "road_address": {
    "address_name": "서울 중구 을지로 281",
    "region_1depth_name": "서울특별시",
    "region_2depth_name": "중구",
    "region_3depth_name": "을지로동",
    "road_name": "을지로",
    "underground_yn": "N",
    "main_building_no": "281",
    "sub_building_no": "",
    "building_name": "",
    "zone_no": "04564"
  }
}
```

### Weather Station Information Model
```javascript
{
  "stnId": "108",
  "stnName": "서울",
  "stnEn": "Seoul",
  "isCityWeather": true,
  "isAsos": true,
  "isAws": false,
  "addr": "서울특별시 중구 태평로1가 25",
  "region_1depth_name": "서울특별시",
  "region_2depth_name": "중구",
  "region_3depth_name": "태평로1가",
  "x": "126.966",                         // 경도
  "y": "37.571",                          // 위도
  "distance": 1.2,                        // 요청 지점으로부터의 거리 (km)
  "altitude": 85.8,                       // 해발고도 (m)
  "isActive": true,                       // 운영 여부
  "observationItems": [
    "기온", "습도", "풍향", "풍속", "기압", "강수량", "일조", "적설"
  ]
}
```

### Coordinate Conversion Model
```javascript
{
  "input": {
    "lat": 37.5665,                       // WGS84 위도
    "lon": 126.9780                       // WGS84 경도
  },
  "kmaGrid": {
    "nx": 60,                             // Lambert Conformal Conic X
    "ny": 127                             // Lambert Conformal Conic Y
  },
  "utm": {
    "zone": "52N",
    "x": 323394.123,
    "y": 4161690.456
  },
  "conversionParams": {
    "proj": "lcc",                        // Lambert Conformal Conic
    "lat_1": 30,                          // Standard parallel 1
    "lat_2": 60,                          // Standard parallel 2
    "lat_0": 38,                          // Origin latitude
    "lon_0": 126,                         // Origin longitude
    "x_0": 210000,                        // False easting
    "y_0": 600000,                        // False northing
    "ellps": "bessel",                    // Bessel ellipsoid
    "units": "m"
  }
}
```

## Storage Models

### S3 Cache Structure (NDJSON Format)
```javascript
// File: s3://weather-bucket/kma-scraper/cityweather/2022.12.07.15:00
{"stnId": "108", "stnName": "서울", "t1h": 15.2, "reh": 65, "wsd": 2.5, "pubDate": "2022-12-07T15:00:00.000Z"}
{"stnId": "109", "stnName": "인천", "t1h": 14.8, "reh": 67, "wsd": 3.2, "pubDate": "2022-12-07T15:00:00.000Z"}
{"stnId": "143", "stnName": "대구", "t1h": 12.5, "reh": 70, "wsd": 1.8, "pubDate": "2022-12-07T15:00:00.000Z"}
```

### Cache Key Strategy
```javascript
{
  "kmaData": {
    "vilageFcst": "kma/{base_date}{base_time}_{nx}_{ny}_vilageFcst",
    "ultraSrtNcst": "kma/{base_date}{base_time}_{nx}_{ny}_ultraSrtNcst",
    "ultraSrtFcst": "kma/{base_date}{base_time}_{nx}_{ny}_ultraSrtFcst",
    "midFcst": "kma/{base_date}{base_time}_{regId}_midFcst"
  },
  "kecoData": {
    "airQuality": "keco/{base_date}{base_time}_{sidoName}_ctprvnRltmMesureDnsty",
    "dustForecast": "keco/{base_date}{base_time}_{searchDate}_minudustfrcstdspth"
  },
  "scrapedData": {
    "cityWeather": "kma-scraper/cityweather/{YYYY.MM.DD.HH:mm}",
    "asosMin": "kma-scraper/asosmin/{YYYYMMDDHHmm}",
    "nearStnList": "kma-scraper/stnInfo/{YYYYMM}"
  }
}
```

### Metadata Structure
```javascript
{
  "cacheMetadata": {
    "key": "kma/202212072000_60_127_vilageFcst",
    "createdAt": "2022-12-07T20:05:00.000Z",
    "expiresAt": "2022-12-07T23:05:00.000Z",
    "size": 15420,
    "contentType": "application/json",
    "source": "KMA",
    "version": "1.0",
    "checksum": "sha256:abcd1234efgh5678...",
    "requestParams": {
      "nx": 60,
      "ny": 127,
      "base_date": "20221207",
      "base_time": "2000"
    }
  },
  "data": {
    // ... actual weather data
  }
}
```

## Time-based Data Models

### Time Format Standards
```javascript
{
  "formats": {
    "display": "2022.12.07 15:00",           // 화면 표시용
    "iso8601": "2022-12-07T15:00:00.000Z",   // ISO 8601 표준
    "compact": "202212071500",               // 압축 형식
    "dateOnly": "20221207",                  // 날짜만
    "timeOnly": "1500",                      // 시간만
    "query": "202212071500",                 // 쿼리 파라미터용
    "korean": "2022년 12월 7일 오후 3시",     // 한국어 표시
    "relative": "2시간 전",                   // 상대적 시간
    "dayOfWeek": "수요일"                    // 요일
  },
  "timezone": "Asia/Seoul",
  "offset": "+09:00"
}
```

### Data Update Schedule Model
```javascript
{
  "updateSchedule": {
    "vilageFcst": {
      "interval": "3 hours",
      "times": ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"],
      "delay": "10 minutes",
      "description": "단기예보 - 3시간마다 업데이트"
    },
    "ultraSrtNcst": {
      "interval": "10 minutes",
      "times": "every 10 minutes",
      "delay": "5 minutes",
      "description": "초단기실황 - 10분마다 업데이트"
    },
    "ultraSrtFcst": {
      "interval": "30 minutes",
      "times": "every 30 minutes",
      "delay": "5 minutes",
      "description": "초단기예보 - 30분마다 업데이트"
    },
    "airQuality": {
      "interval": "1 hour",
      "times": "every hour",
      "delay": "10 minutes",
      "description": "실시간 대기질 - 1시간마다 업데이트"
    },
    "scraping": {
      "interval": "5 minutes",
      "times": "every 5 minutes",
      "delay": "2 minutes",
      "description": "웹스크래핑 - 5분마다 업데이트"
    }
  }
}
```

## Data Enhancement Models

### Calculated Weather Fields
```javascript
{
  "enhancedWeatherData": {
    "basic": {
      "temperature": 25.5,
      "humidity": 65,
      "windSpeed": 3.2,
      "windDirection": 220
    },
    "calculated": {
      "heatIndex": 27.8,                   // 열지수 (℃)
      "heatIndexGrade": 1,                 // 열지수 등급 (0=낮음, 1=보통, 2=높음, 3=매우높음)
      "heatIndexStr": "보통",               // 열지수 문자열
      "windChill": 24.2,                   // 체감온도 (℃)
      "dewPoint": 18.3,                    // 이슬점 (℃)
      "discomfortIndex": 72,               // 불쾌지수
      "discomfortGrade": 2,                // 불쾌지수 등급
      "discomfortStr": "높음",              // 불쾌지수 문자열
      "dryness": 35,                       // 건조도
      "drynessGrade": 0,                   // 건조도 등급
      "drynessStr": "낮음",                 // 건조도 문자열
      "frostRisk": 0,                      // 서리 위험도
      "frostGrade": 0,                     // 서리 등급
      "frostStr": "없음",                   // 서리 문자열
      "uvIndex": 7,                        // 자외선 지수
      "uvGrade": 2,                        // 자외선 등급
      "uvStr": "보통",                      // 자외선 문자열
      "windGrade": 2,                      // 바람 등급
      "windStr": "바람약함",                // 바람 문자열
      "windDirectionStr": "남서풍",         // 풍향 문자열
      "weatherGrade": 1,                   // 종합 날씨 등급
      "weatherStr": "좋음"                  // 종합 날씨 문자열
    }
  }
}
```

### Sky Condition Mapping
```javascript
{
  "skyConditions": {
    "codes": {
      "1": {
        "name": "맑음",
        "icon": "Sun",
        "nightIcon": "Moon",
        "description": "구름량 0~2할"
      },
      "3": {
        "name": "구름많음",
        "icon": "CloudySun",
        "nightIcon": "CloudyMoon",
        "description": "구름량 3~8할"
      },
      "4": {
        "name": "흐림",
        "icon": "Cloudy",
        "nightIcon": "Cloudy",
        "description": "구름량 9~10할"
      }
    },
    "precipitation": {
      "0": "없음",
      "1": "비",
      "2": "비/눈",
      "3": "눈",
      "4": "소나기",
      "5": "빗방울",
      "6": "빗방울/눈날림",
      "7": "눈날림"
    }
  }
}
```

## Error Response Models

### Standard Error Response
```javascript
{
  "success": false,
  "error": {
    "code": "UPSTREAM_API_ERROR",
    "message": "Failed to fetch data from KMA API",
    "details": "Connection timeout after 10 seconds",
    "timestamp": "2022-12-07T15:00:00.000Z",
    "requestId": "req-12345-abcde",
    "retryable": true
  },
  "meta": {
    "service": "vilageFcst",
    "version": "1.0",
    "executionTime": "5.2s",
    "region": "ap-northeast-2"
  }
}
```

### Error Code Classification
```javascript
{
  "errorCodes": {
    "UPSTREAM_API_ERROR": {
      "description": "External API failure",
      "retryable": true,
      "severity": "high"
    },
    "VALIDATION_ERROR": {
      "description": "Invalid input parameters",
      "retryable": false,
      "severity": "medium"
    },
    "TIMEOUT_ERROR": {
      "description": "Request timeout exceeded",
      "retryable": true,
      "severity": "high"
    },
    "RATE_LIMIT_ERROR": {
      "description": "Rate limit exceeded",
      "retryable": true,
      "severity": "medium"
    },
    "INTERNAL_ERROR": {
      "description": "Server internal error",
      "retryable": true,
      "severity": "critical"
    },
    "CACHE_ERROR": {
      "description": "Cache operation failed",
      "retryable": true,
      "severity": "low"
    },
    "PARSING_ERROR": {
      "description": "Data parsing failed",
      "retryable": false,
      "severity": "medium"
    }
  }
}
```

## Data Flow Architecture

### Data Processing Pipeline
```javascript
{
  "dataFlow": {
    "input": {
      "step": 1,
      "description": "Request parameter validation and normalization",
      "models": ["LocationInput", "TimeInput", "QueryParameters"]
    },
    "geocoding": {
      "step": 2,
      "description": "Address to coordinate conversion",
      "models": ["AddressModel", "CoordinateModel", "AdminDivisionModel"]
    },
    "gridConversion": {
      "step": 3,
      "description": "WGS84 to KMA grid system conversion",
      "models": ["WGS84Model", "KMAGridModel", "ProjectionModel"]
    },
    "multiSourceFetch": {
      "step": 4,
      "description": "Parallel data fetching from multiple sources",
      "models": ["KMAResponseModel", "KECOResponseModel", "ScrapedDataModel"]
    },
    "cacheCheck": {
      "step": 5,
      "description": "Multi-layer cache validation",
      "models": ["CacheKeyModel", "CacheMetadataModel", "TTLModel"]
    },
    "dataTransformation": {
      "step": 6,
      "description": "Raw data parsing and normalization",
      "models": ["NormalizedWeatherModel", "NormalizedAirQualityModel"]
    },
    "dataEnhancement": {
      "step": 7,
      "description": "Calculated field generation",
      "models": ["EnhancedWeatherModel", "CalculatedFieldsModel"]
    },
    "aggregation": {
      "step": 8,
      "description": "Multi-source data combination",
      "models": ["UnifiedResponseModel", "AggregatedDataModel"]
    },
    "caching": {
      "step": 9,
      "description": "Result caching to S3",
      "models": ["CacheEntryModel", "NDJSONModel"]
    },
    "response": {
      "step": 10,
      "description": "Final response formatting",
      "models": ["APIResponseModel", "MetadataModel"]
    }
  }
}
```

---

This comprehensive data model documentation provides a complete reference for understanding the data structures used throughout the Weather Labs Backend Functions system. The models are designed to support efficient data processing, caching, and transformation while maintaining consistency across multiple data sources and providing rich, normalized weather and air quality information.