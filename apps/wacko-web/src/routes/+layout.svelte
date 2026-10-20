<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head>
  <title>Wacko — Decentralized Stranger Dating on BitSocial</title>
  <meta name="description" content="Privacy-first, zero-server decentralized dating app for mingling with strangers via the BitSocial P2P protocol." />
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..800;1,9..40,400..700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen text-[#292925] flex flex-col font-['IBM_Plex_Sans',sans-serif]">
  {@render children()}
</div>
