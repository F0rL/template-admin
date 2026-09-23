import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

import '@/utils/dayjs' // dayjs 插件与 zh-cn locale 副作用引入
import 'nprogress/nprogress.css'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
