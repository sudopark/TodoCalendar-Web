import './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './firebase'
import App from './App.tsx'

console.info(
  `%cTodoCalendar-Web%c ${__APP_VERSION__} (${__APP_COMMIT__}) [${__DEPLOY_ENV__}] ${__APP_BUILD_TIME__}`,
  'color:#4f46e5;font-weight:bold',
  'color:gray',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
