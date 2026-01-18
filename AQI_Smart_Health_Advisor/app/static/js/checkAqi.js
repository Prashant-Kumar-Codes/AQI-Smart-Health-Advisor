// ========== Global State ==========
let currentAQIData = null;

// ========== UI State Management ==========
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('nearestAlert').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = `<strong>⚠️ Error:</strong> ${message}`;
    errorDiv.style.display = 'block';
    hideLoading();
}

function showSuccess() {
    hideLoading();
    document.getElementById('results').style.display = 'block';
    
    // Smooth scroll to results
    setTimeout(() => {
        document.getElementById('results').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

function showNearestAlert(stationName, originalSearch) {
    const alertDiv = document.getElementById('nearestAlert');
    const infoSpan = document.getElementById('nearestStationInfo');
    
    infoSpan.innerHTML = `Could not find exact data for "<strong>${originalSearch}</strong>". Showing data from nearest station: <strong>${stationName}</strong>`;
    alertDiv.style.display = 'flex';
}

function hideNearestAlert() {
    document.getElementById('nearestAlert').style.display = 'none';
}

// ========== Search Functions ==========
function quickSearch(city) {
    document.getElementById('locationInput').value = city;
    searchAQI();
}

async function searchAQI() {
    const location = document.getElementById('locationInput').value.trim();
    
    if (!location) {
        showError('Please enter a city name or location');
        return;
    }

    showLoading();
    hideNearestAlert();

    try {
        const response = await fetch(`/api/aqi/city/${encodeURIComponent(location)}`);
        const data = await response.json();

        if (response.ok && !data.error) {
            // Check if this is nearest station data
            if (data.is_nearest && data.nearest_info) {
                showNearestAlert(data.nearest_info.station_name, data.nearest_info.original_search);
            }
            
            displayAQIData(data);
            await fetchAIRecommendation(data.aqi);
        } else {
            showError(data.error || 'Location not found. Please try another city or use your current location.');
        }
    } catch (error) {
        showError('Failed to fetch air quality data. Please check your internet connection and try again.');
        console.error('Error:', error);
    }
}

async function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser. Please enter a city name manually.');
        return;
    }

    showLoading();
    hideNearestAlert();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                console.log(`Getting AQI for coordinates: ${latitude}, ${longitude}`);
                
                const response = await fetch(`/api/aqi/geo?lat=${latitude}&lng=${longitude}`);
                const data = await response.json();

                if (response.ok && !data.error) {
                    // Check if this is nearest station data
                    if (data.is_nearest && data.nearest_info) {
                        showNearestAlert(data.nearest_info.station_name, 'your location');
                    }
                    
                    displayAQIData(data);
                    
                    // Update input with city name
                    if (data.city && data.city.name) {
                        document.getElementById('locationInput').value = data.city.name;
                    }
                    
                    await fetchAIRecommendation(data.aqi);
                } else {
                    // If geo lookup fails, try to get city name and search
                    showError(data.error || 'No air quality monitoring station found near your location. Try searching for your city name.');
                }
            } catch (error) {
                showError('Failed to fetch air quality data for your location. Please try entering your city name manually.');
                console.error('Error:', error);
            }
        },
        (error) => {
            let errorMessage = 'Unable to retrieve your location. ';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings, or enter a city name manually.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable. Please enter a city name manually.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out. Please try again or enter a city name manually.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred. Please enter a city name manually.';
            }
            
            showError(errorMessage);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ========== AI Recommendation Functions ==========
async function fetchAIRecommendation(aqi) {
    try {
        // You can add user conditions here in the future
        const requestData = {
            aqi: aqi,
            conditions: [] // e.g., ['asthma', 'elderly']
        };

        const response = await fetch('/api/aqi/ai-recommendation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const data = await response.json();
            displayCustomRecommendation(data.recommendation);
        } else {
            // Fallback to default recommendation
            displayCustomRecommendation(getDefaultRecommendation(aqi));
        }
    } catch (error) {
        console.error('AI Recommendation error:', error);
        displayCustomRecommendation(getDefaultRecommendation(aqi));
    }
}

