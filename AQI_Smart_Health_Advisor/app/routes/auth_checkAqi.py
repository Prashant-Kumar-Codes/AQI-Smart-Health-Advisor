from .extensions import *
from math import radians, sin, cos, sqrt, atan2
import os

checkAqi_auth = Blueprint('checkAqi_auth', '__name__')

# AQI API Configuration
WAQI_BASE_URL = 'https://api.waqi.info'
WAQI_API_TOKEN = os.getenv('WAQI_API_TOKEN', '46797eab2434e3cb85537e21e9a80bcb309220e3')

# OpenWeather API Configuration
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '6589ed49a6410165ea63662b113ed824')

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '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')

# Initialize OpenAI client with API key
openai_client = None
try:
    from openai import OpenAI
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
except ImportError:
    openai_client = None
except Exception as e:
    print(f"Warning: OpenAI client initialization failed: {e}")
    openai_client = None

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
            city_cleaned,
            city_cleaned.split(',')[0].strip(),
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
        
        # Get coordinates from OpenWeather
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
        
        # Search WAQI stations
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
    """Basic AI recommendation endpoint"""
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

@checkAqi_auth.route('/api/aqi/ai-personalized-advice', methods=['POST'])
def get_ai_personalized_advice():
    """Get personalized AI advice using GPT-4o-mini"""
    try:
        # Check if user is logged in - login part
        if 'user_id' not in session:
            return jsonify({'error': 'Please sign in to access AI Advisor'}), 401
        
        data = request.get_json()
        aqi = data.get('aqi', 0)
        age = data.get('age', 'adult')
        conditions = data.get('conditions', [])
        location = data.get('location', 'unknown location')
        question = data.get('question', '')
        
        # Determine AQI category
        if aqi <= 50:
            aqi_category = 'Good'
            health_concern = 'None'
        elif aqi <= 100:
            aqi_category = 'Moderate'
            health_concern = 'Acceptable for most, unusually sensitive people should consider limiting prolonged outdoor exertion'
        elif aqi <= 150:
            aqi_category = 'Unhealthy for Sensitive Groups'
            health_concern = 'Members of sensitive groups may experience health effects'
        elif aqi <= 200:
            aqi_category = 'Unhealthy'
            health_concern = 'Everyone may begin to experience health effects'
        elif aqi <= 300:
            aqi_category = 'Very Unhealthy'
            health_concern = 'Health alert: everyone may experience more serious health effects'
        else:
            aqi_category = 'Hazardous'
            health_concern = 'Health warnings of emergency conditions'
        
        # Build context for AI
        age_context = {
            'child': 'a child (0-12 years old)',
            'teen': 'a teenager (13-19 years old)',
            'adult': 'an adult (20-60 years old)',
            'senior': 'a senior (60+ years old)'
        }
        
        age_text = age_context.get(age, 'a person')
        
        conditions_text = ''
        if conditions and 'none' not in conditions:
            conditions_list = ', '.join(conditions)
            conditions_text = f" with {conditions_list}"
        
        # Create prompt for GPT-4o-mini
        system_prompt = """You are a helpful AI health advisor specializing in air quality and public health. 
Provide concise, actionable advice in 40 words or less. Be empathetic, clear, and focus on practical recommendations.
Always prioritize health and safety."""
        
        if question:
            user_prompt = f"""Location: {location}
Current AQI: {aqi} ({aqi_category})
Health Concern: {health_concern}
Person: {age_text}{conditions_text}

Question: {question}

Provide a brief, helpful answer in 40 words or less."""
        else:
            user_prompt = f"""Location: {location}
Current AQI: {aqi} ({aqi_category})
Health Concern: {health_concern}
Person: {age_text}{conditions_text}

Provide personalized health advice for this air quality situation in 40 words or less."""
        
        # Call OpenAI API with GPT-4o-mini using new client
        try:
            if not openai_client:
                raise ImportError("OpenAI package not installed. Install it with: pip install openai")
            
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=100,
                temperature=0.7
            )
            
            advice = response.choices[0].message.content.strip()
            
            # Ensure it's within 40 words
            words = advice.split()
            if len(words) > 40:
                advice = ' '.join(words[:40]) + '...'
            
            return jsonify({
                'advice': advice,
                'aqi': aqi,
                'category': aqi_category
            })
            
        except Exception as e:
            print(f"OpenAI API Error: {e}")
            # Fallback to rule-based advice
            return get_fallback_advice(aqi, age, conditions, question)
            
    except Exception as e:
        print(f"ERROR in get_ai_personalized_advice: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to generate personalized advice'}), 500

def get_fallback_advice(aqi, age, conditions, question):
    """Fallback advice when AI API is unavailable"""
    advice = ""
    
    if aqi <= 50:
        advice = "Great air quality! Safe for all outdoor activities. Enjoy your time outside without restrictions."
    elif aqi <= 100:
        advice = "Air quality is acceptable. Most people can go outside normally. Sensitive individuals should monitor for symptoms."
    elif aqi <= 150:
        if 'asthma' in conditions or 'breathing' in conditions:
            advice = "Limit prolonged outdoor activities. Keep rescue inhaler handy. Consider wearing an N95 mask outdoors."
        elif age == 'child' or age == 'senior':
            advice = "Reduce outdoor time. Watch for coughing or breathing difficulty. Stay indoors during peak pollution hours."
        else:
            advice = "Sensitive groups should limit outdoor exposure. Most others can maintain normal activities with caution."
    elif aqi <= 200:
        advice = "Unhealthy air for everyone. Stay indoors when possible. Wear N95 masks if you must go outside. Avoid strenuous activities."
    elif aqi <= 300:
        advice = "Very unhealthy air! Stay indoors. Keep windows closed. Run air purifiers. Seek medical attention if experiencing symptoms."
    else:
        advice = "Hazardous conditions! Emergency situation. Stay indoors with sealed windows. Evacuate if you have severe respiratory conditions."
    
    # Add specific advice based on question
    if question and 'outside' in question.lower():
        if aqi > 150:
            advice = "Not recommended to go outside. Wait for air quality to improve. If urgent, wear N95 mask and minimize time outdoors."
    elif question and 'time' in question.lower():
        advice = "Best outdoor time is early morning (6-8 AM) when pollution is typically lowest. Check AQI before going out."
    elif question and 'family' in question.lower():
        advice = "Keep family indoors. Use air purifiers. Seal windows. Monitor health symptoms. Have masks and medications ready."
    
    return jsonify({
        'advice': advice,
        'aqi': aqi,
        'category': 'Fallback'
    })

@checkAqi_auth.route('/api/user/check', methods=['GET'])
def check_user_logged_in():
    """Check if user is logged in"""
    if 'user_id' in session:
        return jsonify({'logged_in': True}), 200
    return jsonify({'logged_in': False}), 401

@checkAqi_auth.route('/api/user/city')
def get_user_city():
    """Get user's city from profile"""
    try:
        if 'user_id' in session:
            # User model not available in this framework
            # Implement your own user data retrieval logic here
            return jsonify({'city': None}), 200
        return jsonify({'city': None}), 200
    except:
        return jsonify({'city': None}), 200