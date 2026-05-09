import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { WhatsNewProvider } from './context/WhatsNewContext.jsx'
import { NavDrawerProvider } from './context/NavDrawerContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <WhatsNewProvider>
          <BrowserRouter>
            {/* NavDrawerProvider needs to be inside the Router so it
                can subscribe to route changes and auto-close the
                mobile drawer on navigation. */}
            <NavDrawerProvider>
              <App />
            </NavDrawerProvider>
          </BrowserRouter>
        </WhatsNewProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
