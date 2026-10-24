import Popup from './pages/Popup.svelte';
import { mount } from "svelte";

function init() {
  const target = document.getElementById("app") || document.body;
  mount(Popup, { target });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
