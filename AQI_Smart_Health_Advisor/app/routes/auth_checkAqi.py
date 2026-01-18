from .extensions import *

checkAqi_auth = Blueprint('checkAqi_auth', '__name__')

# AQI API Configuration
WAQI_BASE_URL = 'https://api.waqi.info'
WAQI_API_TOKEN = os.getenv('WAQI_API_TOKEN', 'demo')

# OpenWeather API Configuration
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '6589ed49a6410165ea63662b113ed824')

@checkAqi_auth.route('/check_aqi')
def check_aqi():
    """Render the AQI monitoring page"""
    return render_template('auth/checkAqi.html')

@checkAqi_auth.route('/api/aqi/city/<city>')
def get_aqi_by_city(city):
    """Get AQI data for a specific city with enhanced location search"""
    try:
        city_cleaned = city.strip()
        
        # Try primary location
        url = f'{WAQI_BASE_URL}/feed/{city_cleaned}/?token={WAQI_API_TOKEN}'
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') == 'ok':
            # Enhance with weather data
            enhanced_data = enhance_with_weather(data['data'])
            return jsonify(enhanced_data)
        else:
            # Try searching for nearby stations
            search_url = f'{WAQI_BASE_URL}/search/?token={WAQI_API_TOKEN}&keyword={city_cleaned}'
            search_response = requests.get(search_url, timeout=10)
            search_data = search_response.json()
            
            if search_data.get('status') == 'ok' and search_data.get('data'):
                # Get the first available station
                nearest_station = search_data['data'][0]
                station_url = f"{WAQI_BASE_URL}/feed/@{nearest_station['uid']}/?token={WAQI_API_TOKEN}"
                station_response = requests.get(station_url, timeout=10)
                station_data = station_response.json()
                
                if station_data.get('status') == 'ok':
                    result = station_data['data']
                    result['is_nearest'] = True
                    result['nearest_info'] = {
                        'station_name': nearest_station.get('station', {}).get('name', 'Unknown'),
                        'original_search': city_cleaned
                    }
                    enhanced_data = enhance_with_weather(result)
                    return jsonify(enhanced_data)
            
            return jsonify({'error': f'No air quality data found for "{city_cleaned}" or nearby areas.'}), 404
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out. Please try again.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@checkAqi_auth.route('/api/aqi/geo')
def get_aqi_by_geo():
    """Get AQI data based on latitude and longitude with fallback to nearest station"""
    try:
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        
        if not lat or not lng:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        # Validate coordinates
        try:
            lat_float = float(lat)
            lng_float = float(lng)
            
            if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                return jsonify({'error': 'Invalid coordinates'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid coordinate format'}), 400
        
        # Try to get AQI data by coordinates
        url = f'{WAQI_BASE_URL}/feed/geo:{lat};{lng}/?token={WAQI_API_TOKEN}'
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') == 'ok':
            enhanced_data = enhance_with_weather(data['data'])
            return jsonify(enhanced_data)
        else:
            # Fallback: Get location name from OpenWeather and search
            weather_url = f'{OPENWEATHER_BASE_URL}/weather?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}'
            weather_response = requests.get(weather_url, timeout=10)
            
            if weather_response.status_code == 200:
                weather_data = weather_response.json()
                city_name = weather_data.get('name', '')
                
                if city_name:
                    # Search for AQI using city name
                    return get_aqi_by_city(city_name)
            
            return jsonify({'error': 'No air quality monitoring station found near your location.'}), 404
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out. Please try again.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@checkAqi_auth.route('/api/aqi/search/<keyword>')
def search_aqi_stations(keyword):
    """Search for AQI monitoring stations by keyword"""
    try:
        keyword_cleaned = keyword.strip()
        
        if len(keyword_cleaned) < 2:
            return jsonify({'error': 'Search keyword must be at least 2 characters'}), 400
        
        url = f'{WAQI_BASE_URL}/search/?token={WAQI_API_TOKEN}&keyword={keyword_cleaned}'
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') == 'ok':
            return jsonify(data['data'])
        else:
            return jsonify({'error': 'No stations found'}), 404
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out. Please try again.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@checkAqi_auth.route('/api/aqi/ai-recommendation', methods=['POST'])
def get_ai_recommendation():
    """Get AI-powered health recommendation based on AQI and user data"""
    try:
        data = request.get_json()
        aqi = data.get('aqi', 0)
        user_conditions = data.get('conditions', [])  # e.g., ['asthma', 'elderly']
        
        # Here you can integrate your AI model
        # For now, returning custom recommendations
        recommendation = generate_custom_recommendation(aqi, user_conditions)
        
        return jsonify({
            'recommendation': recommendation,
            'aqi': aqi,
            'severity': get_severity_level(aqi)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate recommendation: {str(e)}'}), 500

def enhance_with_weather(aqi_data):
    """Enhance AQI data with OpenWeather data"""
    try:
        # Extract coordinates from AQI data
        if 'city' in aqi_data and 'geo' in aqi_data['city']:
            lat = aqi_data['city']['geo'][0]
            lon = aqi_data['city']['geo'][1]
            
            # Get weather data from OpenWeather
            weather_url = f'{OPENWEATHER_BASE_URL}/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric'
            weather_response = requests.get(weather_url, timeout=5)
            
            if weather_response.status_code == 200:
                weather_data = weather_response.json()
                
                # Add enhanced weather data
                if 'iaqi' not in aqi_data:
                    aqi_data['iaqi'] = {}
                
                # Add weather info if not present
                if 't' not in aqi_data['iaqi'] and 'main' in weather_data:
                    aqi_data['iaqi']['t'] = {'v': round(weather_data['main']['temp'], 1)}
                
                if 'h' not in aqi_data['iaqi'] and 'main' in weather_data:
                    aqi_data['iaqi']['h'] = {'v': weather_data['main']['humidity']}
                
                if 'p' not in aqi_data['iaqi'] and 'main' in weather_data:
                    aqi_data['iaqi']['p'] = {'v': weather_data['main']['pressure']}
                
                if 'w' not in aqi_data['iaqi'] and 'wind' in weather_data:
                    aqi_data['iaqi']['w'] = {'v': round(weather_data['wind']['speed'], 1)}
                
                # Add additional weather info
                aqi_data['enhanced_weather'] = {
                    'description': weather_data.get('weather', [{}])[0].get('description', ''),
                    'icon': weather_data.get('weather', [{}])[0].get('icon', ''),
                    'feels_like': weather_data.get('main', {}).get('feels_like'),
                    'visibility': weather_data.get('visibility'),
                    'sunrise': weather_data.get('sys', {}).get('sunrise'),
                    'sunset': weather_data.get('sys', {}).get('sunset')
                }
    except Exception as e:
        print(f"Weather enhancement error: {e}")
    
    return aqi_data

def generate_custom_recommendation(aqi, user_conditions):
    """Generate custom AI recommendation - Replace this with your AI model"""
    
    # This is a placeholder - integrate your AI model here
    base_recommendations = {
        'good': "Air quality is excellent today! This is the perfect time to engage in outdoor activities.",
        'moderate': "Air quality is acceptable. Most people can go about their normal activities.",
        'unhealthy_sensitive': "Sensitive groups should consider limiting prolonged outdoor exposure.",
        'unhealthy': "Everyone should reduce prolonged or heavy outdoor exertion.",
        'very_unhealthy': "Everyone should avoid prolonged outdoor exposure.",
        'hazardous': "Health warning: everyone should avoid all outdoor physical activities."
    }
    
    severity = get_severity_level(aqi)
    recommendation = base_recommendations.get(severity, "Unable to generate recommendation.")
    
    # Customize based on user conditions
    if user_conditions:
        if 'asthma' in user_conditions or 'respiratory' in user_conditions:
            recommendation += " As someone with respiratory conditions, please keep your rescue inhaler nearby and monitor symptoms closely."
        if 'elderly' in user_conditions or 'children' in user_conditions:
            recommendation += " Extra precautions are recommended for vulnerable individuals."
    
    return recommendation

def get_severity_level(aqi):
    """Get severity level from AQI value"""
    if aqi <= 50:
        return 'good'
    elif aqi <= 100:
        return 'moderate'
    elif aqi <= 150:
        return 'unhealthy_sensitive'
    elif aqi <= 200:
        return 'unhealthy'
    elif aqi <= 300:
        return 'very_unhealthy'
    else:
        return 'hazardous'