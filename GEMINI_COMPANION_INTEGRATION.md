# Gemini AI Companion Integration

## Overview

EcoAtlas now features a deeply integrated **Gemini AI companion** named "Atlas" that acts as an intelligent hiking companion. Atlas knows everything about nature, parks, trails, wildlife, geology, botany, and outdoor safety.

## Features

### 1. Intelligent Real-Time Insights ✅
- **Contextual Observations**: Analyzes surroundings and provides meaningful insights
- **Visual Analysis**: Can process images to identify wildlife, plants, geological features
- **Ecosystem Connections**: Links observations to broader ecological patterns
- **Category Detection**: Automatically categorizes insights (wildlife, geology, botany, safety)

### 2. Proactive Suggestions ✅
- **Context-Aware**: Suggestions based on current location, time, weather, and conditions
- **Helpful Tips**: What to look for, safety tips, interesting features nearby
- **Wildlife Timing**: Best times to see wildlife
- **Trail Conditions**: Current trail and weather conditions
- **Auto-Dismiss**: Suggestions appear and auto-dismiss after 10 seconds

### 3. Conversational Interface ✅
- **Ask Anything**: Natural language questions about nature, trails, wildlife, etc.
- **Contextual Answers**: Responses consider current location and park
- **Conversation History**: Maintains context across conversation
- **Park Welcome**: Warm introduction when starting a hike

### 4. Educational Content ✅
- **Learn on the Trail**: Educational information about observed features
- **Ecosystem Understanding**: Explains why things matter in the ecosystem
- **Accessible Language**: Makes complex topics understandable

### 5. Safety Monitoring ✅
- **Proactive Safety Checks**: Monitors conditions every 5 minutes
- **Weather Hazards**: Alerts about dangerous weather
- **Trail Conditions**: Warns about unsafe trail conditions
- **Wildlife Activity**: Alerts about potentially dangerous wildlife
- **Time-of-Day Concerns**: Safety tips based on time

### 6. Park Information ✅
- **Comprehensive Introductions**: Detailed information about each park
- **Key Features**: Highlights what makes each park special
- **Best Times to Visit**: Recommendations for optimal experience
- **What to Know**: Important information for hikers

## Backend Endpoints

### `/api/v1/companion/insight`
- **POST**: Get intelligent insight about an observation
- **Input**: observation, location, image (optional), context
- **Output**: insight text, priority, category, metadata

### `/api/v1/companion/ask`
- **POST**: Ask the companion a question
- **Input**: question, context, conversationHistory
- **Output**: answer text

### `/api/v1/companion/suggest`
- **POST**: Get proactive suggestion
- **Input**: context, conversationHistory
- **Output**: suggestion text, priority, category (or null if nothing useful)

### `/api/v1/companion/educate`
- **POST**: Get educational information
- **Input**: topic, category, context
- **Output**: educational info text

### `/api/v1/companion/safety`
- **POST**: Check safety conditions
- **Input**: context (park, weather, location, time)
- **Output**: alert text and priority (or null if safe)

### `/api/v1/companion/park-info`
- **POST**: Get park information
- **Input**: parkName
- **Output**: comprehensive park introduction

## Mobile App Integration

### Companion Service (`GeminiCompanionService.ts`)
- Manages all companion interactions
- Maintains conversation history
- Handles context updates
- Provides fallback responses

### Companion Chat Component (`CompanionChat.tsx`)
- Full-screen chat interface
- Message history
- Real-time responses
- Keyboard-aware scrolling

### ActiveHikeScreen Integration
- **Real-time Insights**: Displays companion observations
- **Proactive Suggestions**: Shows helpful tips automatically
- **Chat Button**: "Ask Atlas" button to open chat
- **Safety Alerts**: Automatic safety monitoring
- **Context Updates**: Updates companion context as location changes

## How It Works

### System Instruction
The companion uses a carefully crafted system instruction that makes it:
- Knowledgeable about nature, parks, trails, wildlife, geology, botany
- Friendly and conversational
- Proactive with helpful suggestions
- Safety-focused
- Educational and accessible

### Agent Integration
Uses existing EcoAtlas agents:
- **Observer**: For visual analysis and insights
- **Bard**: For conversational responses and narrative synthesis
- **Spatial**: For location-based context (when needed)

### Context Awareness
Companion considers:
- Current park
- GPS location
- Time of day
- Season
- Weather conditions
- Recent observations
- Conversation history

## User Experience

### During Hike
1. **Welcome Message**: Park introduction when hike starts
2. **Real-Time Insights**: Companion observations appear automatically
3. **Proactive Suggestions**: Helpful tips appear periodically
4. **Safety Alerts**: Automatic safety monitoring
5. **Ask Questions**: Tap "Ask Atlas" to chat anytime

### Chat Interface
- Natural conversation
- Context-aware responses
- Educational information
- Trail recommendations
- Wildlife identification
- Safety advice

## Example Interactions

**User**: "What kind of tree is that?"
**Atlas**: "That's a Ponderosa Pine! You can tell by the long needles in bundles of three and the distinctive orange bark that peels in puzzle-like pieces. These trees are fire-adapted - their thick bark helps them survive wildfires. In this park, they're a keystone species, providing habitat for many birds and small mammals."

**User**: "Is it safe to hike here right now?"
**Atlas**: "Yes, conditions look good! The trail is well-maintained and weather is clear. However, since it's late afternoon, keep an eye out for wildlife - many animals are more active around dusk. Make sure you have enough daylight to return safely."

**Proactive Suggestion**: "The wildflowers along this trail are particularly vibrant right now. This is peak bloom season for lupines and paintbrush. If you pause for a moment, you might spot pollinators like bumblebees and hummingbirds."

## Technical Details

### Models Used
- **gemini-3-pro-preview**: For complex reasoning and narrative synthesis
- **gemini-3-flash-preview**: For quick observations
- **Observer Agent**: For visual analysis with images

### Response Format
- **Insights**: Brief, engaging, 1-2 sentences
- **Answers**: Detailed but accessible, 2-4 sentences
- **Suggestions**: Actionable, 1-2 sentences
- **Safety Alerts**: Clear and urgent when needed

### Performance
- **Async Processing**: All companion calls are async
- **Caching**: Conversation history maintained in memory
- **Error Handling**: Graceful fallbacks if API unavailable
- **Rate Limiting**: Suggestions and safety checks are throttled

## Future Enhancements

Potential additions:
- Voice interaction
- Image recognition from camera
- Offline mode with cached responses
- Personalized recommendations
- Trail difficulty analysis
- Weather integration
- Wildlife tracking
- Photo analysis
- Trail condition reports
- Group hiking features

## Status: ✅ Complete

The Gemini AI companion is fully integrated and ready to enhance every hiking experience with intelligent, contextual, and helpful insights!
