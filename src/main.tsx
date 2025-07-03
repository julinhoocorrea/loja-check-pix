import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Aguardar o DOM estar carregado
function render() {
  const container = document.getElementById('root')
  if (container) {
    const root = createRoot(container)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } else {
    console.error('Root element not found')
  }
}

// Garantir que o DOM esteja carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render)
} else {
  render()
}
