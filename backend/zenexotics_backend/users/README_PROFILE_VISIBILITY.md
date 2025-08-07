# Profile Visibility vs Account Status

## Overview

The CrittrCove system has two separate boolean fields that control different aspects of user visibility:

### `is_active` (Django Built-in)
- **Purpose**: Controls whether a user can log into the system
- **Default**: `True`
- **Admin Location**: Status section in User admin
- **Effect**: When `False`, user cannot authenticate or access the platform
- **Use Case**: Account suspension, deletion, or administrative actions

### `is_profile_visible` (Custom Field)
- **Purpose**: Controls whether a user's profile is visible to other users
- **Default**: `True`
- **Admin Location**: Status section in User admin (added in recent update)
- **Effect**: When `False`, user's profile is hidden from search results and other users
- **Use Case**: Privacy settings, temporary profile hiding

## API Behavior

When calling the `update_profile/` endpoint with `profile_visibility: false`:

1. **Database Update**: Sets `is_profile_visible = False` in the User model
2. **API Response**: Returns `profile_visibility: false` (calculated as `is_active AND is_profile_visible`)
3. **Admin Display**: Now shows both fields in the admin interface

## Admin Interface

The Django admin interface now displays both fields:
- **List View**: Shows both `is_active` and `is_profile_visible` columns
- **Edit View**: Both fields are available in the "Status" section
- **Filters**: Both fields can be used as filters

## Frontend Integration

The frontend uses the combined value (`is_active AND is_profile_visible`) for:
- Profile visibility in search results
- Profile display to other users
- Privacy settings in user preferences

## Testing

Run the admin tests to verify functionality:
```bash
python manage.py test users.tests.test_admin -v 2
```

## Debugging

When troubleshooting profile visibility issues:
1. Check both `is_active` and `is_profile_visible` in the admin
2. Look for debug logs with pattern `MBA<NNNNNNNNNNLSS>` in the backend logs
3. Verify the API response matches the expected behavior 