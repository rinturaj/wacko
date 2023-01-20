import { c as create_ssr_component, a as add_attribute } from "../../../immutable/chunks/index-99e9e23d.js";
const Avatar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { image } = $$props;
  if ($$props.image === void 0 && $$bindings.image && image !== void 0)
    $$bindings.image(image);
  return `<img${add_attribute("src", image, 0)} class="${"border-spacing-2 border-4 hover:ease-in border-red-200 rounded-3xl"}">`;
});
export {
  Avatar as default
};
