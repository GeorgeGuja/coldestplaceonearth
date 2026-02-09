# Quick Start: Accessing Global Weather Station Data

## The Discovery

We found how sites like Ogimet get real-time weather data from remote stations worldwide.

## The Answer

**NOAA provides free public access to global SYNOP (weather station) data through:**

1. **NOAA ISD (Integrated Surface Database)**
   - FTP: `ftp://ftp.ncdc.noaa.gov/pub/data/noaa/`
   - Covers 10,000+ stations worldwide
   - Includes remote locations (Siberia, Antarctica, Arctic)
   - Historical data back to 1900s

2. **NOAA Real-time Feeds**
   - FTP: `ftp://tgftp.nws.noaa.gov/data/`
   - Updated hourly
   - Current observations

3. **Ogimet.com (Unofficial API)**
   - URL: `https://www.ogimet.com/display_synops2.php?lugar={STATION_ID}&fmt=txt`
   - Already parsed data
   - Use as fallback only

## Quick Implementation

### Step 1: Get Station List
```bash
# Download list of all weather stations
wget ftp://ftp.ncdc.noaa.gov/pub/data/noaa/isd-history.txt
```

### Step 2: Find Cold Region Stations
```python
import pandas as pd

# Load station list
stations = pd.read_fwf('isd-history.txt', skiprows=20)

# Filter for cold regions (latitude > 60° North or Antarctica)
cold_stations = stations[
    (stations['LAT'] > 60) | (stations['LAT'] < -60)
]

# Filter for active stations
cold_stations = cold_stations[cold_stations['END'] > 20240101]
```

### Step 3: Download Station Data
```python
import ftplib

def download_station_data(station_id, year):
    ftp = ftplib.FTP('ftp.ncdc.noaa.gov')
    ftp.login()
    ftp.cwd('/pub/data/noaa/')
    
    # Download file for specific station and year
    filename = f"{station_id}-{year}.gz"
    with open(filename, 'wb') as f:
        ftp.retrbinary(f'RETR {filename}', f.write)
    
    ftp.quit()

# Example: Oymyakon, Russia
download_station_data('24688-99999', 2024)
```

### Step 4: Parse Temperature Data
```python
def parse_isd_temperature(line):
    # ISD format: temperature is at position 87-92
    temp_str = line[87:92]
    if temp_str == '+9999':
        return None  # Missing data
    
    # Temperature in tenths of degrees C
    temp = int(temp_str) / 10.0
    return temp

with open('24688-99999-2024.gz', 'rb') as f:
    import gzip
    for line in gzip.open(f, 'rt'):
        temp = parse_isd_temperature(line)
        if temp and temp < -40:
            print(f"Cold temperature found: {temp}°C")
```

## Key Stations for ColdestPlace

| Station ID | Name | Location | Lat/Lon |
|------------|------|----------|---------|
| 24688 | Oymyakon | Russia | 63.25°N, 143.15°E |
| 24266 | Verkhoyansk | Russia | 67.55°N, 133.38°E |
| 89542 | Vostok | Antarctica | -78.45°S, 106.87°E |
| 89606 | Dome Argus | Antarctica | -80.37°S, 77.53°E |
| 04360 | Eureka | Canada | 79.99°N, 85.93°W |
| 04417 | Alert | Canada | 82.50°N, 62.35°W |

## Next Steps

1. Build data ingestion pipeline (FTP download → Parse → Database)
2. Create scheduled jobs (update every hour)
3. Implement temperature ranking algorithm
4. Build API endpoints
5. Deploy real-time dashboard

## Alternative: Use Ogimet

If you want quick results without building infrastructure:

```python
import requests
from datetime import datetime

def get_ogimet_data(station_id):
    now = datetime.utcnow()
    url = 'https://www.ogimet.com/display_synops2.php'
    params = {
        'lugar': station_id,
        'fmt': 'txt',
        'ano': now.year,
        'mes': f"{now.month:02d}",
        'day': f"{now.day:02d}",
        'hora': f"{now.hour:02d}",
        'anof': now.year,
        'mesf': f"{now.month:02d}",
        'dayf': f"{now.day:02d}",
        'horaf': f"{now.hour:02d}"
    }
    response = requests.get(url, params=params)
    return response.text

# Get data for Oymyakon
data = get_ogimet_data('24688')
print(data)
```

## Resources

- Full research: `SYNOP_DATA_RESEARCH.md`
- NOAA ISD: https://www.ncei.noaa.gov/products/land-based-station/integrated-surface-database
- Ogimet: https://www.ogimet.com/
- WMO SYNOP format: https://www.wmo.int/
