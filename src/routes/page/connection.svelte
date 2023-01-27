<script>
	import { onMount } from 'svelte';
	import { exclude_internal_props } from 'svelte/internal';
	import { writable } from 'svelte/store';
	import { conn, targetPid, peer } from '../util/connection';
	let pid = writable();

	/**
	 * @type {import("peerjs").DataConnection | null}
	 */
	let conenctionEstablished;

	onMount(async () => {
		let { Peer } = await await import('peerjs');

		$peer = new Peer();
		$peer.on('connection', function (ctarget) {
			console.log($conn);
			$conn = ctarget;
			$conn.on('data', function (data) {
				console.log(data);
			});
		});
		$peer.on('open', function (id) {
			console.log('My peer ID is: ' + id);
			$pid = id;
		});
	});

	function connect(id) {
		$targetPid = id;
		$conn = $peer.connect(id);
		$conn.on('open', function () {
			// Receive messages
			console.log('oppend');

			$conn.on('data', function (data) {
				console.log('Received', data);
			});

			// Send messages
			$conn.send('Hello!');
		});
	}

	let message = '';
	function sendMessage() {
		$conn.send(message);
	}
	/**
	 * @type {string}
	 */
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
