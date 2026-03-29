import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { MantineProvider } from '@mantine/core'
import { legalDeskTheme } from './theme'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={legalDeskTheme}>
      <App />
    </MantineProvider>
  </StrictMode>,
)
