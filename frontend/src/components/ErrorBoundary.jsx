import { Component } from 'react'
import ErrorScreen from './errors/ErrorScreen'

// Catches a render/effect crash anywhere below it and shows the "document
// torn" screen instead of an uncaught error unmounting the whole app and
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
            return <ErrorScreen code="crash" />
        }
        return this.props.children
    }
}
