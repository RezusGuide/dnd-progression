import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Characters from './pages/Characters'
import Campaigns from './pages/Campaigns'
import CampaignView from './pages/CampaignView'
import CharacterSheet from './pages/CharacterSheet'

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
            <Route path="/characters/:id" element={<ProtectedRoute><CharacterSheet /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignView /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    )
}

export default function App() {
    return (
        <LangProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </LangProvider>
    )
}