import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user')
        return stored ? JSON.parse(stored) : null
    })

    const login = (userData, token) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    // userData.sections comes straight from the backend (Role.sections,
    // flattened). "*" unlocks everything - that's what OWNER carries.
    const hasSection = (key) => {
        if (!user?.sections) return false
        return user.sections.includes('*') || user.sections.includes(key)
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, hasSection }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
