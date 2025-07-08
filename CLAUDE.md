# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

CrittrCove is a full-stack pet care platform with React Native frontend and Django backend:

- **Frontend**: `/CrittrCoveStaging/` - React Native app with Expo (Web, iOS, Android)
- **Backend**: `/backend/zenexotics_backend/` - Django REST API with PostgreSQL

## Development Commands

### Frontend (React Native/Expo)
```bash
cd CrittrCoveStaging

# Development servers
npm run web:dev      # Development mode
npx expo start --web --lan # Developing local lan for web to view the web changes on the browser
npm run web:staging  # Staging mode  
npm run web:prod     # Production mode

# Windows equivalents
npm run win:web:dev
npm run win:web:staging
npm run win:web:prod

# Build and deploy
npm run build        # Build for staging
npm run deploy:full  # Build and deploy to gh-pages
```

### Backend (Django)
```bash
cd backend/zenexotics_backend

# Always activate virtual environment first
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Use python3/pip3 commands
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py test
```

## Architecture Overview

### Frontend Architecture
- **Entry Point**: `App.js` - Main application wrapper with AuthProvider, NavigationContainer
- **State Management**: Context-based (AuthContext, MessageNotificationContext, TutorialContext)
- **Navigation**: React Navigation with stack and tab navigators
- **API Layer**: Centralized in `src/api/API.js` with axios interceptors for authentication
- **Components**: Organized by feature in `src/components/`
- **Screens**: Main app screens in `src/screens/`
- **Utils**: Shared utilities in `src/utils/` (time handling, validation, etc.)
- **Working with Data**: Shared utilities in `src/data/` (calculations, sanitization of contact in messages, Timezones, etc.)
- **ALWAYS KEEP FILES UNDER 1500 Lines Of code**

### Backend Architecture  
- **Pattern**: Django apps with REST API endpoints at `/api/<app>/v1/...`
- **Authentication**: JWT tokens with refresh mechanism
- **Key Apps**: 
  - `users/` - User management and authentication
  - `bookings/` - Booking system with occurrences and rates
  - `professionals/` - Professional profiles and services
  - `clients/` - Client profiles and pets
  - `user_messages/` - Real-time messaging with WebSockets
- **Shared Logic**: `core/` contains common utilities and business logic
- **Database**: PostgreSQL with Django ORM

### Key Data Models
- **Booking System**: Bookings → BookingOccurrences → BookingOccurrenceRates
- **User Types**: Users can be both clients and professionals
- **Services**: Professional services with rates and availability
- **Messaging**: Real-time conversations between users

## Critical Development Rules

### Authentication & API
- **Never manually handle auth tokens** - Use axios interceptors in AuthContext
- All API calls go through `src/api/API.js` (if they don't, they should)
- Backend auth helpers in `core/common_checks.py`

### Time Handling
- **All backend times are UTC** in format "YYYY-MM-DD HH:mm"
- Frontend converts using `src/utils/time_utils.js`
- Use `formatDateTimeRangeFromUTC` for ranges, `formatFromUTC` for single dates

### Logging & Debugging
- Frontend: Use `debugLog("MBA<NNNN>: message", data)` format
- Backend: Use Django logging, no debugLog function
- Always use consistent log codes (MBA followed by 10 digits)

### Code Organization
- **DRY Principle**: Search for existing utilities before creating new ones
- **Shared utilities**: Frontend in `src/utils/` or `src/data/`, backend in `core/`
- **No code duplication**: Extract shared logic to utility files

### Error Handling
- **No Alert.alert** - Use modals or toast notifications
- Backend: Use proper HTTP status codes (4XX for client errors)
- Frontend: Surface `response.data.detail` in user feedback

### Data Conventions
- **Variables**: snake_case everywhere
- **User-facing values**: Title Case ("Dog", "Per Visit")
- **API consistency**: Frontend and backend field names must match exactly

## Testing
- Backend: Add pytest tests under `<app>/tests/`
- Frontend: Add Jest tests in `__tests__/` directories
- Run with `pytest -q` (backend) and `npm test --passWithNoTests` (frontend)

## File Paths
- Frontend: `/Users/mattaertker/Documents/GitHub/CrittrCoveStaging/CrittrCoveStaging`
- Backend: `/Users/mattaertker/Documents/GitHub/CrittrCoveStaging/backend/zenexotics_backend`

## Important Notes
- Always activate Python virtual environment before backend commands
- Use python3/pip3 commands, never python/pip
- When creating migrations, list the filename in commit messages
- All new frontend components should be TypeScript (.tsx) when possible
- When asked to edit anything to do with MessageHistory.js, try to not actually edit the file itself, and break up some of the logic into separate files as the MessageHistory.js file is way too large. 