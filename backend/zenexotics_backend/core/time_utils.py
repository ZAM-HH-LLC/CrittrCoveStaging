from datetime import datetime, time, timedelta
import pytz
from django.conf import settings
from typing import Union, Tuple, Optional, Dict, List
from users.models import UserSettings
from decimal import Decimal

def get_user_timezone(user_id: int) -> str:
    """Get the user's preferred timezone from settings."""
    try:
        user_settings = UserSettings.objects.get(user_id=user_id)
        return user_settings.timezone
    except UserSettings.DoesNotExist:
        return 'UTC'

def get_user_time_settings(user_id: int) -> Dict:
    """Get all time-related settings for a user."""
    try:
        user_settings = UserSettings.objects.get(user_id=user_id)
        return {
            'timezone': user_settings.timezone,
            'use_military_time': user_settings.use_military_time
        }
    except UserSettings.DoesNotExist:
        return {
            'timezone': 'UTC',
            'use_military_time': False
        }

def convert_to_utc(
    dt: Union[datetime, time],
    source_timezone: str,
) -> Union[datetime, time]:
    """
    Convert a datetime or time object from a source timezone to UTC.
    Always stores in military time format.
    
    Args:
        dt: The datetime or time object to convert
        source_timezone: The source timezone (e.g., 'America/Denver')
        
    Returns:
        The converted datetime or time object in UTC
    """
    if isinstance(dt, time):
        # Convert time to datetime for timezone conversion
        dummy_date = datetime.now().date()
        dt = datetime.combine(dummy_date, dt)
        is_time = True
    else:
        is_time = False
    
    # Make the datetime timezone-aware in the source timezone
    source_tz = pytz.timezone(source_timezone)
    if dt.tzinfo is None:
        dt = source_tz.localize(dt)
    
    # Convert to UTC
    utc_dt = dt.astimezone(pytz.UTC)
    
    # Return time object if input was time
    if is_time:
        return utc_dt.time()
    return utc_dt

def convert_from_utc(
    dt: Union[datetime, time],
    target_timezone: str,
) -> Union[datetime, time]:
    """
    Convert a UTC datetime or time object to a target timezone.
    
    Args:
        dt: The UTC datetime or time object to convert
        target_timezone: The target timezone (e.g., 'America/Denver')
        
    Returns:
        The converted datetime/time object
    """
    if isinstance(dt, time):
        # Convert time to datetime for timezone conversion
        dummy_date = datetime.now().date()
        dt = datetime.combine(dummy_date, dt)
        is_time = True
    else:
        is_time = False
    
    # Make the datetime timezone-aware in UTC if it isn't already
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)
    
    # Convert to target timezone
    target_tz = pytz.timezone(target_timezone)
    local_dt = dt.astimezone(target_tz)
    
    # Return time object if input was time
    if is_time:
        return local_dt.time()
    return local_dt

def format_time(t: time, use_military_time: bool = False) -> str:
    """
    Format a time object according to the user's preference.
    
    Args:
        t: The time object to format
        use_military_time: Whether to use 24-hour format
        
    Returns:
        Formatted time string
    """
    if use_military_time:
        return t.strftime('%H:%M')
    return t.strftime('%I:%M %p').lstrip('0')

def format_datetime_for_user(
    dt: datetime,
    user_id: int,
    include_timezone: bool = True
) -> str:
    """
    Format a datetime object according to user preferences.
    
    Args:
        dt: The datetime to format
        user_id: The user's ID to get their preferences
        include_timezone: Whether to include timezone abbreviation
        
    Returns:
        Formatted datetime string
    """
    settings = get_user_time_settings(user_id)
    local_dt = convert_from_utc(dt, settings['timezone'])
    
    time_format = '%H:%M' if settings['use_military_time'] else '%I:%M %p'
    formatted_time = local_dt.strftime(time_format).lstrip('0')
    formatted_date = local_dt.strftime('%b %d, %Y')
    
    if include_timezone:
        tz_abbrev = local_dt.tzname()
        return f"{formatted_date} ({formatted_time} {tz_abbrev})"
    return f"{formatted_date} ({formatted_time})"

def format_booking_occurrence(
    start_dt: datetime,
    end_dt: datetime,
    user_id: int
) -> Dict:
    """
    Format a booking occurrence with start and end times according to user preferences.
    
    Args:
        start_dt: Start datetime in UTC
        end_dt: End datetime in UTC
        user_id: The user's ID to get their preferences
        
    Returns:
        Dictionary containing formatted strings and duration
    """
    settings = get_user_time_settings(user_id)
    
    # Convert to user's timezone
    local_start = convert_from_utc(start_dt, settings['timezone'])
    local_end = convert_from_utc(end_dt, settings['timezone'])
    
    # Calculate duration
    duration = end_dt - start_dt
    days = duration.days
    hours = duration.seconds // 3600
    minutes = (duration.seconds % 3600) // 60
    
    # Build duration string
    duration_parts = []
    if days > 0:
        duration_parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        duration_parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        duration_parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    duration_str = ", ".join(duration_parts)
    
    # Format times
    time_format = '%H:%M' if settings['use_military_time'] else '%I:%M %p'
    formatted_start = f"{local_start.strftime('%b %d, %Y')} ({local_start.strftime(time_format).lstrip('0')})"
    formatted_end = f"{local_end.strftime('%b %d, %Y')} ({local_end.strftime(time_format).lstrip('0')})"
    
    return {
        'formatted_start': formatted_start,
        'formatted_end': formatted_end,
        'duration': duration_str,
        'timezone': local_start.tzname(),
        'start_datetime': local_start.isoformat(),
        'end_datetime': local_end.isoformat()
    }

def get_formatted_times(occurrence, user_id: int) -> Dict:
    """
    Get formatted times for a booking occurrence.
    
    Args:
        occurrence: The BookingOccurrence instance
        user_id: The user's ID to get their preferences
        
    Returns:
        Dictionary with formatted times and duration
    """
    start_dt = datetime.combine(occurrence.start_date, occurrence.start_time)
    end_dt = datetime.combine(occurrence.end_date, occurrence.end_time)
    
    # Make datetimes timezone-aware in UTC
    start_dt = pytz.UTC.localize(start_dt)
    end_dt = pytz.UTC.localize(end_dt)
    
    return format_booking_occurrence(start_dt, end_dt, user_id)

def set_times_from_local(occurrence, start_dt: datetime, end_dt: datetime, user_timezone: str):
    """
    Set the occurrence times from local datetime objects.
    Converts the times to UTC before storing.
    
    Args:
        occurrence: The BookingOccurrence instance to update
        start_dt: Local start datetime
        end_dt: Local end datetime
        user_timezone: The user's timezone
    """
    # Convert to UTC
    start_utc = convert_to_utc(start_dt, user_timezone)
    end_utc = convert_to_utc(end_dt, user_timezone)
    
    # Set the fields (always store in military time)
    occurrence.start_date = start_utc.date()
    occurrence.end_date = end_utc.date()
    occurrence.start_time = start_utc.time()
    occurrence.end_time = end_utc.time() 