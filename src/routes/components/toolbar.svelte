<script>
	import Icon from '@iconify/svelte';
import ThemeToggle from './themeToggle.svelte';
</script>

<div class=" max-w sticky top-0  px-4 sm:px-6 lg:px-8 bg-th-primary">
	<div class="flex justify-between items-center px-2">
		<div>
			<h6
				class="text-l font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600"
			>
				Wacko
			</h6>
		</div>
		<div class="flex align-middle items-center">
            <Icon class="mx-2 dark:text-white" icon="fe:github" inline="true" height="1em"></Icon>
			<ThemeToggle />
		</div>
	</div>
</div>
