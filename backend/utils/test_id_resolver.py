#!/usr/bin/env python3
"""
Test ID Resolver Utility
Handles both MongoDB ObjectId and custom test_id field for test lookups
"""

import logging
from typing import Optional, Dict, Any
from bson import ObjectId
from mongo import mongo_db

# Configure logging
logger = logging.getLogger(__name__)

def resolve_test_id(test_identifier: str) -> Optional[Dict[str, Any]]:
    """
    Resolve test identifier to test document and return both _id and test_id
    
    Args:
        test_identifier: Either MongoDB ObjectId string or custom test_id
        
    Returns:
        Dict with test document, _id, and test_id, or None if not found
    """
    try:
        # First, try as MongoDB ObjectId
        if ObjectId.is_valid(test_identifier):
            logger.info(f"🔍 Looking up test by MongoDB _id: {test_identifier}")
            test = mongo_db.tests.find_one({'_id': ObjectId(test_identifier)})
            if test:
                return {
                    'test': test,
                    'object_id': str(test['_id']),
                    'test_id': test.get('test_id'),
                    'resolved_by': '_id'
                }
        
        # If not found or not a valid ObjectId, try as custom test_id
        logger.info(f"🔍 Looking up test by custom test_id: {test_identifier}")
        test = mongo_db.tests.find_one({'test_id': test_identifier})
        if test:
            return {
                'test': test,
                'object_id': str(test['_id']),
                'test_id': test.get('test_id'),
                'resolved_by': 'test_id'
            }
        
        logger.warning(f"⚠️ Test not found with identifier: {test_identifier}")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error resolving test ID {test_identifier}: {e}")
        return None

def get_test_for_notification(test_identifier: str) -> Optional[Dict[str, Any]]:
    """
    Get test data specifically for notification purposes
    Returns both _id and test_id for use in notifications
    
    Args:
        test_identifier: Either MongoDB ObjectId string or custom test_id
        
    Returns:
        Dict with test data optimized for notifications
    """
    result = resolve_test_id(test_identifier)
    if not result:
        return None
    
    test = result['test']
    
    return {
        'object_id': result['object_id'],
        'test_id': result['test_id'],
        'name': test.get('name'),
        'test_type': test.get('test_type'),
        'module_id': test.get('module_id'),
        'level_id': test.get('level_id'),
        'batch_ids': test.get('batch_ids', []),
        'course_ids': test.get('course_ids', []),
        'campus_ids': test.get('campus_ids', []),
        'startDateTime': test.get('startDateTime'),
        'endDateTime': test.get('endDateTime'),
        'duration': test.get('duration'),
        'questions': test.get('questions', []),
        'resolved_by': result['resolved_by']
    }

def validate_test_access(test_identifier: str, user_id: str = None) -> Optional[Dict[str, Any]]:
    """
    Validate test access and return test data
    
    Args:
        test_identifier: Either MongoDB ObjectId string or custom test_id
        user_id: Optional user ID for access validation
        
    Returns:
        Dict with test data if accessible, None otherwise
    """
    result = resolve_test_id(test_identifier)
    if not result:
        return None
    
    test = result['test']
    
    # Add any access validation logic here if needed
    # For now, just return the test data
    
    return {
        'object_id': result['object_id'],
        'test_id': result['test_id'],
        'test': test,
        'resolved_by': result['resolved_by']
    }
