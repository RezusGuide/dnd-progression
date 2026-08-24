import { Component } from 'react'

// Catches a render/effect crash anywhere below it (the 3D Home scene is the
// most likely source, but this protects every page) and shows a small
// message instead of an uncaught error unmounting the whole app and
// leaving a blank white page. App.jsx remounts this fresh on every route
// change (see the `key={pathname}` there), so navigating away and back
// gives a page a clean second try rather than staying stuck.
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, info) {
        console.error('Caught by ErrorBoundary:', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    background: '#05070a', color: '#eaf6ff',
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif', padding: '2rem', textAlign: 'center',
                }}>
                    <p style={{ fontSize: '1.1rem', margin: 0 }}>Something went wrong rendering this page.</p>
                    <p style={{ color: '#9aa3b2', margin: 0, fontSize: '0.9rem' }}>
                        Try reloading, or check the browser console for details.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'transparent', border: '1px solid #7fe3ff', color: '#7fe3ff',
                            padding: '0.5rem 1.2rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem',
                        }}
                    >
                        Reload
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
