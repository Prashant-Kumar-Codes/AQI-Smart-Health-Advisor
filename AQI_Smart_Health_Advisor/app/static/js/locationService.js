/**
 * Centralized Location Service
 * Handles all location-based operations with precise geocoding and AQI fetching
 */

const LocationService = {
    // Configuration
    NOMINATIM_BASE: 'https://nominatim.openstreetmap.org',
    AQI_API_BASE: '/api/aqi',
    
    /**
     * Get precise coordinates from location name
     * @param {string} locationName - City name or address
     * @returns {Promise<Object>} - {lat, lng, displayName, address}
     */
    async getCoordinatesFromName(locationName) {
        if (!locationName || locationName.trim().length < 2) {
            throw new Error('Please enter a valid location name');
        }

        try {
            console.log(`🔍 Geocoding location: ${locationName}`);
            
            const response = await fetch(
                `${this.NOMINATIM_BASE}/search?` + new URLSearchParams({
                    format: 'json',
                    q: locationName,
                    limit: 1,
                    'accept-language': 'en',
                    addressdetails: 1
                }),
                {
                    headers: {
                        'User-Agent': 'AQI_Smart_Health_Advisor/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }

            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error(`Location "${locationName}" not found. Please try a different location.`);
            }

            const location = data[0];
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lon);
            
            // Extract clean city name
            const cityName = location.address?.city || 
                           location.address?.town || 
                           location.address?.village || 
                           location.address?.municipality ||
                           location.address?.county ||
                           location.display_name.split(',')[0];

            console.log(`✅ Geocoded successfully: ${cityName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

            return {
                lat: lat,
                lng: lng,
                displayName: cityName,
                fullAddress: location.display_name,
                address: location.address
            };
        } catch (error) {
            console.error('❌ Geocoding error:', error);
            throw error;
        }
    },

    /**
     * Get precise location name from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Object>} - {displayName, fullAddress, address}
     */
    async getNameFromCoordinates(lat, lng) {
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            throw new Error('Invalid coordinates');
        }

        try {
            console.log(`📍 Reverse geocoding: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            
            const response = await fetch(
                `${this.NOMINATIM_BASE}/reverse?` + new URLSearchParams({
                    format: 'json',
                    lat: lat,
                    lon: lng,
                    zoom: 14,
                    'accept-language': 'en',
                    addressdetails: 1
                }),
                {
                    headers: {
                        'User-Agent': 'AQI_Smart_Health_Advisor/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Reverse geocoding failed');
            }

            const data = await response.json();
            
            const cityName = data.address?.city || 
                           data.address?.town || 
                           data.address?.village || 
                           data.address?.municipality ||
                           data.address?.county ||
                           data.display_name.split(',')[0];

            console.log(`✅ Reverse geocoded: ${cityName}`);

            return {
                displayName: cityName,
                fullAddress: data.display_name,
                address: data.address
            };
        } catch (error) {
            console.error('❌ Reverse geocoding error:', error);
            throw error;
        }
    },

    /**
     * Get current device location with high accuracy
     * @returns {Promise<Object>} - {lat, lng, accuracy, displayName}
     */
    async getCurrentLocation() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            };

            console.log('📡 Getting current location...');

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;

                        console.log(`✅ Location acquired: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy.toFixed(0)}m)`);

                        // Get location name
                        const locationInfo = await this.getNameFromCoordinates(lat, lng);

                        resolve({
                            lat: lat,
                            lng: lng,
                            accuracy: accuracy,
                            displayName: locationInfo.displayName,
                            fullAddress: locationInfo.fullAddress,
                            address: locationInfo.address
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    let errorMessage = 'Unable to retrieve your location. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Please allow location access in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMessage += 'An unknown error occurred.';
                    }
                    
                    console.error('❌ Geolocation error:', errorMessage);
                    reject(new Error(errorMessage));
                },
                options
            );
        });
    },

    /**
     * Fetch AQI data for coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Object>} - AQI data
     */
    async getAQIByCoordinates(lat, lng) {
        try {
            console.log(`🌡️ Fetching AQI for coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            
            const response = await fetch(
                `${this.AQI_API_BASE}/geo?lat=${lat}&lng=${lng}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch AQI data');
            }

            const data = await response.json();
            console.log(`✅ AQI data received: ${data.aqi}`);
            
            return data;
        } catch (error) {
            console.error('❌ AQI fetch error:', error);
            throw error;
        }
    },

    /**
     * Fetch AQI data for location name
     * @param {string} cityName - City name
     * @returns {Promise<Object>} - AQI data
     */
    async getAQIByCity(cityName) {
        try {
            console.log(`🌡️ Fetching AQI for city: ${cityName}`);
            
            const response = await fetch(
                `${this.AQI_API_BASE}/city/${encodeURIComponent(cityName)}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch AQI data');
            }

            const data = await response.json();
            console.log(`✅ AQI data received: ${data.aqi}`);
            
            return data;
        } catch (error) {
            console.error('❌ AQI fetch error:', error);
            throw error;
        }
    },

    /**
     * Complete flow: Location name -> Coordinates -> AQI
     * @param {string} locationName - City name or address
     * @returns {Promise<Object>} - {location, aqiData}
     */
    async getAQIFromLocationName(locationName) {
        try {
            // Step 1: Get coordinates
            const location = await this.getCoordinatesFromName(locationName);
            
            // Step 2: Get AQI data
            const aqiData = await this.getAQIByCoordinates(location.lat, location.lng);
            
            return {
                location: location,
                aqiData: aqiData
            };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Complete flow: Current location -> Coordinates -> AQI
     * @returns {Promise<Object>} - {location, aqiData}
     */
    async getAQIFromCurrentLocation() {
        try {
            // Step 1: Get current location
            const location = await this.getCurrentLocation();
            
            // Step 2: Get AQI data
            const aqiData = await this.getAQIByCoordinates(location.lat, location.lng);
            
            return {
                location: location,
                aqiData: aqiData
            };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Search locations with autocomplete
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Promise<Array>} - List of locations
     */
    async searchLocations(query, limit = 5) {
        if (!query || query.trim().length < 3) {
            return [];
        }

        try {
            const response = await fetch(
                `${this.NOMINATIM_BASE}/search?` + new URLSearchParams({
                    format: 'json',
                    q: query,
                    limit: limit,
                    'accept-language': 'en',
                    addressdetails: 1
                }),
                {
                    headers: {
                        'User-Agent': 'AQI_Smart_Health_Advisor/1.0'
                    }
                }
            );

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            
            return data.map(place => ({
                displayName: place.display_name,
                cityName: place.address?.city || 
                         place.address?.town || 
                         place.address?.village ||
                         place.display_name.split(',')[0],
                lat: parseFloat(place.lat),
                lng: parseFloat(place.lon),
                address: place.address
            }));
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
};

// Make available globally
window.LocationService = LocationService;