import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CatalogApp } from './CatalogApp'
import './catalog.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogApp />
  </StrictMode>,
)
