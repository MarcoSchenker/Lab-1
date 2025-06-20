# Backend Modularization

## Overview

The backend has been refactored from a single large `server.js` file into a modular structure for better organization, maintainability, and testing.

## New Structure

### Controllers (`/controllers`)
- `authController.js` - Authentication and user management
- `estadisticasController.js` - Game statistics handling
- `monedasController.js` - User coins/currency management
- `amigosController.js` - Friends system management
- `perfilController.js` - Profile pictures and media
- `configuracionController.js` - User settings and account management
- `testController.js` - Testing and debugging endpoints

### Routes (`/routes`)
- `authRoutes.js` - Authentication endpoints
- `estadisticasRoutes.js` - Statistics endpoints
- `monedasRoutes.js` - Money/coins endpoints
- `amigosRoutes.js` - Friends system endpoints
- `perfilRoutes.js` - Profile management endpoints
- `configuracionRoutes.js` - User configuration endpoints
- `testRoutes.js` - Testing and debugging endpoints

### Configuration (`/config`)
- `middlewareSetup.js` - Express middleware configuration
- `routesSetup.js` - Routes registration
- `serverInit.js` - Server initialization utilities

### Socket (`/socket`)
- `socketSetup.js` - Socket.IO server configuration and setup

### Tests (`/tests`)
- `server.test.js` - Basic server functionality tests
- `controllers.test.js` - Controller unit tests

## Migration

- **Original file**: `server_original.js` (backup)
- **Old modularized**: `server_old.js` (previous version)
- **New modularized**: `server.js` (current clean version)

## Key Improvements

1. **Separation of Concerns**: Each controller handles a specific domain
2. **Testability**: Individual controllers can be unit tested
3. **Maintainability**: Easier to locate and modify specific functionality
4. **Scalability**: Easy to add new features without cluttering main server file
5. **Error Handling**: Better isolated error handling per domain

## Usage

The new server maintains the same API endpoints but with improved internal structure:

```javascript
// Starting the server
npm start

// Running tests
npm test
```

## API Endpoints Summary

### Authentication
- `POST /usuarios` - Register user
- `POST /login` - User login
- `POST /usuario-anonimo` - Create anonymous user
- `DELETE /usuario-anonimo/:nombre_usuario` - Delete anonymous user

### Statistics
- `GET /estadisticas/:usuario_id` - Get user stats by ID
- `GET /estadisticas-username/:username` - Get user stats by username
- `GET /ranking` - Get player ranking

### Friends
- `POST /amigos` - Send friend request
- `GET /amigos` - Get friends list
- `GET /friend-requests` - Get pending requests

### Profile
- `POST /usuarios/:username/foto-perfil` - Upload profile picture
- `GET /usuarios/:username/foto-perfil` - Get profile picture

### Testing
- `GET /` - Server status
- `GET /ping` - Database connection test
- `GET /test-crear-partida` - Create test game
- `GET /test-obtener-estado/:codigo_sala/:jugador_id` - Get game state

## Next Steps

1. Add comprehensive unit tests for all controllers
2. Add integration tests for API endpoints
3. Add API documentation with OpenAPI/Swagger
4. Consider adding request validation middleware
5. Add rate limiting and security middleware
