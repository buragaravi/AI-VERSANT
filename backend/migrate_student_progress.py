"""
Migration script to convert existing authorized_levels to enhanced format
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import DatabaseConfig
from bson import ObjectId
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_student_progress():
    """Migrate existing student data to enhanced progress format"""
    
    logger.info("🚀 Starting Student Progress Migration")
    logger.info("=" * 60)
    
    # Initialize database
    mongo_db = DatabaseConfig.get_database()
    
    # Get all students
    students = list(mongo_db.students.find({}))
    logger.info(f"📊 Found {len(students)} students to migrate")
    
    migrated_count = 0
    skipped_count = 0
    error_count = 0
    
    for student in students:
        try:
            student_id = student['_id']
            student_name = student.get('name', 'Unknown')
            
            logger.info(f"\n👤 Processing student: {student_name} (ID: {student_id})")
            
            # Check if already migrated (has new format)
            authorized_levels = student.get('authorized_levels', [])
            
            if not authorized_levels:
                logger.info(f"   ⏭️  No authorized_levels found, skipping")
                skipped_count += 1
                continue
            
            # Check if already in new format
            if authorized_levels and isinstance(authorized_levels[0], dict):
                logger.info(f"   ✅ Already in new format, skipping")
                skipped_count += 1
                continue
            
            # Convert old format to new format
            new_authorized_levels = []
            for level_id in authorized_levels:
                if isinstance(level_id, str):
                    new_level = {
                        "level_id": level_id,
                        "authorized_by": "legacy",  # Mark as legacy migration
                        "authorized_at": datetime.utcnow(),
                        "authorized_by_user": None,
                        "score_unlocked": None,
                        "is_admin_override": True,  # Assume legacy unlocks were admin overrides
                        "reason": "Migrated from legacy system"
                    }
                    new_authorized_levels.append(new_level)
            
            # Initialize module progress if not exists
            module_progress = student.get('module_progress', {})
            
            # Initialize unlock history if not exists
            unlock_history = student.get('unlock_history', [])
            
            # Add legacy entries to unlock history
            for level_id in authorized_levels:
                if isinstance(level_id, str):
                    history_entry = {
                        "level_id": level_id,
                        "unlocked_at": datetime.utcnow(),
                        "unlocked_by": "legacy",
                        "score": None,
                        "test_id": None
                    }
                    unlock_history.append(history_entry)
            
            # Update student document
            update_data = {
                'authorized_levels': new_authorized_levels,
                'module_progress': module_progress,
                'unlock_history': unlock_history,
                'migration_completed_at': datetime.utcnow()
            }
            
            result = mongo_db.students.update_one(
                {'_id': student_id},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"   ✅ Migrated {len(new_authorized_levels)} levels")
                migrated_count += 1
            else:
                logger.warning(f"   ⚠️  No changes made")
                skipped_count += 1
                
        except Exception as e:
            logger.error(f"   ❌ Error migrating student {student_name}: {e}")
            error_count += 1
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("📈 MIGRATION SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✅ Successfully migrated: {migrated_count} students")
    logger.info(f"⏭️  Skipped: {skipped_count} students")
    logger.info(f"❌ Errors: {error_count} students")
    logger.info(f"📊 Total processed: {len(students)} students")
    
    if error_count > 0:
        logger.warning(f"⚠️  {error_count} students had errors during migration")
    else:
        logger.info("🎉 Migration completed successfully!")
    
    return {
        'migrated': migrated_count,
        'skipped': skipped_count,
        'errors': error_count,
        'total': len(students)
    }

def verify_migration():
    """Verify the migration was successful"""
    
    logger.info("\n🔍 Verifying Migration Results")
    logger.info("=" * 60)
    
    mongo_db = DatabaseConfig.get_database()
    
    # Check students with new format
    new_format_count = mongo_db.students.count_documents({
        'authorized_levels.0': {'$type': 'object'}
    })
    
    # Check students with old format
    old_format_count = mongo_db.students.count_documents({
        'authorized_levels.0': {'$type': 'string'}
    })
    
    # Check students with no authorized_levels
    no_levels_count = mongo_db.students.count_documents({
        'authorized_levels': {'$exists': False}
    })
    
    logger.info(f"📊 Students with new format: {new_format_count}")
    logger.info(f"📊 Students with old format: {old_format_count}")
    logger.info(f"📊 Students with no levels: {no_levels_count}")
    
    if old_format_count == 0:
        logger.info("✅ All students successfully migrated to new format!")
    else:
        logger.warning(f"⚠️  {old_format_count} students still in old format")
    
    return {
        'new_format': new_format_count,
        'old_format': old_format_count,
        'no_levels': no_levels_count
    }

def rollback_migration():
    """Rollback migration (convert back to old format)"""
    
    logger.warning("⚠️  ROLLBACK MIGRATION")
    logger.warning("This will convert all students back to old format!")
    
    confirm = input("Are you sure you want to rollback? (yes/no): ")
    if confirm.lower() != 'yes':
        logger.info("Rollback cancelled")
        return
    
    mongo_db = DatabaseConfig.get_database()
    
    # Find students with new format
    students = list(mongo_db.students.find({
        'authorized_levels.0': {'$type': 'object'}
    }))
    
    logger.info(f"🔄 Rolling back {len(students)} students")
    
    for student in students:
        try:
            student_id = student['_id']
            authorized_levels = student.get('authorized_levels', [])
            
            # Convert back to old format
            old_format_levels = []
            for level in authorized_levels:
                if isinstance(level, dict):
                    old_format_levels.append(level['level_id'])
                else:
                    old_format_levels.append(level)
            
            # Update student
            mongo_db.students.update_one(
                {'_id': student_id},
                {
                    '$set': {'authorized_levels': old_format_levels},
                    '$unset': {
                        'module_progress': '',
                        'unlock_history': '',
                        'migration_completed_at': ''
                    }
                }
            )
            
            logger.info(f"✅ Rolled back student: {student.get('name', 'Unknown')}")
            
        except Exception as e:
            logger.error(f"❌ Error rolling back student: {e}")
    
    logger.info("🔄 Rollback completed")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Student Progress Migration Tool')
    parser.add_argument('--action', choices=['migrate', 'verify', 'rollback'], 
                       default='migrate', help='Action to perform')
    
    args = parser.parse_args()
    
    if args.action == 'migrate':
        migrate_student_progress()
    elif args.action == 'verify':
        verify_migration()
    elif args.action == 'rollback':
        rollback_migration()
