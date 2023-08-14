/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from "./App.vue";
import "bootstrap/dist/css/bootstrap.min.css";
import { initWidget, x3DDashboardUtils } from "./lib/widget";
import store from "./store";
import "bootstrap";
// Composables
import { createApp } from "vue";

// Plugins
import { registerPlugins } from "@/plugins";

initWidget((widget) => {
  x3DDashboardUtils.disableCSS(true);
  console.log(widget);
  // add title to widget container
  window.title = "Widget Enablement";
  //widget.setTitle(window.title);
  const app = createApp(App);
  app.use(store); // Use your Vuex store
  registerPlugins(app);

  app.mount("#app");
});
