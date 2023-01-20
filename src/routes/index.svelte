<script>
	// @ts-nocheck

	import { onMount } from 'svelte';
	import Avatar from './components/avatar.svelte';

	import { inject } from '@vercel/analytics';

	onMount(() => {
		inject();

		// @ts-ignore
		var canvas,
			ctx,
			circ,
			nodes,
			mouse,
			SENSITIVITY,
			SIBLINGS_LIMIT,
			DENSITY,
			NODES_QTY,
			ANCHOR_LENGTH,
			MOUSE_RADIUS;

		// how close next node must be to activate connection (in px)
		// shorter distance == better connection (line width)
		SENSITIVITY = 100;
		// note that siblings limit is not 'accurate' as the node can actually have more connections than this value that's because the node accepts sibling nodes with no regard to their current connections this is acceptable because potential fix would not result in significant visual difference
		// more siblings == bigger node
		SIBLINGS_LIMIT = 150;
		// default node margin
		DENSITY = 60;
		// total number of nodes used (incremented after creation)
		NODES_QTY = 0;
		// avoid nodes spreading
		ANCHOR_LENGTH = 150;
		// highlight radius
		MOUSE_RADIUS = 400;

		circ = 2 * Math.PI;
		nodes = [];

		canvas = document.querySelector('canvas');
		resizeWindow();
		mouse = {
			x: canvas.width / 2,
			y: canvas.height / 2
		};
		ctx = canvas.getContext('2d');
		if (!ctx) {
			alert("Ooops! Your browser does not support canvas :'(");
		}

		function Node(x, y) {
			this.anchorX = x;
			this.anchorY = y;
			this.x = Math.random() * (x - (x - ANCHOR_LENGTH)) + (x - ANCHOR_LENGTH);
			this.y = Math.random() * (y - (y - ANCHOR_LENGTH)) + (y - ANCHOR_LENGTH);
			this.vx = Math.random() * 2 - 1;
			this.vy = Math.random() * 2 - 1;
			this.energy = Math.random() * 100;
			this.radius = Math.random();
			this.siblings = [];
			this.brightness = 0;
		}

		Node.prototype.drawNode = function () {
			var color = 'rgba(255, 255, 255, ' + this.brightness + ')';
			ctx.beginPath();
			ctx.arc(
				this.x,
				this.y,
				2 * this.radius + (2 * this.siblings.length) / SIBLINGS_LIMIT,
				0,
				circ
			);
			ctx.fillStyle = color;
			ctx.fill();
		};

		Node.prototype.drawConnections = function () {
			for (var i = 0; i < this.siblings.length; i++) {
				var color = 'rgba(255, 255, 255, ' + this.brightness + ')';
				ctx.beginPath();
				ctx.moveTo(this.x, this.y);
				ctx.lineTo(this.siblings[i].x, this.siblings[i].y);
				ctx.lineWidth = 1 - calcDistance(this, this.siblings[i]) / SENSITIVITY;
				ctx.strokeStyle = color;
				ctx.stroke();
			}
		};

		Node.prototype.moveNode = function () {
			this.energy -= 2;
			if (this.energy < 1) {
				this.energy = Math.random() * 100;
				if (this.x - this.anchorX < -ANCHOR_LENGTH) {
					this.vx = Math.random() * 2;
				} else if (this.x - this.anchorX > ANCHOR_LENGTH) {
					this.vx = Math.random() * -2;
				} else {
					this.vx = Math.random() * 4 - 2;
				}
				if (this.y - this.anchorY < -ANCHOR_LENGTH) {
					this.vy = Math.random() * 2;
				} else if (this.y - this.anchorY > ANCHOR_LENGTH) {
					this.vy = Math.random() * -2;
				} else {
					this.vy = Math.random() * 4 - 2;
				}
			}
			this.x += (this.vx * this.energy) / 100;
			this.y += (this.vy * this.energy) / 100;
		};

		function initNodes() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			nodes = [];
			for (var i = DENSITY; i < canvas.width; i += DENSITY) {
				for (var j = DENSITY; j < canvas.height; j += DENSITY) {
					nodes.push(new Node(i, j));
					NODES_QTY++;
				}
			}
		}

		function calcDistance(node1, node2) {
			return Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));
		}

		function findSiblings() {
			var node1, node2, distance;
			for (var i = 0; i < NODES_QTY; i++) {
				node1 = nodes[i];
				node1.siblings = [];
				for (var j = 0; j < NODES_QTY; j++) {
					node2 = nodes[j];
					if (node1 !== node2) {
						distance = calcDistance(node1, node2);
						if (distance < SENSITIVITY) {
							if (node1.siblings.length < SIBLINGS_LIMIT) {
								node1.siblings.push(node2);
							} else {
								var node_sibling_distance = 0;
								var max_distance = 0;
								var s;
								for (var k = 0; k < SIBLINGS_LIMIT; k++) {
									node_sibling_distance = calcDistance(node1, node1.siblings[k]);
									if (node_sibling_distance > max_distance) {
										max_distance = node_sibling_distance;
										s = k;
									}
								}
								if (distance < max_distance) {
									node1.siblings.splice(s, 1);
									node1.siblings.push(node2);
								}
							}
						}
					}
				}
			}
		}

		function redrawScene() {
			resizeWindow();
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			findSiblings();
			var i, node, distance;
			for (i = 0; i < NODES_QTY; i++) {
				node = nodes[i];
				distance = calcDistance(
					{
						x: mouse.x,
						y: mouse.y
					},
					node
				);
				if (distance < MOUSE_RADIUS) {
					node.brightness = 1 - distance / MOUSE_RADIUS;
				} else {
					node.brightness = 0;
				}
			}
			for (i = 0; i < NODES_QTY; i++) {
				node = nodes[i];
				if (node.brightness) {
					node.drawNode();
					node.drawConnections();
				}
				node.moveNode();
			}
			requestAnimationFrame(redrawScene);
		}

		function initHandlers() {
			document.addEventListener('resize', resizeWindow, false);
			canvas.addEventListener('mousemove', mousemoveHandler, false);
		}

		function resizeWindow() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}

		function mousemoveHandler(e) {
			mouse.x = e.clientX;
			mouse.y = e.clientY;
		}

		initHandlers();
		initNodes();
		redrawScene();
	});
