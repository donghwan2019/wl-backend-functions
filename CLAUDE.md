# CLAUDE.md - Weather Labs Backend Functions

## Project Overview

Weather Labs Backend Functions is a serverless weather data aggregation system built on AWS Lambda that combines multiple Korean weather and air quality data sources into a unified API. The system integrates official government APIs (KMA, KECO) with web scraping to provide comprehensive weather information.

## Architecture Summary

- **Platform**: AWS Lambda + API Gateway + CloudFront
- **Runtime**: Node.js 20.x (ARM64)
- **Framework**: Serverless Framework v3
- **Pattern**: Microservices with inheritance-based service classes
- **Caching**: Multi-layer (Memory → S3 → External APIs)
- **Data Sources**: KMA APIs, KECO APIs, Web Scraping, Kakao Location API

## Key Components

### Service Modules
- **`kma/`** - Korea Meteorological Administration weather APIs
  - **`docs/`** - KMA API documentations 
- **`keco/`** - Korea Environment Corporation air quality APIs  
- **`kma-scraper/`** - Web scraping for additional weather data
- **`todayweather/`** - Aggregated weather service combining all sources
- **`geo/`** - Geographic/location services via Kakao API
- **`aws/`** - S3 integration and data persistence

### Data Flow
1. **Input**: Geographic coordinates or addresses
2. **Conversion**: WGS84 → KMA grid system (nx, ny)
3. **Multi-source Fetch**: Parallel API calls to KMA, KECO, scraping
4. **Transformation**: Raw data → normalized internal models
5. **Enhancement**: Add calculated fields (heat index, discomfort index)
6. **Aggregation**: Combine all data sources into unified response
7. **Caching**: Store results in S3 (NDJSON format)

## Development Environment

### Prerequisites
- Node.js 20+
- AWS CLI configured
- Serverless Framework CLI
- Environment variables configured

### Environment Variables
```bash
# Required API keys
DATA_GO_KR_SERVICE_KEY="your_korean_govt_api_key"
DAUM_API_KEY="your_kakao_api_key"

# AWS Configuration
AWS_ACCOUNT_TYPE="dev"
```

### Local Development Commands
```bash
# Test individual functions
npm run local:vilagefcst          # Village forecasts
npm run local:ultrasrtncst        # Current conditions
npm run local:todayweather        # Aggregated service

# Test with sample data
npm run local:vilagefcst-test
npm run local:ultrasrtncst-test

# Deploy
npm run deploy:dev
npm run deploy:prod
```

## Code Architecture Patterns

### Inheritance Hierarchy
```
ControllerS3 (Base: S3 operations)
    ↓
Kma/Keco (Domain: API configurations)
    ↓
VilageFcst/UltraSrtFcst/CtprvnRltmMesureDnsty (Concrete implementations)
```

### Service Classes
- **Base Classes**: `ControllerS3`, `Kma`, `Keco`
- **Concrete Services**: `VilageFcst`, `UltraSrtFcst`, `CtprvnRltmMesureDnsty`
- **Aggregation**: `TodayWeather` composes multiple services
- **Adapters**: `KmaScraper` converts HTML to API responses

### Handler Pattern
Each module has a `handler.js` with Lambda entry points:
```javascript
export const vilagefcst = async (event) => {
    const vilageFcst = new VilageFcst();
    return await vilageFcst.get(event);
};
```

## API Endpoints

### Weather Data (KMA)
- `GET /{stage}/vilagefcst` - 3-day village forecasts
- `GET /{stage}/ultrasrtfcst` - 1-6 hour ultra short-term forecasts
- `GET /{stage}/ultrasrtncst` - Current weather conditions
- `GET /{stage}/midfcst` - 7-10 day medium-term forecasts

### Air Quality (KECO)
- `GET /{stage}/ctprvnrltmmesurednsty/{datetime}` - Real-time air quality
- `GET /{stage}/minudustfrcstdspth/{datetime}` - Fine dust forecasts
- `GET /{stage}/msrstnlist` - Air quality monitoring stations

### Enhanced Data (Scraping)
- `GET /{stage}/asosmin/{datetime}` - ASOS weather station data
- `GET /{stage}/cityweather` - City-level weather conditions
- `GET /{stage}/nearstnlist` - Nearby weather stations

### Aggregated Services
- `GET /{stage}/todayweather` - Combined weather + air quality data
- `GET /{stage}/geo` - Geographic location services

## Data Models

### Input Parameters
```javascript
{
  "lat": "37.5665",        // Latitude (WGS84)
  "lon": "126.9780",       // Longitude (WGS84)
  "datetime": "202212071500", // YYYYMMDDHHmm
  "address": "서울특별시 중구"  // Korean address
}
```

### Response Format
```javascript
{
  "success": true,
  "data": {
    "regionName": "서울특별시",
    "current": { /* current conditions */ },
    "short": [ /* 3-day forecasts */ ],
    "midData": { /* 7-10 day forecasts */ },
    "airInfo": { /* air quality data */ }
  },
  "location": { "lat": 37.518, "long": 126.975 },
  "units": { "temperatureUnit": "C", "windSpeedUnit": "m/s" }
}
```

