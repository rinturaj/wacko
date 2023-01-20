import { c as create_ssr_component, v as validate_component } from "../../../immutable/chunks/index-99e9e23d.js";
import Avatar from "../components/avatar.svelte.js";
const Home = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Avatar, "Avatar").$$render($$result, {
    image: "https://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50"
  }, {}, {})}`;
});
export {
  Home as default
};
