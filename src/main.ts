import { createApp } from 'vue'

import App from './App.vue'
import { installTheme } from './composables/useTheme'
import router from './router'
import './style.css'

installTheme()

createApp(App).use(router).mount('#app')
