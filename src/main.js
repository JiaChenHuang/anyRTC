import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ArRTM from 'ar-rtm-sdk';
import ArRTC from 'ar-rtc-sdk';
import config from '../src/assets/js/config'
Vue.prototype.$ArRTM = ArRTM
Vue.prototype.$ArRTC = ArRTC
Vue.prototype.$config = config
Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
