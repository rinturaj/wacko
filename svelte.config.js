import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';
const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [
		preprocess({
		  postcss: true,
		}),
	  ],

	kit: {
		adapter: adapter(),
		outDir: 'dist',
		paths: {
			base: dev ? '' : '/wacko',
		  },
	}
	
};

export default config;
