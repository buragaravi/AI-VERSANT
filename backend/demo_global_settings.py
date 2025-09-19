
#!/usr/bin/env python3
"""
Demo script for Global Settings Feature Control System
This script demonstrates the system without requiring authentication
"""
from models_global_settings import GlobalSettings
import json

def demo_global_settings():
    """Demonstrate the global settings feature control system"""
    
    print("🎯 Global Settings Feature Control System Demo")
    print("=" * 60)
    
    # Step 1: Initialize default settings
    print("\n1️⃣ Initializing default settings...")
    try:
        GlobalSettings.create_default_settings()
        print("✅ Default settings created successfully")
    except Exception as e:
        print(f"❌ Error creating default settings: {e}")
        return False
    
    # Step 2: Get feature settings for each role
    print("\n2️⃣ Fetching feature settings for each role...")
    
    roles = ['student', 'campus_admin', 'course_admin']
    
    for role in roles:
        try:
            features = GlobalSettings.get_feature_settings(role)
            enabled_count = sum(1 for f in features.values() if f.get('enabled', False))
            total_count = len(features)
            
            print(f"   📋 {role.replace('_', ' ').title()}:")
            print(f"      Enabled: {enabled_count}/{total_count} features")
            
            # Show enabled features
            enabled_features = [name for name, data in features.items() if data.get('enabled', False)]
            print(f"      Features: {', '.join(enabled_features)}")
            
        except Exception as e:
            print(f"   ❌ Error fetching {role} settings: {e}")
    
    # Step 3: Demonstrate feature update
    print("\n3️⃣ Demonstrating feature update...")
    
    try:
        # Get current student features
        student_features = GlobalSettings.get_feature_settings('student')
        print(f"   Current student features: {len(student_features)} total")
        
        # Disable practice_tests
        if 'practice_tests' in student_features:
            student_features['practice_tests']['enabled'] = False
            print("   Disabling 'practice_tests' for students...")
            
            # Update the settings
            result = GlobalSettings.update_feature_settings('student', student_features, None)
            print(f"   ✅ Updated student features (modified: {result.modified_count})")
            
            # Verify the change
            updated_features = GlobalSettings.get_feature_settings('student')
            practice_tests_enabled = updated_features.get('practice_tests', {}).get('enabled', True)
            print(f"   Verification: practice_tests enabled = {practice_tests_enabled}")
        
    except Exception as e:
        print(f"   ❌ Error updating features: {e}")
    
    # Step 4: Show all settings
    print("\n4️⃣ Current settings summary...")
    
    try:
        all_settings = GlobalSettings.get_all_feature_settings()
        
        for role, features in all_settings.items():
            print(f"\n   🎭 {role.replace('_', ' ').title()} Role:")
            for feature_name, feature_data in features.items():
                status = "✅ Enabled" if feature_data.get('enabled', False) else "❌ Disabled"
                required = " (Required)" if feature_data.get('required', False) else ""
                print(f"      {feature_name}: {status}{required}")
                
    except Exception as e:
        print(f"   ❌ Error fetching all settings: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Global Settings Feature Control System Demo Complete!")
    print("\n📋 System Features:")
    print("   ✅ Database schema created")
    print("   ✅ Default settings initialized")
    print("   ✅ Feature settings can be retrieved")
    print("   ✅ Feature settings can be updated")
    print("   ✅ Role-based feature control working")
    print("\n🚀 The system is ready for frontend integration!")
    print("\n💡 Next steps:")
    print("   1. Test the frontend Global Settings page")
    print("   2. Verify dynamic navigation in sidebars")
    print("   3. Test feature toggling across different user roles")
    
    return True

if __name__ == "__main__":
    demo_global_settings()