## Caching Strategy

### Multi-layer Caching
1. **Memory Cache**: Lambda instance variables
2. **S3 Cache**: Persistent NDJSON storage
3. **External APIs**: Fallback data source

### Cache Keys
```javascript
// KMA data
`kma/${base_date}${base_time}_${nx}_${ny}_vilageFcst`

// KECO data
`keco/${base_date}${base_time}_ctprvnRltmMesureDnsty`

// Scraping data
`kma-scraper/cityweather/${YYYY.MM.DD.HH:mm}`
```

### Update Schedules
- **Village Forecasts**: Every 3 hours (02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00)
- **Ultra Short-term**: Every 10 minutes
- **Air Quality**: Every hour
- **Web Scraping**: Every 5 minutes

## Authentication

### External APIs
- **KMA/KECO**: API key via `DATA_GO_KR_SERVICE_KEY` environment variable
- **Kakao**: Bearer token via `DAUM_API_KEY` environment variable
- **Web Scraping**: No authentication (public data)

### AWS Services
- **S3**: IAM role-based authentication
- **Lambda**: Execution role with S3 read/write permissions
- **CloudWatch**: Automatic logging permissions

### Public APIs
- **No authentication required** for public endpoints
- **HTTPS enforced** via CloudFront
- **CORS enabled** for cross-origin requests

## Common Development Tasks

### Adding New Data Sources
1. Create new service class extending `ControllerS3`
2. Implement data fetching and parsing methods
3. Add handler function in appropriate module
4. Update `serverless.yml` with new function definition
5. Add environment variables if needed

### Modifying Existing Services
1. Update service class methods
2. Test locally using npm scripts
3. Deploy to dev environment first
4. Verify cache invalidation if data structure changes

### Testing
- **Unit Testing**: Use local invoke commands
- **Integration Testing**: Test against actual APIs
- **Sample Data**: Available in `test/` directory
- **Cache Testing**: Verify S3 storage and retrieval

## Troubleshooting

### Common Issues
1. **API Key Errors**: Check environment variables are set
2. **Coordinate Conversion**: Verify lat/lon to nx/ny conversion
3. **Cache Misses**: Check S3 bucket permissions
4. **Encoding Issues**: Web scraping handles EUC-KR encoding

### Debugging
- **CloudWatch Logs**: Check Lambda function logs
- **Local Testing**: Use `sls invoke local` commands
- **S3 Inspection**: Verify cached data structure
- **API Testing**: Test external API endpoints directly

## Performance Considerations

### Optimization
- **Parallel Processing**: Multiple API calls use `Promise.all()`
- **ARM64 Architecture**: 20% cost reduction vs x86
- **Intelligent Caching**: Time-based cache invalidation
- **CDN**: CloudFront caching with 60-second TTL

### Monitoring
- **CloudWatch Metrics**: Duration, errors, invocations
- **S3 Operations**: Cache hit/miss ratios
- **External API Calls**: Rate limiting and failures

## Security Notes

### Best Practices
- API keys stored in environment variables
- HTTPS enforced for all communications
- IAM roles for AWS service access
- Input validation for API parameters

### Areas for Improvement
- Consider AWS Secrets Manager for API keys
- Implement rate limiting for public endpoints
- Add input sanitization for web scraping
- Consider API key validation for public access

## Recent Changes

Based on git history:
- **ES6 Module Conversion**: Migrated from CommonJS to ES6 modules
- **Enhanced Documentation**: Added comprehensive JSDoc comments
- **New Scraping Services**: Added `nearStnList` and `cityweather` endpoints
- **Data Integration**: Enhanced `todayweather` with KECO air quality data
- **S3 Optimization**: Improved data storage and retrieval patterns

## GitHub Issues

**Repository**: https://github.com/donghwan2019/wl-backend-functions

## Quick Reference

### Key Files
- `serverless.yml` - Service configuration
- `package.json` - Dependencies and scripts
- `kma/handler.js` - Weather API endpoints
- `kma/docs/KMA_Surface_Synoptic_ASOS_Daily_Data_Inquiry_Service_OpenAPI_User_Guide.pdf` - KMA API documentation
- `keco/handler.js` - Air quality API endpoints
- `todayweather/handler.js` - Aggregated service endpoint

### Important Classes
- `VilageFcst` - Village weather forecasts
- `UltraSrtNcst` - Current weather conditions
- `CtprvnRltmMesureDnsty` - Real-time air quality
- `TodayWeather` - Combined weather data aggregation
- `KmaScraper` - Web scraping functionality

### Data Sources
- **KMA**: Official Korean weather data
- **KECO**: Air quality measurements
- **Web Scraping**: Additional weather station data
- **Kakao**: Geographic location services

This document provides comprehensive context for development work on the Weather Labs Backend Functions project.