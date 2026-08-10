import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { consumeShareParam } from './lib/shareLink.js'
import './styles/global.css'

// Runs before the first render so the router's initial read of the hash already
// reflects an incoming `?p=` share link.
consumeShareParam()

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
