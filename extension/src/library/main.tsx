import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../popup/App.tsx'
import '../popup/index.css'

document.body.classList.add('library')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App variant="full" />
  </StrictMode>,
)