</script>

<div class="bg-gray-50">
	<div
		class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between"
	>
		<div class="">
			<h2
				class="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600"
			>
				Wacko
			</h2>
			<small class="pl-4">Welcome to decentralized dating application</small>
		</div>
		<div class="mx-5 border-l-2 ">
			<p class="text-slate-600 pl-5 text-sm text-right">
				Be cautious and protect yourself. Never give out personal information or meet in person with
				someone you've only met online.
			</p>
		</div>
		<div class="mt-8  flex lg:mt-0 lg:flex-shrink-0">
			<div class="inline-flex rounded-md shadow">
				<a
					href="/signup"
					class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
				>
					SignUp
				</a>
			</div>
			<div class="ml-3 inline-flex rounded-md shadow">
				<a
					href="/signin"
					class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-pink-600 bg-white hover:bg-pink-50"
				>
					Login
				</a>
			</div>
			<div class="  p-2 rounded">
				<button
					class="py-2 px-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
				>
					<svg
						width="24"
						height="24"
						fill="currentColor"
						class="text-pink-600 text-opacity-50 transform"
						><path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.606 9.606 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48C19.137 20.107 22 16.373 22 11.969 22 6.463 17.522 2 12 2z"
						/></svg
					>
				</button>
			</div>
		</div>
	</div>
</div>

<div class="flex justify-center relative">
	<canvas style="  background-color: #25003a;	" />

	<div class="  absolute ">
		<div class="wrapper">
			<div class="container">
				<h1 class="font-mono">Open up and connect, a stranger may become a friend</h1>
			</div>
		</div>
	</div>

	<!-- SOLAR SYSTEM -->
	<!-- <div class="spinner-box">
		<div class="solar-system ">
			<div class="earth-orbit orbit">
				<div class="planet earth" />
				<div class="venus-orbit orbit">
					<div class="planet venus " />
					<div class="mercury-orbit orbit">
						<div class="planet mercury bg-gradient-to-r     from-purple-400 to-pink-600">
							<Avatar image="https://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div> -->
</div>

<div class="container mx-auto">
	<div class="flex flex-row justify-center mt-3">
		<a class="mx-1"><img src="https://img.shields.io/github/license/rinturaj/wacko" /></a>
		<a class="mx-1"><img src="https://img.shields.io/github/checks-status/rinturaj/wacko/main" /></a
		>
		<a class="mx-1"><img src="https://img.shields.io/github/package-json/v/rinturaj/wacko" /></a>
		<a class="mx-1"><img src="https://img.shields.io/github/watchers/rinturaj/wacko" /></a>
		<a class="mx-1"><img src="https://img.shields.io/github/stars/rinturaj/wacko" /></a>
		<a class="mx-1"><img src="https://img.shields.io/github/forks/rinturaj/wacko" /></a>
	</div>
</div>

<style>
	* {
		box-sizing: border-box;
	}

	:root {
		--color-1: #8725e8;
		--color-2: #902a9f;
		--color-3: #f1117d;
		--color-4: #f9002f;
		--color-5: #fa4d55;
	}

	.wrapper {
		line-height: 1;
		min-height: 100%;
		display: grid;
		place-items: center;
		min-height: calc(100vh - 16px);
	}

	h1 {
		cursor: default;
		font-family: 'Exo', sans-serif;
		font-size: 15vw;
		font-weight: 900;
		width: -webkit-min-content;
		width: -moz-min-content;
		width: min-content;
		margin: auto;
		text-transform: uppercase;
		background: linear-gradient(
			219deg,
			var(--color-1) 19%,
			transparent 19%,
			transparent 20%,
			var(--color-2) 20%,
			var(--color-2) 39%,
			transparent 39%,
			transparent 40%,
			var(--color-3) 40%,
			var(--color-3) 59%,
			transparent 59%,
			transparent 60%,
			var(--color-4) 60%,
			var(--color-4) 79%,
			transparent 79%,
			transparent 80%,
			var(--color-5) 80%
		);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.container {
		padding: 1.5rem;
		text-align: center;
		/* background: radial-gradient(circle at 1.4% 1.4%, var(--color-1) 0.8%, transparent 0.8%),
			radial-gradient(circle at 5.5% 3%, var(--color-2) 0.45%, transparent 0.45%),
			radial-gradient(circle at 2.5% 3.5%, var(--color-3) 0.5%, transparent 0.5%),
			radial-gradient(circle at 4.5% 1.2%, var(--color-4) 0.25%, transparent 0.25%),
			radial-gradient(circle at 98% 98%, var(--color-1) 0.8%, transparent 0.8%),
			radial-gradient(circle at 95% 95%, var(--color-2) 0.45%, transparent 0.45%),
			radial-gradient(circle at 94.5% 97.5%, var(--color-3) 0.5%, transparent 0.5%),
			radial-gradient(circle at 98.5% 95.5%, var(--color-4) 0.25%, transparent 0.25%); */
	}

	@media screen and (min-width: 768px) {
		h1 {
			font-size: 4.5rem;
		}
	}
</style>
