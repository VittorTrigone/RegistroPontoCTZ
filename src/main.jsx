import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { PontoProvider } from './contexts/PontoContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PontoProvider>
        <App />
      </PontoProvider>
    </AuthProvider>
  </StrictMode>,
)