function displayCustomRecommendation(recommendation) {
    const recommendationElement = document.getElementById('customRecommendation');
    recommendationElement.textContent = recommendation;
}

function getDefaultRecommendation(aqi) {
    if (aqi <= 50) {
        return "🌟 Excellent news! The air quality today is outstanding. This is the perfect opportunity to engage in outdoor activities, exercise, and enjoy nature. Take advantage of this clean air!";
    } else if (aqi <= 100) {
        return "👍 Air quality is acceptable for most people. You can proceed with your normal outdoor activities. However, if you're unusually sensitive to air pollution, consider limiting very intense or prolonged outdoor activities.";
    } else if (aqi <= 150) {
        return "⚠️ Sensitive individuals should take precautions. If you have respiratory conditions like asthma, are elderly, or have children, consider reducing prolonged outdoor activities. Everyone else can generally maintain normal activities.";
    } else if (aqi <= 200) {
        return "🚨 Air quality is unhealthy for everyone. Reduce time spent outdoors, especially strenuous activities. Children, elderly, and those with respiratory or heart conditions should avoid prolonged outdoor exposure. Consider wearing an N95 mask if you must go outside.";
    } else if (aqi <= 300) {
        return "⛔ Very unhealthy air quality alert! Everyone should minimize outdoor exposure. Avoid all strenuous outdoor activities. Keep windows and doors closed. Use air purifiers indoors. If you must go outside, wear a properly fitted N95 or N99 mask.";
    } else {
        return "☠️ HAZARDOUS CONDITIONS - This is a health emergency! Avoid all outdoor activities. Stay indoors with windows and doors sealed. Run air purifiers continuously. If you experience any respiratory symptoms, seek medical attention immediately. Consider evacuation if you have severe respiratory or heart conditions.";
    }
}

