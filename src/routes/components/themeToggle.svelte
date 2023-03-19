<script>
	export const ssr = false;

	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		// Toggle Dark Functionality
		let flag = true;

		const toggler = document.querySelector('.toggler');

		// Toggle Dark Function
		const toggleDark = () => {

			const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: Dark)').matches
			console.log(prefersDark);
			if(prefersDark){
				flag = true;
				toggleClass();
			}

			toggler.addEventListener('click', () => {
				toggleClass();
			});
		};
	
	
		const toggleClass =() =>{
			const html = document.documentElement;
				toggler.children[0].classList.toggle('translate-x-6');
				if (flag) {
					html.classList.add('dark');
					// html.classList.add('translate-');

				} else {
					html.classList.remove('dark');
				}
				flag = !flag;
		}

		toggleDark();

	});
</script>

<!-- Toggler -->
<div class="bg-light-500 w-14  cursor-pointer my-1 rounded-2xl toggler dark:bg-slate-900 dark:border-white border-2">
	<div
		class="bg-transparent w-7  scale-75 flex justify-center align-middle rounded-xl transition-transform text-yellow-500  dark:text-slate-50"
	>
		<Icon class="dark:flex-none flex" icon="ph:moon-duotone" height="100%" inline="true" />
		<Icon class=" flex-none dark:flex-auto" icon="ph:sun-duotone" height="100%" inline="true" />
	</div>
</div>
