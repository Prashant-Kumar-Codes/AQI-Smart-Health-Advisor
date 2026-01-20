from .extensions import *
from math import radians, sin, cos, sqrt, atan2

checkAqi_auth = Blueprint('checkAqi_auth', '__name__')

# AQI API Configuration
WAQI_BASE_URL = 'https://api.waqi.info'
# Note: 'demo' token has limitations - get your own token at https://aqicn.org/data-platform/token/
WAQI_API_TOKEN = os.getenv('WAQI_API_TOKEN', '46797eab2434e3cb85537e21e9a80bcb309220e3')

# OpenWeather API Configuration
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '6589ed49a6410165ea63662b113ed824')


# AQI API Configuration
WAQI_BASE_URL = 'https://api.waqi.info'
WAQI_API_TOKEN = os.getenv('WAQI_API_TOKEN', '46797eab2434e3cb85537e21e9a80bcb309220e3')

# OpenWeather API Configuration
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '6589ed49a6410165ea63662b113ed824')

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers"""
    try:
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return round(6371 * c, 1)
    except:
        return None

@checkAqi_auth.route('/check_aqi')
def check_aqi():
    """Render the AQI monitoring page"""
    return render_template('auth/checkAqi.html')

@checkAqi_auth.route('/api/aqi/city/<path:city>')
def get_aqi_by_city(city):
    """Get AQI data for a specific city - handles all location formats"""
    try:
        city_cleaned = city.strip()
        print(f"\n=== Searching for: {city_cleaned} ===")
        
        # Try multiple search strategies
        search_terms = [
            city_cleaned,  # Full input
            city_cleaned.split(',')[0].strip(),  # First part only
        ]
        
        # Try direct lookup with each search term
        for term in search_terms:
            url = f'{WAQI_BASE_URL}/feed/{requests.utils.quote(term)}/?token={WAQI_API_TOKEN}'
            print(f"Trying: {url}")
            
            try:
                response = requests.get(url, timeout=10)
                data = response.json()
                
                if data.get('status') == 'ok' and data.get('data'):
                    print(f"✓ Direct hit: {data['data']['city']['name']}")
                    result = data['data']
                    result['distance_km'] = 0
                    return jsonify(result)
            except:
                continue
        
        print("Direct lookup failed, searching stations...")
        
        # Get coordinates from OpenWeather for any location format
        user_lat, user_lon = None, None
        try:
            geocode_url = f'http://api.openweathermap.org/geo/1.0/direct?q={requests.utils.quote(city_cleaned)}&limit=5&appid={OPENWEATHER_API_KEY}'
            geocode_response = requests.get(geocode_url, timeout=10)
            
            if geocode_response.status_code == 200:
                geocode_data = geocode_response.json()
                if geocode_data:
                    user_lat = geocode_data[0]['lat']
                    user_lon = geocode_data[0]['lon']
                    print(f"OpenWeather geocode: {user_lat}, {user_lon}")
        except Exception as e:
            print(f"Geocoding error: {e}")
        
        # Search WAQI stations with each term
        all_stations = []
        for term in search_terms:
            try:
                search_url = f'{WAQI_BASE_URL}/search/?token={WAQI_API_TOKEN}&keyword={requests.utils.quote(term)}'
                response = requests.get(search_url, timeout=10)
                data = response.json()
                
                if data.get('status') == 'ok' and data.get('data'):
                    all_stations.extend(data['data'])
                    print(f"Found {len(data['data'])} stations for '{term}'")
            except:
                continue
        
        if not all_stations:
            return jsonify({'error': f'No monitoring stations found for "{city_cleaned}". Try a nearby major city.'}), 404
        
        # Remove duplicates
        unique_stations = []
        seen = set()
        for station in all_stations:
            uid = station.get('uid')
            if uid and uid not in seen:
                seen.add(uid)
                unique_stations.append(station)
        
        print(f"Total unique stations: {len(unique_stations)}")
        
        # Calculate distances if we have coordinates
        if user_lat and user_lon:
            for station in unique_stations:
                if 'lat' in station and 'lon' in station:
                    dist = calculate_distance(user_lat, user_lon, station['lat'], station['lon'])
                    if dist is not None:
                        station['distance'] = dist
            
            # Sort by distance
            stations_with_dist = [s for s in unique_stations if 'distance' in s]
            if stations_with_dist:
                stations_with_dist.sort(key=lambda x: x['distance'])
                unique_stations = stations_with_dist
        
        # Get closest station data
        closest = unique_stations[0]
        print(f"Using station: {closest.get('station', {}).get('name')}")
        
        try:
            station_url = f"{WAQI_BASE_URL}/feed/@{closest['uid']}/?token={WAQI_API_TOKEN}"
            response = requests.get(station_url, timeout=10)
            data = response.json()
            
            if data.get('status') == 'ok':
                result = data['data']
                result['is_nearest'] = True
                result['distance_km'] = closest.get('distance', 'Unknown')
                result['nearest_info'] = {
                    'station_name': closest.get('station', {}).get('name', 'Unknown'),
                    'original_search': city_cleaned,
                    'distance': closest.get('distance', 'Unknown')
                }
                
                # Add alternatives
                result['alternative_stations'] = []
                for station in unique_stations[1:4]:
                    result['alternative_stations'].append({
                        'uid': station['uid'],
                        'name': station.get('station', {}).get('name', 'Unknown'),
                        'distance': station.get('distance', 'Unknown')
                    })
                
                print(f"✓ Returning data for: {result['city']['name']}")
                return jsonify(result)
        except Exception as e:
            print(f"Error fetching station data: {e}")
        
        return jsonify({'error': f'Could not fetch station data for "{city_cleaned}"'}), 500
            
    except Exception as e:
        print(f"ERROR in get_aqi_by_city: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@checkAqi_auth.route('/api/aqi/geo')
def get_aqi_by_geo():
    """Get AQI by coordinates"""
    try:
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        
        print(f"\n=== Getting AQI for: {lat}, {lng} ===")
        
        # Try direct geo lookup
        url = f'{WAQI_BASE_URL}/feed/geo:{lat};{lng}/?token={WAQI_API_TOKEN}'
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get('status') == 'ok' and data.get('data'):
            result = data['data']
            
            if 'city' in result and 'geo' in result['city']:
                dist = calculate_distance(lat, lng, result['city']['geo'][0], result['city']['geo'][1])
                result['distance_km'] = dist
                print(f"✓ Found: {result['city']['name']}, Distance: {dist}km")
            
            return jsonify(result)
        
        print("Direct geo failed, searching nearby...")
        
        # Get city name from OpenWeather
        try:
            weather_url = f'{OPENWEATHER_BASE_URL}/weather?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}'
            weather_response = requests.get(weather_url, timeout=10)
            
            if weather_response.status_code == 200:
                weather_data = weather_response.json()
                city_name = weather_data.get('name', '')
                country = weather_data.get('sys', {}).get('country', '')
                
                print(f"OpenWeather found: {city_name}, {country}")
                
                # Search for stations
                all_stations = []
                for keyword in [city_name, country]:
                    if keyword:
                        try:
                            search_url = f'{WAQI_BASE_URL}/search/?token={WAQI_API_TOKEN}&keyword={keyword}'
                            response = requests.get(search_url, timeout=10)
                            data = response.json()
                            
                            if data.get('status') == 'ok' and data.get('data'):
                                all_stations.extend(data['data'])
                        except:
                            continue
                
                if all_stations:
                    # Remove duplicates and calculate distances
                    unique = []
                    seen = set()
                    for s in all_stations:
                        uid = s.get('uid')
                        if uid and uid not in seen and 'lat' in s and 'lon' in s:
                            seen.add(uid)
                            dist = calculate_distance(lat, lng, s['lat'], s['lon'])
                            if dist is not None:
                                s['distance'] = dist
                                unique.append(s)
                    
                    unique.sort(key=lambda x: x.get('distance', 999))
                    
                    if unique:
                        closest = unique[0]
                        station_url = f"{WAQI_BASE_URL}/feed/@{closest['uid']}/?token={WAQI_API_TOKEN}"
                        response = requests.get(station_url, timeout=10)
                        data = response.json()
                        
                        if data.get('status') == 'ok':
                            result = data['data']
                            result['distance_km'] = closest['distance']
                            result['is_nearest'] = True
                            result['nearest_info'] = {
                                'station_name': closest.get('station', {}).get('name', 'Unknown'),
                                'original_search': 'your location',
                                'distance': closest['distance']
                            }
                            
                            result['alternative_stations'] = []
                            for station in unique[1:4]:
                                result['alternative_stations'].append({
                                    'uid': station['uid'],
                                    'name': station.get('station', {}).get('name', 'Unknown'),
                                    'distance': station.get('distance', 'Unknown')
                                })
                            
                            print(f"✓ Returning: {result['city']['name']}")
                            return jsonify(result)
        except Exception as e:
            print(f"Weather lookup error: {e}")
        
        return jsonify({'error': 'No monitoring stations found nearby'}), 404
            
    except Exception as e:
        print(f"ERROR in get_aqi_by_geo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@checkAqi_auth.route('/api/aqi/station/<uid>')
def get_aqi_by_station(uid):
    """Get specific station data"""
    try:
        url = f"{WAQI_BASE_URL}/feed/@{uid}/?token={WAQI_API_TOKEN}"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get('status') == 'ok':
            return jsonify(data['data'])
        
        return jsonify({'error': 'Station not available'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@checkAqi_auth.route('/api/aqi/ai-recommendation', methods=['POST'])
def get_ai_recommendation():
    """AI recommendation endpoint"""
    try:
        data = request.get_json()
        aqi = data.get('aqi', 0)
        
        recommendations = {
            'good': "Air quality is excellent! Perfect time for outdoor activities.",
            'moderate': "Air quality is acceptable for most people.",
            'unhealthy_sensitive': "Sensitive groups should limit outdoor exposure.",
            'unhealthy': "Everyone should reduce outdoor activities.",
            'very_unhealthy': "Everyone should avoid outdoor exposure.",
            'hazardous': "Health emergency - stay indoors!"
        }
        
        if aqi <= 50: severity = 'good'
        elif aqi <= 100: severity = 'moderate'
        elif aqi <= 150: severity = 'unhealthy_sensitive'
        elif aqi <= 200: severity = 'unhealthy'
        elif aqi <= 300: severity = 'very_unhealthy'
        else: severity = 'hazardous'
        
        return jsonify({
            'recommendation': recommendations[severity],
            'aqi': aqi,
            'severity': severity
        })
    except:
        return jsonify({'error': 'Failed to generate recommendation'}), 500