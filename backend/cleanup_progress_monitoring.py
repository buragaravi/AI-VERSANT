"""
Cleanup script for progress monitoring data
Run this periodically to prevent database bloat
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import DatabaseConfig
from utils.progress_monitoring import ProgressMonitoring
import logging
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def cleanup_monitoring_data():
    """Clean up old monitoring data"""
    
    logger.info("🧹 Starting Progress Monitoring Cleanup")
    logger.info("=" * 60)
    
    # Initialize database and monitoring
    mongo_db = DatabaseConfig.get_database()
    monitoring = ProgressMonitoring(mongo_db)
    
    # Clean up events older than 90 days
    logger.info("Cleaning up events older than 90 days...")
    deleted_count = monitoring.cleanup_old_events(days_to_keep=90)
    logger.info(f"✅ Deleted {deleted_count} old events")
    
    # Get current system health
    logger.info("\n📊 Current System Health:")
    health_metrics = monitoring.get_system_health_metrics()
    
    logger.info(f"   Total students: {health_metrics.get('total_students', 0)}")
    logger.info(f"   Active students: {health_metrics.get('active_students', 0)}")
    logger.info(f"   Health status: {health_metrics.get('health_status', 'unknown')}")
    
    # Show recent activity
    event_counts = health_metrics.get('event_counts_24h', {})
    logger.info(f"\n📈 Events in last 24 hours:")
    for event_type, count in event_counts.items():
        logger.info(f"   {event_type}: {count}")
    
    # Check for recent errors
    recent_errors = health_metrics.get('recent_errors', [])
    if recent_errors:
        logger.warning(f"\n⚠️  {len(recent_errors)} recent errors found:")
        for error in recent_errors[:3]:  # Show first 3 errors
            logger.warning(f"   {error.get('timestamp', 'Unknown time')}: {error.get('details', {}).get('error_message', 'Unknown error')}")
    else:
        logger.info("\n✅ No recent errors found")
    
    # Validate data integrity
    logger.info("\n🔍 Validating data integrity...")
    integrity_check = monitoring.validate_student_progress_integrity()
    
    total_issues = integrity_check.get('total_issues', 0)
    if total_issues == 0:
        logger.info("✅ No data integrity issues found")
    else:
        logger.warning(f"⚠️  Found {total_issues} data integrity issues")
        issues = integrity_check.get('issues', [])
        for issue in issues[:3]:  # Show first 3 issues
            logger.warning(f"   {issue.get('type', 'Unknown')}: {issue.get('student_id', 'Unknown student')}")
    
    logger.info("\n🎯 Cleanup completed!")
    logger.info("=" * 60)
    
    return {
        'deleted_events': deleted_count,
        'health_status': health_metrics.get('health_status', 'unknown'),
        'total_issues': total_issues,
        'recent_errors': len(recent_errors)
    }

def generate_monitoring_report():
    """Generate a comprehensive monitoring report"""
    
    logger.info("📊 Generating Progress Monitoring Report")
    logger.info("=" * 60)
    
    # Initialize database and monitoring
    mongo_db = DatabaseConfig.get_database()
    monitoring = ProgressMonitoring(mongo_db)
    
    # Get analytics for last 30 days
    analytics = monitoring.get_student_progress_analytics(days=30)
    
    logger.info(f"📈 Analytics for last 30 days:")
    logger.info(f"   Total events: {analytics.get('total_events', 0)}")
    logger.info(f"   Unlock events: {analytics.get('unlock_events', 0)}")
    logger.info(f"   Admin authorizations: {analytics.get('admin_authorizations', 0)}")
    logger.info(f"   Auto unlock rate: {analytics.get('auto_unlock_rate', 0):.1f}%")
    
    # Show module distribution
    module_unlocks = analytics.get('module_unlocks', {})
    if module_unlocks:
        logger.info(f"\n📚 Module unlock distribution:")
        for module, count in sorted(module_unlocks.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"   {module}: {count} unlocks")
    
    # Show daily activity (last 7 days)
    daily_activity = analytics.get('daily_activity', {})
    if daily_activity:
        logger.info(f"\n📅 Daily activity (last 7 days):")
        sorted_days = sorted(daily_activity.items(), key=lambda x: x[0], reverse=True)[:7]
        for date, count in sorted_days:
            logger.info(f"   {date}: {count} events")
    
    return analytics

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Progress Monitoring Cleanup Tool')
    parser.add_argument('--action', choices=['cleanup', 'report', 'both'], 
                       default='cleanup', help='Action to perform')
    
    args = parser.parse_args()
    
    if args.action == 'cleanup':
        cleanup_monitoring_data()
    elif args.action == 'report':
        generate_monitoring_report()
    elif args.action == 'both':
        cleanup_monitoring_data()
        print("\n" + "="*60 + "\n")
        generate_monitoring_report()
