import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';
import AuthRoute from './components/AuthRoute'; // Importa el componente AuthRoute
import GamePage from './pages/GamePage';
import AddFriendsPage from './pages/AddFriendsPage';
import FriendRequestPage from './pages/FriendRequestPage';
import AuthRedirect from './components/AuthRedirect';
import FriendsPage from './pages/FriendsPage';
import EditProfile from './pages/EditProfile';
import DeleteProfile from './components/DeleteProfile';
import LeaderBoardPage from './pages/LeaderBoardPage';
import SalasPage from './pages/SalasPage';
import SkinPage from './pages/SkinPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas protegidas con AuthRedirect */}
        <Route
          path="/"
          element={
            <AuthRedirect>
              <HomePage />
            </AuthRedirect>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRedirect>
              <RegisterPage />
            </AuthRedirect>
          }
        />
        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <AuthRoute>
              <DashboardPage />
            </AuthRoute>
          }
        />
        <Route
          path="/stats/:userId"
          element={
            <AuthRoute>
              <StatsPage />
            </AuthRoute>
          }
        />
        <Route
          path="/game-page"
          element={
            <AuthRoute>
              <GamePage />
            </AuthRoute>
          }
        />
        <Route
          path="/agregar-amigo"
          element={
            <AuthRoute>
              <AddFriendsPage />
            </AuthRoute>
          }
        />
        <Route path="/ranking" element={<AuthRoute><LeaderBoardPage /></AuthRoute>}/>
        <Route
          path="/friends-request"
          element={
            <AuthRoute>
              <FriendRequestPage />
            </AuthRoute>
          }
        />
        <Route path="/friends" element={<AuthRoute> <FriendsPage /></AuthRoute>}/>
        <Route path="/user/:usuario_id" element={<AuthRoute><StatsPage /> </AuthRoute>} />
        <Route path="/modificar-perfil" element={<AuthRoute><EditProfile /> </AuthRoute>} />
        <Route path="/eliminar-perfil" element={<AuthRoute><DeleteProfile /> </AuthRoute>} />
        <Route path="/salas" element={<AuthRoute><SalasPage /> </AuthRoute>} />
        <Route path="/skins" element={<AuthRoute><SkinPage /> </AuthRoute>} />
        
      </Routes>
    </Router>
  );
}

export default App;
