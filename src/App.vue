<template>
  <Home></Home>
</template>

<script>
//
import Home from "@/views/Home.vue";
import { onMounted } from "vue";
import { useStore } from "vuex";
import { loadFonts } from "../src/plugins/webfontloader";
export default {
  name: "App",
  components: {
    Home,
  },
  setup() {
    onMounted(() => {
      loadFonts().catch((error) => {
        console.error("Error loading fonts:", error);
      });
    });
  },
};
</script>
