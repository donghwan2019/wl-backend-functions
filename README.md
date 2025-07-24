# Weather Labs Backend Functions

A comprehensive weather data API built with AWS Lambda and the Serverless Framework, aggregating meteorological and air quality data from Korean government sources.

## Overview

This project provides a unified API for accessing weather forecasts, current conditions, and air quality data from multiple Korean sources including:
- **KMA (Korea Meteorological Administration)** - Official weather data
- **KECO (Korea Environment Corporation)** - Air quality measurements  
- **Web scraping** - Additional weather station data
- **Location services** - Geographic data via Daum API

## Architecture

- **Runtime**: Node.js 20.x on AWS Lambda (ARM64)
- **API Gateway**: HTTP API with CORS enabled
- **CloudFront**: CDN with 60-second caching
- **Framework**: Serverless Framework v3

## API Endpoints

### Weather Data (KMA)
- `GET /{stage}/vilagefcst` - Village weather forecast
- `GET /{stage}/ultrasrtfcst` - Ultra short-term forecast
- `GET /{stage}/ultrasrtncst` - Ultra short-term current conditions
- `GET /{stage}/midfcst` - Medium-term forecast
- `GET /{stage}/midlandfcst` - Medium-term land forecast
- `GET /{stage}/midta` - Medium-term temperature
- `GET /{stage}/midseafcst` - Medium-term sea forecast

### Air Quality (KECO)
- `GET /{stage}/msrstnlist` - Measurement station list
- `GET /{stage}/ctprvnrltmmesurednsty/{datetime}` - Real-time air quality by region
- `GET /{stage}/minudustfrcstdspth/{datetime}` - Fine dust forecast
- `GET /{stage}/minudustweekfrcstdspth/{datetime}` - Weekly fine dust forecast

### Weather Scraping
- `GET /{stage}/asosmin/{datetime}` - ASOS minute data
- `GET /{stage}/cityweather` - City weather conditions
- `GET /{stage}/nearstnlist` - Nearby weather stations

### Aggregated Services
- `GET /{stage}/todayweather` - Combined today's weather data
- `GET /{stage}/geo` - Geographic location services

## Environment Variables

```bash
DATA_GO_KR_SERVICE_KEY=your_data_go_kr_api_key
DAUM_API_KEY=your_daum_api_key
```

## Development

### Prerequisites
- Node.js 20+
- AWS CLI configured
- Serverless Framework CLI

### Local Testing
```bash
# Test specific functions
npm run local:ultrasrtncst
npm run local:vilagefcst
npm run local:asosmin

# Test with sample data
npm run local:ultrasrtncst-test
npm run local:vilagefcst-test
```

### Deployment
```bash
# Deploy to dev
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

### Remove Stack
```bash
# Remove dev stack
npm run remove:dev

# Remove prod stack
npm run remove:prod
```

## Data Sources

- **KMA Open API**: Official Korean weather data
- **KECO Open API**: Air quality measurements
- **Weather station scraping**: Additional real-time data
- **Daum Local API**: Geographic coordinates and addresses

## License

MIT