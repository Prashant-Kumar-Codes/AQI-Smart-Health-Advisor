// ========== Global State ==========
let currentAQIData = null;
let aiAdvisorData = {
    age: null,
    ageGroup: null,
    gender: null,
    timeOutside: null,
    conditions: [],
    location: '',
    customQuestion: ''
};
let isUserLoggedIn = false; // Track login status

// ========== Location Functions ==========
async function getCurrentLocationAI() {
    if (!navigator.geolocation) {
        showValidationError('Geolocation is not supported by your browser. Please enter location manually.');
        return;
    }

    const locationInput = document.getElementById('aiAdvisorLocation');
    const originalValue = locationInput.value;
    locationInput.value = 'Getting your location...';
    locationInput.disabled = true;

    const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                
                const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&addressdetails=1`;
                const geoResponse = await fetch(geocodeUrl);
                const geoData = await geoResponse.json();
                
                const cityName = geoData.address?.city || 
                                geoData.address?.town || 
                                geoData.address?.village || 
                                geoData.address?.municipality ||
                                geoData.address?.county ||
                                geoData.address?.state || 
                                'Current Location';
                
                locationInput.value = cityName;
                aiAdvisorData.location = cityName;
                locationInput.disabled = false;
                
                console.log('Current location set to:', cityName);
                
            } catch (error) {
                console.error('Geocoding error:', error);
                locationInput.value = originalValue;
                locationInput.disabled = false;
                showValidationError('Failed to get location. Please enter manually.');
            }
        },
        (error) => {
            locationInput.value = originalValue;
            locationInput.disabled = false;
            
            let errorMessage = 'Unable to retrieve your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Request timed out.';
                    break;
                default:
                    errorMessage += 'Unknown error.';
            }
            showValidationError(errorMessage);
        },
        options
    );
}

async function fetchAQIForLocation(cityName, lat, lng) {
    try {
        let response;
        
        if (lat && lng) {
            response = await fetch(`/api/aqi/geo?lat=${lat}&lng=${lng}`);
        } else {
            response = await fetch(`/api/aqi/city/${encodeURIComponent(cityName)}`);
        }
        
        if (response.ok) {
            const data = await response.json();
            currentAQIData = data;
            console.log('AQI data fetched:', data);
            displayAQISummary(data);
            return data;
        } else {
            console.warn('Could not fetch AQI data for location');
            return null;
        }
    } catch (error) {
        console.error('Error fetching AQI data:', error);
        return null;
    }
}

function displayAQISummary(data) {
    const summaryDiv = document.getElementById('aqiSummary');
    const summaryContent = document.getElementById('aqiSummaryContent');
    
    if (!summaryDiv || !summaryContent) return;
    
    const aqi = data.aqi || 0;
    const cityName = data.city?.name || aiAdvisorData.location || 'Selected Location';
    const category = getAQICategory(aqi).category;
    
    let summaryHTML = `
        <p><strong>Location:</strong> ${cityName}</p>
        <p><strong>AQI:</strong> ${aqi} (${category})</p>
    `;
    
    if (data.iaqi) {
        if (data.iaqi.pm25?.v) summaryHTML += `<p><strong>PM2.5:</strong> ${data.iaqi.pm25.v.toFixed(1)} µg/m³</p>`;
        if (data.iaqi.pm10?.v) summaryHTML += `<p><strong>PM10:</strong> ${data.iaqi.pm10.v.toFixed(1)} µg/m³</p>`;
    }
    
    summaryContent.innerHTML = summaryHTML;
    summaryDiv.style.display = 'block';
}

function getAQICategory(aqi) {
    if (aqi <= 50) return { category: 'Good', class: 'aqi-good' };
    if (aqi <= 100) return { category: 'Moderate', class: 'aqi-moderate' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy-sensitive' };
    if (aqi <= 200) return { category: 'Unhealthy', class: 'aqi-unhealthy' };
    if (aqi <= 300) return { category: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { category: 'Hazardous', class: 'aqi-hazardous' };
}

// ========== Age Selection Functions ==========
window.selectAgeGroup = function(ageGroup, ageRange) {
    console.log('selectAgeGroup called:', ageGroup, ageRange);
    
    // Remove selected class from all age buttons
    document.querySelectorAll('.age-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    const btn = document.querySelector(`[data-age="${ageGroup}"]`);
    if (btn) {
        btn.classList.add('selected');
        console.log('Button selected:', btn);
    }
    
    // Clear specific age input
    const specificAgeInput = document.getElementById('specificAge');
    if (specificAgeInput) {
        specificAgeInput.value = '';
    }
    
    // Update global state
    aiAdvisorData.ageGroup = ageGroup;
    aiAdvisorData.age = null;
    
    console.log('Age group selected:', ageGroup, 'State:', aiAdvisorData);
};

window.clearAgeGroupSelection = function() {
    console.log('clearAgeGroupSelection called');
    
    // Remove selected class from all age group buttons
    document.querySelectorAll('.age-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Get specific age value
    const specificAgeInput = document.getElementById('specificAge');
    if (specificAgeInput) {
        const specificAge = parseInt(specificAgeInput.value);
        if (specificAge && specificAge >= 1 && specificAge <= 120) {
            aiAdvisorData.age = specificAge;
            aiAdvisorData.ageGroup = null;
            console.log('Specific age selected:', specificAge);
        } else {
            aiAdvisorData.age = null;
            aiAdvisorData.ageGroup = null;
        }
    }
};

// ========== Gender Selection Function ==========
window.selectGender = function(gender) {
    console.log('selectGender called:', gender);
    
    // Remove selected class from all gender buttons
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    const btn = document.querySelector(`[data-gender="${gender}"]`);
    if (btn) {
        btn.classList.add('selected');
        console.log('Gender button selected:', btn);
    }
    
    // Update global state
    aiAdvisorData.gender = gender;
    console.log('Gender selected:', gender, 'State:', aiAdvisorData);
};

// ========== Time Outside Selection Function ==========
window.selectTimeOutside = function(timeRange) {
    console.log('selectTimeOutside called:', timeRange);
    
    // Remove selected class from all time buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    const btn = document.querySelector(`[data-time="${timeRange}"]`);
    if (btn) {
        btn.classList.add('selected');
        console.log('Time button selected:', btn);
    }
    
    // Update global state
    aiAdvisorData.timeOutside = timeRange;
    console.log('Time outside selected:', timeRange, 'State:', aiAdvisorData);
};

// ========== Health Condition Selection Function ==========
window.toggleCondition = function(condition) {
    console.log('toggleCondition called:', condition);
    
    const btn = document.querySelector(`[data-condition="${condition}"]`);
    if (!btn) {
        console.error('Button not found for condition:', condition);
        return;
    }
    
    if (condition === 'none') {
        // If 'none' is clicked, deselect all other conditions
        document.querySelectorAll('.condition-btn').forEach(b => {
            b.classList.remove('selected');
        });
        btn.classList.add('selected');
        aiAdvisorData.conditions = ['none'];
    } else {
        // Deselect 'none' button if any specific condition is selected
        const noneBtn = document.querySelector('[data-condition="none"]');
        if (noneBtn) noneBtn.classList.remove('selected');
        
        // Toggle the clicked button
        btn.classList.toggle('selected');
        
        // Update conditions array
        aiAdvisorData.conditions = Array.from(document.querySelectorAll('.condition-btn.selected'))
            .map(b => b.dataset.condition)
            .filter(c => c !== 'none');
        
        // If no conditions selected, select 'none'
        if (aiAdvisorData.conditions.length === 0 && noneBtn) {
            noneBtn.classList.add('selected');
            aiAdvisorData.conditions = ['none'];
        }
    }
    
    console.log('Conditions selected:', aiAdvisorData.conditions, 'State:', aiAdvisorData);
};

// ========== Quick Question Functions ==========
window.askQuickQuestion = function(question) {
    console.log('askQuickQuestion called:', question);
    
    const textarea = document.getElementById('customQuestion');
    if (!textarea) {
        console.error('Textarea not found');
        return;
    }
    
    textarea.value = question;
    aiAdvisorData.customQuestion = question;
    updateWordCount();

    // Visual feedback
    textarea.focus();
    textarea.style.transition = 'background-color 0.3s';
    textarea.style.backgroundColor = '#f0fdf4';
    setTimeout(() => {
        textarea.style.backgroundColor = '#f9fafb';
    }, 300);

    console.log('Quick question selected:', question, 'State:', aiAdvisorData);
};

function updateWordCount() {
    const textarea = document.getElementById('customQuestion');
    if (!textarea) return;
    
    const text = textarea.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const count = words.length;
    const wordCountElement = document.getElementById('wordCount');
    
    if (!wordCountElement) return;
    
    wordCountElement.textContent = `${count}/30 words`;

    if (count > 30) {
        wordCountElement.style.color = '#dc2626';
        wordCountElement.style.fontWeight = '700';
    } else {
        wordCountElement.style.color = '#6b7280';
        wordCountElement.style.fontWeight = '600';
    }

    aiAdvisorData.customQuestion = text;
}

// ========== Main AI Advice Function ==========
window.getAIAdvice = async function() {
    console.log('=== Get AI Advice clicked ===');
    console.log('Current state:', aiAdvisorData);
    console.log('User logged in:', isUserLoggedIn);
    
    // ==========================================
    // CRITICAL: CHECK LOGIN STATUS FIRST
    // ==========================================
    if (!isUserLoggedIn) {
        console.log('❌ User not logged in - showing alert');
        
        // Show confirmation dialog
        const userConfirmed = confirm(
            'You need to login to use Personalized AI Advice.\n\n' +
            'Click OK to go to login page, or Cancel to stay here.'
        );
        
        if (userConfirmed) {
            // User clicked OK - redirect to login
            console.log('User chose to login - redirecting...');
            window.location.href = '/login_signup?redirect=ai_advisor';
        } else {
            // User clicked Cancel - do nothing, stay on page
            console.log('User cancelled login - staying on page');
        }
        
        // Stop execution here - don't proceed with AI advice
        return;
    }
    
    // User is logged in - proceed with validation and API call
    console.log('✓ User is logged in - proceeding with AI advice');
    
    // Validate location
    const locationInput = document.getElementById('aiAdvisorLocation');
    if (!locationInput) {
        console.error('Location input not found');
        return;
    }
    
    const location = locationInput.value.trim();
    if (!location) {
        showValidationError('Please enter a location first');
        return;
    }

    aiAdvisorData.location = location;

    // Show loading immediately
    const responseDiv = document.getElementById('aiResponse');
    const responseContent = document.getElementById('aiResponseContent');
    
    if (!responseDiv || !responseContent) {
        console.error('Response elements not found');
        return;
    }
    
    responseContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="spinner"></div>
            <p style="margin-top: 15px; font-weight: 600;">Fetching air quality data...</p>
        </div>
    `;
    responseDiv.style.display = 'block';
    
    setTimeout(() => {
        responseDiv.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 100);

    // Fetch AQI data for the location
    console.log('Fetching AQI data for:', location);
    const aqiData = await fetchAQIForLocation(location);

    if (!aqiData) {
        showValidationError('Unable to fetch air quality data for this location. Please try another location.');
        return;
    }

    currentAQIData = aqiData;
    console.log('AQI data received:', aqiData);

    // Get age info
    let age = null;
    let ageGroup = null;

    const specificAgeInput = document.getElementById('specificAge');
    if (specificAgeInput) {
        const specificAge = parseInt(specificAgeInput.value);
        if (specificAge && specificAge >= 1 && specificAge <= 120) {
            age = specificAge;
        } else if (aiAdvisorData.ageGroup) {
            ageGroup = aiAdvisorData.ageGroup;
        }
    }

    // Validate question word count
    const customQuestion = document.getElementById('customQuestion');
    const customQ = customQuestion ? customQuestion.value.trim() : '';
    const words = customQ.split(/\s+/).filter(w => w.length > 0);

    if (words.length > 30) {
        showValidationError('Please limit your question to 30 words or less');
        return;
    }

    // Validate minimum input
    if (!customQ && aiAdvisorData.conditions.length === 0 && !age && !ageGroup && !aiAdvisorData.gender && !aiAdvisorData.timeOutside) {
        showValidationError('Please provide at least one input: select health conditions, enter age, select gender, time outside, or ask a question');
        return;
    }

    console.log('Request data:', {
        location,
        age,
        ageGroup,
        gender: aiAdvisorData.gender,
        timeOutside: aiAdvisorData.timeOutside,
        conditions: aiAdvisorData.conditions,
        question: customQ
    });

    // Update loading message
    responseContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="spinner"></div>
            <p style="margin-top: 15px; font-weight: 600;">Analyzing air quality data and generating personalized advice...</p>
        </div>
    `;

    // Prepare request data
    const requestData = {
        aqi: currentAQIData.aqi || 0,
        aqi_category: getAQICategory(currentAQIData.aqi || 0).category,
        pollutants: {
            pm25: currentAQIData?.iaqi?.pm25?.v || null,
            pm10: currentAQIData?.iaqi?.pm10?.v || null,
            o3: currentAQIData?.iaqi?.o3?.v || null,
            no2: currentAQIData?.iaqi?.no2?.v || null,
            so2: currentAQIData?.iaqi?.so2?.v || null,
            co: currentAQIData?.iaqi?.co?.v || null
        },
        dominant_pollutant: currentAQIData?.dominentpol || null,
        weather: {
            temperature: currentAQIData?.iaqi?.t?.v || null,
            humidity: currentAQIData?.iaqi?.h?.v || null,
            pressure: currentAQIData?.iaqi?.p?.v || null,
            wind_speed: currentAQIData?.iaqi?.w?.v || null,
            conditions: currentAQIData?.enhanced_weather?.description || null
        },
        city_name: currentAQIData?.city?.name || location,
        station_name: currentAQIData?.city?.name || null,
        location: location,
        age: age,
        age_group: ageGroup,
        gender: aiAdvisorData.gender,
        time_outside: aiAdvisorData.timeOutside,
        conditions: aiAdvisorData.conditions,
        question: customQ,
        update_time: currentAQIData?.time?.s || null
    };

    try {
        console.log('Sending POST request to /api/aqi/ai-personalized-advice');
        console.log('Request payload:', requestData);
        
        const response = await fetch('/api/aqi/ai-personalized-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('AI response received:', data);
            
            responseContent.innerHTML = formatAIAdviceForDisplay(data.advice);
            responseDiv.style.display = 'block';
            
            displayAQISummary(currentAQIData);
            
            setTimeout(() => {
                responseDiv.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
            
        } else if (response.status === 401) {
            // Server says not logged in (backup check)
            const errorData = await response.json();
            console.error('Server returned 401 - not logged in:', errorData);
            
            // This shouldn't happen if our client-side check works
            // But handle it anyway
            const userConfirmed = confirm(
                'You need to login to use Personalized AI Advice.\n\n' +
                'Click OK to go to login page, or Cancel to stay here.'
            );
            
            if (userConfirmed) {
                window.location.href = '/login_signup?redirect=ai_advisor';
            } else {
                responseDiv.style.display = 'none';
            }
            
        } else {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            responseContent.innerHTML = 
                `<div class="error-message">Failed to get AI advice: ${errorData.error || 'Unknown error. Please try again.'}</div>`;
        }
    } catch (error) {
        console.error('AI Advice error:', error);
        responseContent.innerHTML = 
            '<div class="error-message">Failed to get AI advice. Please check your connection and try again.</div>';
    }
};

// ========== Format AI Advice for Display ==========
function formatAIAdviceForDisplay(advice) {
    if (!advice) return '<p>No advice available</p>';
    
    let formatted = '<div class="ai-advice-formatted">';

    const sectionPattern = /(\d+)\.\s*\*\*([^*]+)\*\*\s*([^]*?)(?=\d+\.\s*\*\*|$)/g;
    const sections = [];
    let match;

    while ((match = sectionPattern.exec(advice)) !== null) {
        sections.push({
            number: match[1],
            title: match[2].trim(),
            content: match[3].trim()
        });
    }

    if (sections.length > 0) {
        sections.forEach(section => {
            formatted += `<div class="advice-section">`;
            formatted += `<h4 class="advice-section-title"><span class="section-number">${section.number}</span> ${section.title}</h4>`;
            
            const lines = section.content.split('\n').filter(line => line.trim());
            let inList = false;
            
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.match(/^[•\-*]\s+/) || trimmed.match(/^\d+\.\s+/)) {
                    if (!inList) {
                        formatted += '<ul class="advice-list">';
                        inList = true;
                    }
                    const listItem = trimmed.replace(/^[•\-*\d+\.]\s+/, '');
                    formatted += `<li>${listItem}</li>`;
                } else {
                    if (inList) {
                        formatted += '</ul>';
                        inList = false;
                    }
                    if (trimmed) {
                        formatted += `<p class="advice-section-text">${trimmed}</p>`;
                    }
                }
            });
            
            if (inList) {
                formatted += '</ul>';
            }
            
            formatted += `</div>`;
        });
    } else {
        const paragraphs = advice.split('\n\n').filter(p => p.trim());
        
        if (paragraphs.length === 0) {
            paragraphs.push(advice);
        }
        
        paragraphs.forEach(para => {
            const trimmed = para.trim();
            
            if (trimmed.includes('**')) {
                const headerMatch = trimmed.match(/\*\*([^*]+)\*\*/);
                if (headerMatch) {
                    const headerText = headerMatch[1];
                    const remainingText = trimmed.replace(/\*\*[^*]+\*\*/, '').trim();
                    
                    formatted += `<div class="advice-section">`;
                    formatted += `<h4 class="advice-section-title">${headerText}</h4>`;
                    if (remainingText) {
                        const lines = remainingText.split('\n');
                        let hasBullets = lines.some(l => l.trim().match(/^[•\-*]\s+/));
                        
                        if (hasBullets) {
                            formatted += '<ul class="advice-list">';
                            lines.forEach(line => {
                                const l = line.trim();
                                if (l.match(/^[•\-*]\s+/)) {
                                    formatted += `<li>${l.replace(/^[•\-*]\s+/, '')}</li>`;
                                }
                            });
                            formatted += '</ul>';
                        } else {
                            formatted += `<p class="advice-section-text">${remainingText}</p>`;
                        }
                    }
                    formatted += `</div>`;
                    return;
                }
            }
            
            const lines = trimmed.split('\n');
            let hasBullets = lines.some(l => l.trim().match(/^[•\-*]\s+/));
            
            if (hasBullets) {
                formatted += '<ul class="advice-list">';
                lines.forEach(line => {
                    const l = line.trim();
                    if (l.match(/^[•\-*]\s+/)) {
                        formatted += `<li>${l.replace(/^[•\-*]\s+/, '')}</li>`;
                    }
                });
                formatted += '</ul>';
            } else {
                formatted += `<p class="advice-text">${trimmed}</p>`;
            }
        });
    }

    formatted += '</div>';
    return formatted;
}

// ========== Validation Error Display ==========
function showValidationError(message) {
    const responseDiv = document.getElementById('aiResponse');
    const responseContent = document.getElementById('aiResponseContent');
    
    if (!responseDiv || !responseContent) return;
    
    responseContent.innerHTML = `<div class="validation-error">⚠️ ${message}</div>`;
    responseDiv.style.display = 'block';
    
    setTimeout(() => {
        responseDiv.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 100);

    // Auto-hide after 4 seconds
    setTimeout(() => {
        responseDiv.style.display = 'none';
    }, 4000);
}

// ========== Initialize on page load ==========
window.getCurrentLocationAI = getCurrentLocationAI;

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== AI Advisor page loaded ===');
    
    // Initialize location input
    const locationInput = document.getElementById('aiAdvisorLocation');
    if (locationInput) {
        locationInput.addEventListener('input', function() {
            aiAdvisorData.location = this.value;
            console.log('Location updated:', this.value);
        });
        
        locationInput.focus();
    }

    // Initialize specific age input
    const specificAgeInput = document.getElementById('specificAge');
    if (specificAgeInput) {
        specificAgeInput.addEventListener('input', window.clearAgeGroupSelection);
    }

    // Initialize custom question textarea
    const customQuestion = document.getElementById('customQuestion');
    if (customQuestion) {
        customQuestion.addEventListener('input', updateWordCount);
    }
    
    // Initialize word count
    updateWordCount();
    
    // Check login status and load user data
    checkLoginAndLoadData();
    
    console.log('=== Initialization complete ===');
});

// ========== Check Login Status and Load User Data ==========
async function checkLoginAndLoadData() {
    try {
        console.log('Checking login status...');
        
        const response = await fetch('/api/user/check');
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.logged_in) {
                // User IS logged in
                isUserLoggedIn = true;
                console.log('✓ User is logged in:', data);
                
                // Auto-fill user data from database
                if (data.city) {
                    const locationInput = document.getElementById('aiAdvisorLocation');
                    if (locationInput && !locationInput.value) {
                        locationInput.value = data.city;
                        aiAdvisorData.location = data.city;
                        console.log('Auto-filled location from DB:', data.city);
                    }
                }
                
                if (data.age) {
                    const ageInput = document.getElementById('specificAge');
                    if (ageInput && !ageInput.value) {
                        ageInput.value = data.age;
                        aiAdvisorData.age = data.age;
                        console.log('Auto-filled age from DB:', data.age);
                    }
                }
                
                if (data.gender && !aiAdvisorData.gender) {
                    window.selectGender(data.gender);
                    console.log('Auto-filled gender from DB:', data.gender);
                }
            } else {
                // User is NOT logged in
                isUserLoggedIn = false;
                console.log('⚠ User is not logged in');
            }
        } else {
            // API returned error - user not logged in
            isUserLoggedIn = false;
            console.log('⚠ User not logged in (API error)');
        }
    } catch (error) {
        // Network error or other issue
        isUserLoggedIn = false;
        console.log('⚠ Could not check login status:', error);
    }
}