export { matchers } from './client-matchers.js';

export const components = [
	() => import("../../src/routes/__layout.svelte"),
	() => import("../runtime/components/error.svelte"),
	() => import("../../src/routes/components/avatar.svelte"),
	() => import("../../src/routes/index.svelte"),
	() => import("../../src/routes/page/about.svelte"),
	() => import("../../src/routes/page/account/update-image.svelte"),
	() => import("../../src/routes/page/account/update-profile.svelte"),
	() => import("../../src/routes/page/home.svelte"),
	() => import("../../src/routes/page/profile.svelte"),
	() => import("../../src/routes/signin.svelte"),
	() => import("../../src/routes/signup.svelte")
];

export const dictionary = {
	"": [[0, 3], [1]],
	"signin": [[0, 9], [1]],
	"signup": [[0, 10], [1]],
	"components/avatar": [[0, 2], [1]],
	"page/about": [[0, 4], [1]],
	"page/home": [[0, 7], [1]],
	"page/profile": [[0, 8], [1]],
	"page/account/update-image": [[0, 5], [1]],
	"page/account/update-profile": [[0, 6], [1]]
};