import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import ErrorBoundary from './components/ErrorBoundary'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import ErrorScreen from './components/errors/ErrorScreen'
import ErrorBanner from './components/errors/ErrorBanner'
import Announcements from './pages/Announcements'
import Account from './pages/Account'
import Login from './pages/Login'
import Characters from './pages/Characters'
import Campaigns from './pages/Campaigns'
import CampaignView from './pages/CampaignView'
import { Loader } from './components/ui'

// The big screens load on first visit, so the first page stays light.
const ErrorGallery = lazy(() => import('./pages/ErrorGallery'))
const Admin = lazy(() => import('./pages/Admin'))
const SheetPage = lazy(() => import('./pages/sheet/SheetPage'))
const CreateWizard = lazy(() => import('./pages/wizard/CreateWizard'))
const ResearchPage = lazy(() => import('./pages/research/ResearchPage'))
const CombinePage = lazy(() => import('./pages/research/CombinePage'))
const ChestPage = lazy(() => import('./pages/chest/ChestPage'))
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'))
const PollPage = lazy(() => import('./pages/calendar/PollPage'))

// Guests go to the Проходная, which sends them back here after signing in.
function ProtectedRoute({ children }) {
    const { user } = useAuth()
    const location = useLocation()
    return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

function AppRoutes() {
    const { user } = useAuth()
    return (
        <Suspense fallback={<div className="parchment-page"><Loader /></div>}>
        <Routes>
            <Route path="/" element={<Home />} />
            {/* Public/no-login-required: D&D and Announcements. Real
                enforcement lives in SecurityConfig - these pages just show
                read-only UI to anyone not signed in. */}
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/characters" element={<Characters />} />
            <Route path="/characters/new" element={<ProtectedRoute><CreateWizard /></ProtectedRoute>} />
            <Route path="/characters/:id" element={<SheetPage />} />
            <Route path="/characters/:characterId/research" element={<ProtectedRoute><ResearchPage /></ProtectedRoute>} />
            <Route path="/characters/:characterId/craft" element={<ProtectedRoute><CombinePage /></ProtectedRoute>} />
            <Route path="/characters/:characterId/chest" element={<ProtectedRoute><ChestPage /></ProtectedRoute>} />
            <Route path="/chest" element={<ProtectedRoute><ChestPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/calendar/polls/:pollId" element={<ProtectedRoute><PollPage /></ProtectedRoute>} />
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
        </Suspense>
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
