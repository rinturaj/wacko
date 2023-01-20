export const manifest = {
	appDir: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		entry: {"file":"immutable/start-e2eab358.js","imports":["immutable/start-e2eab358.js","immutable/chunks/index-195b0519.js"],"stylesheets":[]},
		nodes: [
			() => import('./nodes/0.js'),
			() => import('./nodes/1.js'),
			() => import('./nodes/3.js'),
			() => import('./nodes/9.js'),
			() => import('./nodes/10.js'),
			() => import('./nodes/2.js'),
			() => import('./nodes/4.js'),
			() => import('./nodes/7.js'),
			() => import('./nodes/8.js'),
			() => import('./nodes/5.js'),
			() => import('./nodes/6.js')
		],
		routes: [
			{
				type: 'page',
				id: "",
				pattern: /^\/$/,
				names: [],
				types: [],
				path: "/",
				shadow: null,
				a: [0,2],
				b: [1]
			},
			{
				type: 'page',
				id: "signin",
				pattern: /^\/signin\/?$/,
				names: [],
				types: [],
				path: "/signin",
				shadow: null,
				a: [0,3],
				b: [1]
			},
			{
				type: 'page',
				id: "signup",
				pattern: /^\/signup\/?$/,
				names: [],
				types: [],
				path: "/signup",
				shadow: null,
				a: [0,4],
				b: [1]
			},
			{
				type: 'page',
				id: "components/avatar",
				pattern: /^\/components\/avatar\/?$/,
				names: [],
				types: [],
				path: "/components/avatar",
				shadow: null,
				a: [0,5],
				b: [1]
			},
			{
				type: 'page',
				id: "page/about",
				pattern: /^\/page\/about\/?$/,
				names: [],
				types: [],
				path: "/page/about",
				shadow: null,
				a: [0,6],
				b: [1]
			},
			{
				type: 'page',
				id: "page/home",
				pattern: /^\/page\/home\/?$/,
				names: [],
				types: [],
				path: "/page/home",
				shadow: null,
				a: [0,7],
				b: [1]
			},
			{
				type: 'page',
				id: "page/profile",
				pattern: /^\/page\/profile\/?$/,
				names: [],
				types: [],
				path: "/page/profile",
				shadow: null,
				a: [0,8],
				b: [1]
			},
			{
				type: 'page',
				id: "page/account/update-image",
				pattern: /^\/page\/account\/update-image\/?$/,
				names: [],
				types: [],
				path: "/page/account/update-image",
				shadow: null,
				a: [0,9],
				b: [1]
			},
			{
				type: 'page',
				id: "page/account/update-profile",
				pattern: /^\/page\/account\/update-profile\/?$/,
				names: [],
				types: [],
				path: "/page/account/update-profile",
				shadow: null,
				a: [0,10],
				b: [1]
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
};
