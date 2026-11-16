import { createApp } from 'vue'

import App from './App.vue'
import { installTheme } from './composables/useTheme'
import { installReloadOnStaleAssets } from './lib/reloadOnStaleAssets'
import router from './router'
import './style.css'

installTheme()
installReloadOnStaleAssets()

createApp(App).use(router).mount('#app')
