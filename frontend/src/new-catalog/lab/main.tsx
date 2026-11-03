import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Lab } from './Lab'

document.documentElement.style.height = '100%'
document.body.style.margin = '0'
document.body.style.minHeight = '100%'
const root = document.getElementById('root')
if (root) {
  root.style.minHeight = '100%'
  createRoot(root).render(
    <StrictMode>
      <Lab />
    </StrictMode>,
  )
}
