import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import ErrorBoundary from './components/ErrorBoundary'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import ErrorScreen from './components/errors/ErrorScreen'
import ErrorBanner from './components/errors/ErrorBanner'
import ErrorGallery from './pages/ErrorGallery'
import Announcements from './pages/Announcements'
import Admin from './pages/Admin'
import Account from './pages/Account'
import Login from './pages/Login'
import Characters from './pages/Characters'
import Campaigns from './pages/Campaigns'
import CampaignView from './pages/CampaignView'
import CharacterSheet from './pages/CharacterSheet'
import Research from './pages/Research'
import AspectCraft from './pages/AspectCraft'

// Guests go to the Проходная, which sends them back here after signing in.
function ProtectedRoute({ children }) {
    const { user } = useAuth()
    const location = useLocation()
    return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

function AppRoutes() {
    const { user } = useAuth()
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            {/* Public/no-login-required: D&D and Announcements. Real
                enforcement lives in SecurityConfig - these pages just show
                read-only UI to anyone not signed in. */}
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/characters" element={<Characters />} />
            <Route path="/characters/:id" element={<CharacterSheet />} />
            <Route path="/characters/:characterId/research" element={<Research />} />
            <Route path="/characters/:characterId/craft" element={<AspectCraft />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignView />} />

            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

            {/* No self-registration anymore - you create every account
                yourself from /admin and hand out the login directly, so
                there's no public sign-up page to route to. */}
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

            {import.meta.env.DEV && <Route path="/__errors" element={<ErrorGallery />} />}

            <Route path="*" element={<ErrorScreen code={404} />} />
        </Routes>
    )
}

// key={pathname} remounts the boundary (and everything below it) fresh on
// every navigation, so a crash on one page doesn't leave every other page
// stuck behind the fallback screen too.
function AppShell() {
    const location = useLocation()
    return (
        <>
            <NavBar />
            <ErrorBanner />
            <ErrorBoundary key={location.pathname}>
                <AppRoutes />
            </ErrorBoundary>
        </>
    )
}

export default function App() {
    return (
        <LangProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppShell />
                </BrowserRouter>
            </AuthProvider>
        </LangProvider>
    )
}
