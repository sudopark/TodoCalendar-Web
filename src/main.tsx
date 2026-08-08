import { initI18n } from './i18n'
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

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initI18n()
  .then(renderApp)
  .catch(error => {
    // i18n 초기화가 실패해도 흰 화면보다는 미번역 키가 낫다 — 렌더는 무조건 진행
    console.error('initI18n failed', error)
    renderApp()
  })
