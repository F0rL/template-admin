import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import pinia from '@/stores'
import router from './router'
import { queryClient } from '@/lib/queryClient'
import App from './App.vue'

import './styles/theme.css'
import './styles/tailwind.css'
import './styles/index.scss'
import 'nprogress/nprogress.css'

function bootstrap() {
  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.use(VueQueryPlugin, {
    queryClient,
    enableDevtoolsV6Plugin: import.meta.env.VITE_APP_ENABLE_DEVTOOLS === 'true',
  })
  app.mount('#app')
}

bootstrap()