// ========== AQI Category Functions ==========
function getAQICategory(aqi) {
    if (aqi <= 50) return { category: 'Good', class: 'aqi-good' };
    if (aqi <= 100) return { category: 'Moderate', class: 'aqi-moderate' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy-sensitive' };
    if (aqi <= 200) return { category: 'Unhealthy', class: 'aqi-unhealthy' };
    if (aqi <= 300) return { category: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { category: 'Hazardous', class: 'aqi-hazardous' };
}

function getRecommendations(aqi) {
    if (aqi <= 50) {
        return [
            { 
                icon: '✅', 
                title: 'Excellent Air Quality', 
                desc: 'Air quality is ideal for most activities. Perfect time to enjoy the outdoors!' 
            },
            { 
                icon: '🏃', 
                title: 'Perfect for Outdoor Activities', 
                desc: 'Great conditions for running, cycling, sports, and all outdoor exercises.' 
            },
            { 
                icon: '🪟', 
                title: 'Fresh Air Ventilation', 
                desc: 'Open windows to circulate fresh air throughout your home or workplace.' 
            },
            { 
                icon: '👨‍👩‍👧‍👦', 
                title: 'Safe for Everyone', 
                desc: 'Air quality poses no risk to any population groups, including sensitive individuals.' 
            }
        ];
    } else if (aqi <= 100) {
        return [
            { 
                icon: '⚠️', 
                title: 'Moderate Air Quality', 
                desc: 'Air quality is acceptable for most people. Unusually sensitive individuals should consider precautions.' 
            },
            { 
                icon: '🏃', 
                title: 'Generally Safe Activities', 
                desc: 'Most people can enjoy normal outdoor activities without restrictions.' 
            },
            { 
                icon: '👶', 
                title: 'Sensitive Groups Monitor', 
                desc: 'People with respiratory conditions should watch for symptoms and limit prolonged outdoor exertion if needed.' 
            },
            { 
                icon: '🪟', 
                title: 'Moderate Ventilation', 
                desc: 'It\'s safe to open windows, but sensitive individuals may prefer to limit exposure during peak hours.' 
            }
        ];
    } else if (aqi <= 150) {
        return [
            { 
                icon: '⚠️', 
                title: 'Unhealthy for Sensitive Groups', 
                desc: 'People with respiratory or heart conditions, children, and elderly may experience health effects.' 
            },
            { 
                icon: '😷', 
                title: 'Masks Recommended', 
                desc: 'Sensitive individuals should wear N95 or KN95 masks when spending time outdoors.' 
            },
            { 
                icon: '🏠', 
                title: 'Limit Outdoor Exposure', 
                desc: 'Reduce prolonged or heavy outdoor physical activities, especially for sensitive groups.' 
            },
            { 
                icon: '🪟', 
                title: 'Keep Windows Closed', 
                desc: 'Prevent outdoor air from entering. Use air conditioning with proper filtration instead.' 
            },
            { 
                icon: '💊', 
                title: 'Monitor Symptoms', 
                desc: 'People with asthma should have their rescue inhaler available and watch for breathing difficulties.' 
            }
        ];
    } else if (aqi <= 200) {
        return [
            { 
                icon: '🚨', 
                title: 'Unhealthy Air Quality', 
                desc: 'Everyone may experience health effects. Sensitive groups may experience more serious effects.' 
            },
            { 
                icon: '😷', 
                title: 'Masks Essential Outdoors', 
                desc: 'Everyone should wear N95 or KN95 masks when going outside. Ensure proper fit.' 
            },
            { 
                icon: '🏠', 
                title: 'Stay Indoors', 
                desc: 'Avoid all outdoor activities. Children, elderly, and those with health conditions should remain indoors.' 
            },
            { 
                icon: '💨', 
                title: 'Use Air Purifiers', 
                desc: 'Run HEPA air purifiers indoors to maintain clean air. Keep doors and windows sealed.' 
            },
            { 
                icon: '🚫', 
                title: 'Cancel Outdoor Events', 
                desc: 'Postpone outdoor sports, exercise, and recreational activities until air quality improves.' 
            },
            { 
                icon: '💊', 
                title: 'Health Monitoring', 
                desc: 'Watch for symptoms like coughing, throat irritation, or breathing difficulties. Have medications ready.' 
            }
        ];
    } else if (aqi <= 300) {
        return [
            { 
                icon: '🚨', 
                title: 'Very Unhealthy Air', 
                desc: 'Health alert: Risk of health effects is significantly increased for everyone.' 
            },
            { 
                icon: '🏠', 
                title: 'Mandatory Indoor Stay', 
                desc: 'Everyone should avoid all outdoor activities. Stay indoors with air purification running.' 
            },
            { 
                icon: '😷', 
                title: 'N95/N99 Masks Required', 
                desc: 'If you absolutely must go outside, wear properly fitted N95 or N99 respirator masks.' 
            },
            { 
                icon: '💨', 
                title: 'Air Purification Critical', 
                desc: 'Keep HEPA air purifiers running continuously. Seal all gaps around doors and windows.' 
            },
            { 
                icon: '🏥', 
                title: 'Health Vigilance', 
                desc: 'Monitor for symptoms like chest pain, shortness of breath, severe coughing, or wheezing.' 
            },
            { 
                icon: '🚗', 
                title: 'Avoid Vehicle Emissions', 
                desc: 'Limit driving and use of gas-powered equipment to reduce additional pollution.' 
            },
            { 
                icon: '📞', 
                title: 'Emergency Contacts Ready', 
                desc: 'Have emergency medical contacts available. Seek immediate help if experiencing severe symptoms.' 
            }
        ];
    } else {
        return [
            { 
                icon: '☠️', 
                title: 'Hazardous Conditions - Emergency', 
                desc: 'Severe health warning: Emergency conditions. Everyone is likely to be affected.' 
            },
            { 
                icon: '🚫', 
                title: 'Do NOT Go Outside', 
                desc: 'Absolutely avoid all outdoor exposure. This is a public health emergency. Stay indoors!' 
            },
            { 
                icon: '💨', 
                title: 'Maximum Air Purification', 
                desc: 'Run multiple HEPA air purifiers continuously. Create a clean air room. Seal all openings completely.' 
            },
            { 
                icon: '😷', 
                title: 'Emergency Masks Only', 
                desc: 'If evacuation is necessary, use N95/N99/P100 respirators with proper seal. Minimize outdoor time.' 
            },
            { 
                icon: '🏥', 
                title: 'Medical Emergency Protocol', 
                desc: 'Seek immediate medical attention for any respiratory symptoms, chest pain, or difficulty breathing.' 
            },
            { 
                icon: '📞', 
                title: 'Emergency Services', 
                desc: 'Keep emergency numbers ready. Consider evacuation if you have severe respiratory or heart conditions.' 
            },
            { 
                icon: '🚨', 
                title: 'Follow Official Guidance', 
                desc: 'Monitor official health advisories and emergency broadcasts for evacuation orders and safety instructions.' 
            },
            { 
                icon: '👥', 
                title: 'Check on Vulnerable People', 
                desc: 'Ensure elderly neighbors, children, and those with health conditions have adequate protection and support.' 
            }
        ];
    }
}

// ========== Data Display Functions ==========
function displayAQIData(data) {
    currentAQIData = data;
    
    // Update city name and time
    const cityName = data.city?.name || 'Unknown Location';
    document.getElementById('cityName').textContent = cityName;
    
    const updateTime = data.time?.s || 'Unknown';
    document.getElementById('updateTimeText').textContent = `Updated: ${updateTime}`;

    // Update AQI display
    const aqi = data.aqi || 0;
    const aqiInfo = getAQICategory(aqi);
    
    const aqiDisplay = document.getElementById('aqiDisplay');
    aqiDisplay.className = `aqi-display ${aqiInfo.class}`;
    document.getElementById('aqiValue').textContent = aqi;
    document.getElementById('aqiCategory').textContent = aqiInfo.category;

    // Update weather information
    displayWeatherInfo(data.iaqi, data.enhanced_weather);

    // Update pollutants
    displayPollutants(data.iaqi);

    // Update dominant pollutant
    displayDominantPollutant(data.dominentpol);

    // Update recommendations
    displayRecommendations(aqi);

    showSuccess();
}

function displayWeatherInfo(iaqi, enhancedWeather) {
    const weatherInfo = document.getElementById('weatherInfo');
    weatherInfo.innerHTML = '';
    
    if (!iaqi) {
        weatherInfo.innerHTML = '<p style="text-align: center; color: #6b7280;">Weather data not available</p>';
        return;
    }

    const weatherData = [
        { 
            label: 'Temperature', 
            value: iaqi.t?.v !== undefined ? `${iaqi.t.v}°C` : 'N/A',
            icon: '🌡️'
        },
        { 
            label: 'Humidity', 
            value: iaqi.h?.v !== undefined ? `${iaqi.h.v}%` : 'N/A',
            icon: '💧'
        },
        { 
            label: 'Pressure', 
            value: iaqi.p?.v !== undefined ? `${iaqi.p.v} hPa` : 'N/A',
            icon: '🔽'
        },
        { 
            label: 'Wind Speed', 
            value: iaqi.w?.v !== undefined ? `${iaqi.w.v} m/s` : 'N/A',
            icon: '💨'
        }
    ];

    // Add weather description if available
    if (enhancedWeather && enhancedWeather.description) {
        weatherData.push({
            label: 'Conditions',
            value: enhancedWeather.description.charAt(0).toUpperCase() + enhancedWeather.description.slice(1),
            icon: '🌤️'
        });
    }

    weatherData.forEach(item => {
        const weatherItem = document.createElement('div');
        weatherItem.className = 'weather-item';
        weatherItem.innerHTML = `
            <div class="weather-item-label">${item.icon} ${item.label}</div>
            <div class="weather-item-value">${item.value}</div>
        `;
        weatherInfo.appendChild(weatherItem);
    });
}

function displayPollutants(iaqi) {
    const pollutantsGrid = document.getElementById('pollutantsGrid');
    pollutantsGrid.innerHTML = '';

    if (!iaqi) {
        pollutantsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">Pollutant data not available</p>';
        return;
    }

    const pollutantMapping = {
        pm25: { name: 'PM2.5', unit: 'µg/m³', desc: 'Fine Particles' },
        pm10: { name: 'PM10', unit: 'µg/m³', desc: 'Coarse Particles' },
        o3: { name: 'O₃', unit: 'ppb', desc: 'Ozone' },
        no2: { name: 'NO₂', unit: 'ppb', desc: 'Nitrogen Dioxide' },
        so2: { name: 'SO₂', unit: 'ppb', desc: 'Sulfur Dioxide' },
        co: { name: 'CO', unit: 'ppm', desc: 'Carbon Monoxide' }
    };

    let hasData = false;

    Object.keys(pollutantMapping).forEach(key => {
        if (iaqi[key]?.v !== undefined) {
            hasData = true;
            const pollutant = pollutantMapping[key];
            const card = document.createElement('div');
            card.className = 'pollutant-card';
            card.innerHTML = `
                <div class="pollutant-name">${pollutant.name}</div>
                <div class="pollutant-value">${iaqi[key].v}</div>
                <div class="pollutant-unit">${pollutant.unit}</div>
            `;
            card.title = pollutant.desc;
            pollutantsGrid.appendChild(card);
        }
    });

    if (!hasData) {
        pollutantsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">Detailed pollutant data not available</p>';
    }
}

function displayDominantPollutant(dominentpol) {
    const pollutantCard = document.getElementById('dominantPollutantCard');
    const pollutantText = document.getElementById('dominantPollutant');
    
    if (!dominentpol) {
        pollutantCard.style.display = 'none';
        return;
    }

    const pollutantNames = {
        pm25: 'PM2.5 (Fine Particulate Matter)',
        pm10: 'PM10 (Coarse Particulate Matter)',
        o3: 'Ozone (O₃)',
        no2: 'Nitrogen Dioxide (NO₂)',
        so2: 'Sulfur Dioxide (SO₂)',
        co: 'Carbon Monoxide (CO)'
    };

    const pollutantName = pollutantNames[dominentpol] || dominentpol.toUpperCase();
    
    pollutantCard.style.display = 'flex';
    pollutantText.innerHTML = `<strong>Primary Pollutant:</strong> ${pollutantName} is the dominant contributor to the current Air Quality Index.`;
}

function displayRecommendations(aqi) {
    const recommendations = getRecommendations(aqi);
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = '';

    recommendations.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        item.innerHTML = `
            <div class="recommendation-icon">${rec.icon}</div>
            <div class="recommendation-text">
                <h4>${rec.title}</h4>
                <p>${rec.desc}</p>
            </div>
        `;
        recommendationsDiv.appendChild(item);
    });
}

// ========== Expandable Card Functions ==========
function toggleCard(cardId) {
    const card = document.getElementById(cardId);
    card.classList.toggle('expanded');
}

// ========== Event Listeners ==========
document.addEventListener('DOMContentLoaded', function() {
    const locationInput = document.getElementById('locationInput');
    
    // Enter key search
    locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchAQI();
        }
    });

    // Auto-focus input on page load
    locationInput.focus();
});

// ========== Utility Functions ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}