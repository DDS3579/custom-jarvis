from langchain.tools import tool
from datetime import datetime
import pytz
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
import asyncio

@tool
async def get_time(city: str) -> str:
    """Returns the current time in any given city worldwide."""
    try:
        # Look up city coordinates
        geolocator = Nominatim(user_agent="jarvis_assistant")
        
        # Run the synchronous geocode in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        location = await loop.run_in_executor(None, geolocator.geocode, city)
        
        if location is None:
            return f"Sorry, I couldn't find the city '{city}' on the map."
            
        # Find timezone based on GPS coordinates
        tf = TimezoneFinder()
        tz_name = tf.timezone_at(lng=location.longitude, lat=location.latitude)
        
        if not tz_name:
            return f"I found {city}, but couldn't determine its exact timezone."
            
        timezone = pytz.timezone(tz_name)
        current_time = datetime.now(timezone).strftime("%I:%M %p")
        return f"The current time in {city.title()} is {current_time}."
        
    except Exception as e:
        return f"Error fetching time for {city}: {str(e)}"