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

    // The GM holds OWNER (userData.gm from the backend). Logins stored
    // before roles were simplified carry sections ["*"] or roles instead.
    const isGm = !!user && (user.gm === true || !!user.roles?.includes('OWNER') || !!user.sections?.includes('*'))

    return (
        <AuthContext.Provider value={{ user, login, logout, isGm }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
