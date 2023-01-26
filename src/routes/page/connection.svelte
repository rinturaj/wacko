<script>
	import { onMount } from 'svelte';
	import { conn, connect, peer, pid, targetPid } from '../util/connection';

    var conenctionEstablished 
	onMount(() => {
		peer.on('connection', function (ctarget) {
            conenctionEstablished = ctarget;
			conenctionEstablished.on('data', function (data) {
				// Will print 'hi!'
				console.log(data);
			});
		});
		peer.on('open', function (id) {
			console.log('My peer ID is: ' + id);

			pid.set(id);
		});
	});

	let message = '';
	function sendMessage() {
        if(conenctionEstablished!=null){
            conenctionEstablished.send(message);
        }else{
            conn.send(message);
        }
	
	
	}
	let targetPidLocal;
</script>

<form class="w-full max-w-sm">
	<div class="md:flex md:items-center mb-6">
		<div class="md:w-1/3">
			<label
				class="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
				for="inline-full-name"
			>
				ID
			</label>
		</div>
		<div class="md:w-2/3">
			<input
				bind:value={targetPidLocal}
				class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
				id="inline-full-name"
				type="text"
			/>
		</div>
	</div>
	<div class="md:flex md:items-center mb-6">
		<div class="md:w-1/3">
			<h6>{$pid}</h6>
		</div>
	</div>

	<div class="md:flex md:items-center mb-6">
		<div class="md:w-1/3">
			<label
				class="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
				for="inline-full-name"
			>
				ID
			</label>
		</div>
		<div class="md:w-2/3">
			<textarea
				bind:value={message}
				class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
				id="inline-full-name"
			/>
		</div>
	</div>

	<div class="md:flex md:items-center">
		<div class="md:w-1/3">
			<button
				on:click={() => sendMessage()}
				class="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
				type="button"
			>
				Send
			</button>
		</div>

		<div class="md:w-2/3">
			<button
				on:click={() => connect(targetPidLocal)}
				class="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
				type="button"
			>
				Connect
			</button>
		</div>
	</div>
</form>
