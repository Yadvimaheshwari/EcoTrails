# API Key Fallback System

## Overview

The EcoAtlas companion system now includes comprehensive fallback responses that allow the app to function gracefully even when:
- The Gemini API key is invalid or expired
- The API key has been reported as leaked
- The API key is missing
- There are network issues or API errors

## How It Works

### 1. Error Detection
The system detects API key errors by checking for:
- HTTP 403 status codes
- "PERMISSION_DENIED" errors
- "API key" in error messages

### 2. Fallback Responses
When an API error is detected, the system automatically switches to intelligent fallback responses based on:
- Park name and context
- Observation type (wildlife, plants, geology, etc.)
- Question category (safety, trails, weather, etc.)
- Time of day and season

### 3. Fallback Database
The system includes a fallback database with:
- Park information for major national parks
- Context-aware insights based on observation keywords
- Helpful answers to common questions
- Proactive suggestions
- Safety information

## Fallback Features

### Park Information (`get_fallback_park_info`)
- Pre-written introductions for major parks
- Generic fallback for any park
- Includes key features, wildlife, and best times to visit

### Insights (`get_fallback_insight`)
- Keyword-based detection (wildlife, plants, geology, water)
- Context-aware responses
- Educational and helpful

### Answers (`get_fallback_answer`)
- Category detection (safety, wildlife, trails, plants, weather)
- Park-specific context
- Helpful general advice

### Suggestions (`get_fallback_suggestion`)
- Time-of-day aware
- Park-specific
- Rotating helpful tips

### Safety (`get_fallback_safety_alert`)
- Conservative approach (only alerts for genuine concerns)
- Can be extended with weather/time checks

## Example Fallback Responses

### Park Info
```
"Welcome to Yosemite! This iconic park is famous for its granite cliffs, 
waterfalls, and giant sequoias. El Capitan and Half Dome are world-renowned 
rock formations..."
```

### Wildlife Observation
```
"I notice you're observing wildlife in [Park]. This park is home to diverse 
species. Remember to keep a safe distance and observe quietly. Early morning 
and dusk are often the best times to see animals."
```

### Safety Question
```
"In [Park], always stay on marked trails, carry plenty of water, and let 
someone know your plans. Weather can change quickly in natural areas, so be 
prepared..."
```

## Benefits

1. **Always Functional**: App works even without valid API key
2. **User Experience**: No error messages, just helpful responses
3. **Graceful Degradation**: Falls back to intelligent responses
4. **Context-Aware**: Responses consider park, time, and observations
5. **Educational**: Still provides valuable information

## Adding New Fallbacks

To add more fallback responses:

1. **Park Information**: Add to `PARK_INFO_FALLBACKS` dictionary in `companion_fallbacks.py`
2. **Insights**: Extend keyword detection in `get_fallback_insight()`
3. **Answers**: Add new categories in `get_fallback_answer()`
4. **Suggestions**: Add to suggestions array in `get_fallback_suggestion()`

## Testing

The fallback system is automatically tested when:
- API key is invalid (403 errors)
- API key is missing
- Network errors occur
- API rate limits are hit

## Status

✅ **Complete**: All companion endpoints now have graceful fallbacks
✅ **Tested**: Works with invalid/missing API keys
✅ **Documented**: This file explains the system

## Next Steps

To use a valid API key:
1. Get a new Gemini API key from Google AI Studio
2. Set it in your environment: `export API_KEY=your_new_key`
3. Restart the backend server
4. The system will automatically use the API when available

The app will continue to work with fallbacks until a valid key is provided!
