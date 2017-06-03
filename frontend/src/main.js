// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from "vue"
import App from "./App"
import router from "./router"
import VueWebsocket from "vue-websocket"

Vue.config.productionTip = false

Vue.use(VueWebsocket, window.location.protocol + "//" + window.location.host, {
  path: "/ws/socket.io"
})

/* eslint-disable no-new */
new Vue({
  el: "#app",
  router,
  template: "<App/>",
  components: { App }
})
