import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import ErrorBoundary from './components/ErrorBoundary'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Portfolio from './pages/Portfolio'
import Media from './pages/Media'
import Minecraft from './pages/Minecraft'
import UsefulFunctions from './pages/UsefulFunctions'
import Downloads from './pages/Downloads'
import Announcements from './pages/Announcements'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Characters from './pages/Characters'
import Campaigns from './pages/Campaigns'
import CampaignView from './pages/CampaignView'
import CharacterSheet from './pages/CharacterSheet'
import Research from './pages/Research'
import AspectCraft from './pages/AspectCraft'

function ProtectedRoute({ children }) {
    const { user } = useAuth()
    return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
    const { user } = useAuth()
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            {/* Public/no-login-required: Portfolio, Media, D&D, Minecraft,
                Downloads, Announcements. Real enforcement lives in
                SecurityConfig - these pages just show read-only UI to
                anyone not signed in, and let any logged-in account CRUD. */}
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/media" element={<Media />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/minecraft" element={<Minecraft />} />
            <Route path="/characters" element={<Characters />} />
            <Route path="/characters/:id" element={<CharacterSheet />} />
            <Route path="/characters/:characterId/research" element={<Research />} />
            <Route path="/characters/:characterId/craft" element={<AspectCraft />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignView />} />

            {/* Owner-only, always - UsefulFunctions checks hasSection('*')
                itself and shows an access-denied screen otherwise, so no
                route wrapper is needed. */}
            <Route path="/useful" element={<UsefulFunctions />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

            {/* No self-registration anymore - you create every account
                yourself from /admin and hand out the login directly, so
                there's no public sign-up page to route to. */}
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

            <Route path="*" element={<Navigate to="/" />} />
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
