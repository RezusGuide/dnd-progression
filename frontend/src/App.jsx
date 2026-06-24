import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Characters from './pages/Characters'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/characters" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/characters" /> : <Register />} />
        <Route path="/characters" element={<ProtectedRoute><Characters /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
  )
}

export default function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
  )
}