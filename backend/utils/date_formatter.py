#!/usr/bin/env python3
"""
Date Formatting Utility for VERSANT Backend
Converts UTC dates to IST and formats them in a user-friendly way
"""

import pytz
from datetime import datetime
from typing import Union, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Timezone definitions
UTC = pytz.UTC
IST = pytz.timezone('Asia/Kolkata')

def format_date_to_ist(date_input: Union[str, datetime], format_type: str = 'readable') -> str:
    """
    Convert UTC date to IST and format it in a user-friendly way
    
    Args:
        date_input: Date string (ISO format) or datetime object
        format_type: 'readable', 'short', 'long', or 'time_only'
        
    Returns:
        Formatted date string in IST
        
    Examples:
        Input: "2025-09-24T13:00:00.775Z" (UTC)
        Output: "24th Sep 6:30 PM" (IST)
    """
    try:
        # Parse input date
        if isinstance(date_input, str):
            # Handle different date string formats
            if date_input.endswith('Z'):
                # ISO format with Z suffix
                date_input = date_input.replace('Z', '+00:00')
            
            # Parse the date string
            if '+' in date_input or date_input.endswith('Z'):
                dt = datetime.fromisoformat(date_input)
            else:
                # Assume UTC if no timezone info
                dt = datetime.fromisoformat(date_input)
                dt = UTC.localize(dt)
        elif isinstance(date_input, datetime):
            dt = date_input
            # If datetime is naive, assume UTC
            if dt.tzinfo is None:
                dt = UTC.localize(dt)
        else:
            raise ValueError(f"Unsupported date input type: {type(date_input)}")
        
        # Convert to IST
        if dt.tzinfo != IST:
            dt = dt.astimezone(IST)
        
        # Format based on type
        if format_type == 'readable':
            return _format_readable_date(dt)
        elif format_type == 'short':
            return _format_short_date(dt)
        elif format_type == 'long':
            return _format_long_date(dt)
        elif format_type == 'time_only':
            return _format_time_only(dt)
        else:
            return _format_readable_date(dt)
            
    except Exception as e:
        logger.error(f"Error formatting date {date_input}: {e}")
        return str(date_input)  # Return original if formatting fails

def _format_readable_date(dt: datetime) -> str:
    """Format date as '24th Sep 6:30 PM'"""
    # Get day with ordinal suffix
    day = dt.day
    if 4 <= day <= 20 or 24 <= day <= 30:
        suffix = "th"
    else:
        suffix = ["st", "nd", "rd"][day % 10 - 1]
    
    # Format month as short name
    month = dt.strftime('%b')
    
    # Format time as 12-hour format
    time = dt.strftime('%I:%M %p').lstrip('0')
    
    return f"{day}{suffix} {month} {time}"

def _format_short_date(dt: datetime) -> str:
    """Format date as '24 Sep 2025'"""
    return dt.strftime('%d %b %Y')

def _format_long_date(dt: datetime) -> str:
    """Format date as '24th September 2025, 6:30 PM'"""
    # Get day with ordinal suffix
    day = dt.day
    if 4 <= day <= 20 or 24 <= day <= 30:
        suffix = "th"
    else:
        suffix = ["st", "nd", "rd"][day % 10 - 1]
    
    # Format month as full name
    month = dt.strftime('%B')
    
    # Format time as 12-hour format
    time = dt.strftime('%I:%M %p').lstrip('0')
    
    return f"{day}{suffix} {month} {dt.year}, {time}"

def _format_time_only(dt: datetime) -> str:
    """Format time as '6:30 PM'"""
    return dt.strftime('%I:%M %p').lstrip('0')

def format_duration(start_time: Union[str, datetime], end_time: Union[str, datetime]) -> str:
    """
    Format duration between two dates
    
    Args:
        start_time: Start date/time
        end_time: End date/time
        
    Returns:
        Formatted duration string
    """
    try:
        # Parse dates
        start_dt = _parse_date(start_time)
        end_dt = _parse_date(end_time)
        
        # Calculate duration
        duration = end_dt - start_dt
        
        # Format duration
        total_hours = int(duration.total_seconds() // 3600)
        total_minutes = int((duration.total_seconds() % 3600) // 60)
        
        if total_hours > 0:
            if total_minutes > 0:
                return f"{total_hours}h {total_minutes}m"
            else:
                return f"{total_hours}h"
        else:
            return f"{total_minutes}m"
            
    except Exception as e:
        logger.error(f"Error formatting duration: {e}")
        return "Unknown"

def _parse_date(date_input: Union[str, datetime]) -> datetime:
    """Parse date input to datetime object"""
    if isinstance(date_input, str):
        if date_input.endswith('Z'):
            date_input = date_input.replace('Z', '+00:00')
        
        if '+' in date_input or date_input.endswith('Z'):
            dt = datetime.fromisoformat(date_input)
        else:
            dt = datetime.fromisoformat(date_input)
            dt = UTC.localize(dt)
    elif isinstance(date_input, datetime):
        dt = date_input
        if dt.tzinfo is None:
            dt = UTC.localize(dt)
    else:
        raise ValueError(f"Unsupported date input type: {type(date_input)}")
    
    return dt

def get_current_ist_time() -> datetime:
    """Get current time in IST"""
    return datetime.now(IST)

def is_date_in_past(date_input: Union[str, datetime]) -> bool:
    """Check if date is in the past"""
    try:
        dt = _parse_date(date_input)
        if dt.tzinfo != IST:
            dt = dt.astimezone(IST)
        
        current_time = get_current_ist_time()
        return dt < current_time
    except Exception as e:
        logger.error(f"Error checking if date is in past: {e}")
        return False

def is_date_in_future(date_input: Union[str, datetime]) -> bool:
    """Check if date is in the future"""
    try:
        dt = _parse_date(date_input)
        if dt.tzinfo != IST:
            dt = dt.astimezone(IST)
        
        current_time = get_current_ist_time()
        return dt > current_time
    except Exception as e:
        logger.error(f"Error checking if date is in future: {e}")
        return False

def get_time_until_date(date_input: Union[str, datetime]) -> str:
    """Get time remaining until a future date"""
    try:
        dt = _parse_date(date_input)
        if dt.tzinfo != IST:
            dt = dt.astimezone(IST)
        
        current_time = get_current_ist_time()
        time_diff = dt - current_time
        
        if time_diff.total_seconds() < 0:
            return "Past due"
        
        total_seconds = int(time_diff.total_seconds())
        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        minutes = (total_seconds % 3600) // 60
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
            
    except Exception as e:
        logger.error(f"Error getting time until date: {e}")
        return "Unknown"

# Example usage and testing
if __name__ == "__main__":
    # Test the date formatting
    test_dates = [
        "2025-09-24T13:00:00.775Z",
        "2025-09-24T18:30:00.000Z",
        "2025-12-25T00:00:00.000Z"
    ]
    
    print("Date Formatting Tests:")
    print("=" * 50)
    
    for test_date in test_dates:
        print(f"Input: {test_date}")
        print(f"Readable: {format_date_to_ist(test_date, 'readable')}")
        print(f"Short: {format_date_to_ist(test_date, 'short')}")
        print(f"Long: {format_date_to_ist(test_date, 'long')}")
        print(f"Time only: {format_date_to_ist(test_date, 'time_only')}")
        print("-" * 30)
