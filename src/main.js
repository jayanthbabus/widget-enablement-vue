/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from "./App.vue";
import "bootstrap/dist/css/bootstrap.min.css";
import { x3DDashboardUtils } from "./lib/widget";
import "bootstrap";
// Composables
import { createApp } from "vue";

// Plugins
import { registerPlugins } from "@/plugins";

x3DDashboardUtils.disableCSS(true);

// add title to widget container
window.title = "Widget Enablement";
//widget.setTitle(window.title);
const app = createApp(App);

registerPlugins(app);

app.mount("#app");
