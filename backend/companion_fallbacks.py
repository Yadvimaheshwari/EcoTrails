"""
Fallback responses for companion when Gemini API is unavailable
Provides intelligent responses based on park data and context
"""
from typing import Dict, Any, Optional

# Park information database (fallback)
PARK_INFO_FALLBACKS: Dict[str, str] = {
    "Yosemite National Park": "Welcome to Yosemite! This iconic park is famous for its granite cliffs, waterfalls, and giant sequoias. El Capitan and Half Dome are world-renowned rock formations. The park is home to diverse wildlife including black bears, mule deer, and over 250 species of birds. Best times to visit are spring for waterfalls and fall for fewer crowds.",
    "Yellowstone National Park": "Welcome to Yellowstone, America's first national park! This geothermal wonderland features geysers, hot springs, and incredible wildlife including bison, elk, wolves, and grizzly bears. Old Faithful is the most famous geyser, erupting approximately every 90 minutes. The park spans three states and offers endless opportunities for exploration.",
    "Grand Canyon National Park": "Welcome to the Grand Canyon! This immense canyon carved by the Colorado River is one of the world's natural wonders. The South Rim is open year-round and offers spectacular views. The North Rim is higher in elevation and typically open May through October. Watch for California condors, one of the world's rarest birds.",
    "Great Smoky Mountains": "Welcome to the Great Smoky Mountains! This park straddles Tennessee and North Carolina and is known for its biodiversity - over 19,000 documented species. The mountains are blanketed in mist, giving them their 'smoky' appearance. Spring brings wildflowers, fall offers stunning foliage, and the park is home to black bears, elk, and over 200 species of birds.",
}

def get_fallback_park_info(park_name: str) -> str:
    """Get fallback park information"""
    # Try exact match
    if park_name in PARK_INFO_FALLBACKS:
        return PARK_INFO_FALLBACKS[park_name]
    
    # Try partial match
    for key, value in PARK_INFO_FALLBACKS.items():
        if park_name.lower() in key.lower() or key.lower() in park_name.lower():
            return value
    
    # Generic fallback
    return f"Welcome to {park_name}! This beautiful park offers incredible opportunities to explore nature, observe wildlife, and experience the great outdoors. I'm here to help you discover what makes this place special. Enjoy your hike!"

def get_fallback_insight(observation: Optional[str], park_name: str) -> str:
    """Generate fallback insight based on observation"""
    if not observation:
        return f"You're in {park_name} - a wonderful place to observe nature. Take your time to notice the details around you: the plants, the sounds, the way light moves through the landscape."
    
    observation_lower = observation.lower()
    
    # Wildlife-related
    if any(word in observation_lower for word in ["bird", "animal", "wildlife", "deer", "bear", "squirrel"]):
        return f"I notice you're observing wildlife in {park_name}. This park is home to diverse species. Remember to keep a safe distance and observe quietly. Early morning and dusk are often the best times to see animals."
    
    # Plant-related
    if any(word in observation_lower for word in ["tree", "plant", "flower", "vegetation", "forest"]):
        return f"The vegetation in {park_name} tells a story about the ecosystem. Different plants thrive in different conditions - notice how the landscape changes as you move through different elevations and terrain."
    
    # Geological
    if any(word in observation_lower for word in ["rock", "stone", "mountain", "cliff", "formation"]):
        return f"The geological features in {park_name} have been shaped over millions of years. These formations are a testament to the powerful forces of nature - erosion, uplift, and time."
    
    # Water-related
    if any(word in observation_lower for word in ["water", "stream", "river", "lake", "waterfall"]):
        return f"Water features in {park_name} are vital to the ecosystem. They provide habitat for many species and shape the landscape. Notice how life congregates near water sources."
    
    # Generic
    return f"That's an interesting observation in {park_name}! Nature is full of fascinating details. Take a moment to appreciate the complexity and beauty of this ecosystem."

def get_fallback_answer(question: str, park_name: str) -> str:
    """Generate fallback answer based on question"""
    question_lower = question.lower()
    
    # Safety questions
    if any(word in question_lower for word in ["safe", "danger", "risk", "hazard"]):
        return f"In {park_name}, always stay on marked trails, carry plenty of water, and let someone know your plans. Weather can change quickly in natural areas, so be prepared. If you encounter wildlife, keep your distance and never approach or feed animals."
    
    # Wildlife questions
    if any(word in question_lower for word in ["animal", "wildlife", "bird", "bear", "deer"]):
        return f"{park_name} is home to diverse wildlife. The best times to observe animals are typically early morning and evening. Always maintain a safe distance - at least 25 yards from most wildlife and 100 yards from predators like bears and wolves. Use binoculars for closer observation."
    
    # Trail questions
    if any(word in question_lower for word in ["trail", "hike", "path", "route", "distance"]):
        return f"Trails in {park_name} vary in difficulty. Always check trail conditions before starting, carry a map, and be prepared for changing weather. Start early to avoid crowds and have plenty of daylight. Remember: what goes down must come back up!"
    
    # Plant questions
    if any(word in question_lower for word in ["plant", "tree", "flower", "vegetation"]):
        return f"The plant life in {park_name} is diverse and adapted to the local climate and elevation. Different species bloom at different times of year. Many parks have field guides available to help identify plants. Remember: look but don't pick - leave plants for others to enjoy."
    
    # Weather questions
    if any(word in question_lower for word in ["weather", "rain", "snow", "temperature", "forecast"]):
        return f"Weather in {park_name} can change quickly, especially at higher elevations. Always check the forecast before heading out and be prepared for sudden changes. Layer your clothing so you can adjust as conditions change. If severe weather approaches, seek shelter immediately."
    
    # Generic
    return f"That's a great question about {park_name}! While I'd love to give you a detailed answer, I'm currently working with limited information. For the best experience, I recommend checking with park rangers or visitor centers for specific information. In general, take your time, stay safe, and enjoy the natural beauty around you!"

def get_fallback_suggestion(context: Dict[str, Any]) -> Optional[str]:
    """Generate fallback suggestion based on context"""
    park_name = context.get("parkName", "this park")
    time_of_day = context.get("timeOfDay", "daytime")
    
    suggestions = [
        f"Take a moment to pause and observe your surroundings in {park_name}. Nature reveals itself slowly to those who take the time to notice.",
        f"Early {time_of_day} is often the best time to see wildlife in {park_name}. Keep your eyes and ears open!",
        f"Remember to stay hydrated and take breaks. Hiking in {park_name} is about the journey, not just the destination.",
        f"Notice how the landscape changes as you move through {park_name}. Each area has its own character and ecosystem.",
    ]
    
    # Return a random suggestion (for now, just return the first one)
    # In production, could rotate or be more context-aware
    return suggestions[0] if context else None

def get_fallback_safety_alert(context: Dict[str, Any]) -> Optional[str]:
    """Generate fallback safety alert if needed"""
    # Only return alerts for genuine safety concerns
    # For now, return None (safe conditions)
    # Could check weather, time of day, etc.
    return None
