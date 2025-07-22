# Copilot Instructions for Lab-1 Truco Game

## Project Overview
This is a full-stack **multiplayer Truco game** with real-time websocket communication. The backend uses Node.js/Express with MySQL, while the frontend is a React TypeScript application with Socket.IO for real-time updates.

## Architecture & Key Components

### Backend Structure (`/backend`)
- **Modular Express server** with clean separation of concerns
- **Socket.IO** for real-time game communication
- **MySQL database** with connection pooling via `mysql2/promise`
- **Game logic** in `/game-logic` with object-oriented design

### Frontend Structure (`/frontend`)
- **React + TypeScript + Vite** setup
- **Real-time game state** via custom `useGameSocket` hook
- **Modular game components** in `/components/game`
- **Tailwind CSS** for styling

## Development Commands

### Backend
```bash
cd backend
npm start           # Production server
npm run dev        # Development with nodemon
npm test           # Jest test suite
npm run test:watch # Watch mode testing
```

### Frontend
```bash
cd frontend
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build
npm run lint       # ESLint checking
```

## Database Patterns

### Connection Setup
- Use `pool.query()` for database operations
- Always use connection pooling from `/config/db.js`
- Database auto-initializes via `/config/dbInit.js` on server start

### Transaction Pattern
```javascript
let connection;
try {
  connection = await pool.getConnection();
  await connection.beginTransaction();
  // database operations
  await connection.commit();
} catch (error) {
  if (connection) await connection.rollback();
  throw error;
} finally {
  if (connection) connection.release();
}
```

## Game Logic Architecture

### Key Classes
- **`PartidaGame`**: Orchestrates entire game flow and ronda management
- **`RondaGame`**: Handles individual rounds (envido, truco, card play)
- **`JugadorGame`**: Represents players with cards and state
- **`Mazo`**: Card deck management with Spanish card logic

### Real-time Communication
- Socket events follow pattern: `action_ws` (client → server)
- Server broadcasts via `estado_juego_actualizado` events
- Frontend uses `useGameSocket` hook for state management

## Testing Patterns

### Jest Configuration
- Tests in `/backend/tests/*.test.js`
- Mock database setup in `/tests/setup.js`
- Use `testHelper` globals for request/response mocks

### Test Utilities
```javascript
// Use global testHelper
const req = testHelper.createMockRequest({ body: data });
const res = testHelper.createMockResponse();
```

## Code Conventions

### File Naming
- Controllers: `*Controller.js` (camelCase methods)
- Routes: `*Routes.js` (Express router modules)
- Game logic: PascalCase classes
- Components: PascalCase React components

### Error Handling
- Always use try-catch with proper rollbacks
- Log errors with context: `console.error('[MODULE] Error:', error)`
- Return structured JSON errors: `{ error: "message", details: ... }`

### Socket Events
- Client actions: `action_name_ws`
- Server updates: `estado_juego_actualizado`, `error_estado_juego`
- Follow existing event naming in `gameSocketHandlers.js`

## State Management

### Game State Structure
The frontend receives a complete game state object with:
- `equipos`: Team information and scores
- `jugadores`: Player data with cards (filtered by player)
- `rondaActual`: Current round state (envido, truco, turn info)
- `orderJugadoresRonda`: Turn order for current round

### localStorage Backup
- Game state is cached in localStorage for connection recovery
- Key pattern: `gameState_${codigoSala}`
- Automatic cleanup on successful reconnection

## Performance Considerations

### Socket Connection Management
- Single socket per game session with automatic reconnection
- Debounced cleanup in React StrictMode to avoid double-disconnects
- Connection recovery with state fallback mechanisms

### Database Optimization
- Use indexed queries on `partidas.estado` and `partidas.tipo`
- Connection pooling prevents database overload
- Proper foreign key constraints with CASCADE deletes

## Environment Setup

### Required Environment Variables
```bash
# Backend (.env)
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=truco_db
JWT_SECRET=your_jwt_secret
PORT=3001

# MercadoPago (optional)
MERCADOPAGO_ACCESS_TOKEN=your_token
```

### Development Proxy
Vite proxies `/api` requests to `localhost:3001` - see `vite.config.ts`

## Common Patterns

### Authentication Middleware
```javascript
const { authenticateToken } = require('./middleware/authMiddleware');
router.post('/protected-route', authenticateToken, controller.method);
```

### Game Action Pattern
All game actions flow through `gameLogicHandler.manejarAccionJugador()` which delegates to the appropriate `PartidaGame` method.

### Component Props Pattern
Game components receive minimal props and derive state from the global game state object rather than deep prop drilling.

## Debugging

### Game State Debugging
- Use `GameStateViewer` component for state inspection
- Server logs with `[MODULE]` prefixes for easy filtering
- Game performance monitoring via `gamePerformanceMonitor`

### Socket Debugging
- Enable socket debug logs: `console.log('[CLIENT]')` pattern
- Use browser DevTools Network tab for Socket.IO events
- Check `socket.connected` status before emitting events

## Known Patterns to Follow

When adding new features:
1. **Backend**: Controller → Route → Socket handler → Game logic
2. **Frontend**: Component → Hook → Socket emission → State update
3. **Database**: Migration in `dbInit.js` → Update models → Test queries
4. **Tests**: Mock database → Test controller logic → Integration test route

Focus on maintaining the existing modular architecture and real-time state synchronization patterns.
