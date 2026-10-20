<script lang="ts">
  import { wackoState } from '$lib/wacko-state.svelte';
  import { onMount } from 'svelte';

  // Auth Tab selection: saved | signup | login
  let authMode = $state<'saved' | 'signup' | 'login'>('signup');
  let savedPassphrase = $state('');

  $effect(() => {
    if (wackoState.savedVaultRecord && !wackoState.isLoggedIn) {
      authMode = 'saved';
    }
  });

  async function handleLoginWithSaved() {
    authError = '';
    if (!savedPassphrase) {
      authError = 'Please enter your master passphrase';
      return;
    }

    try {
      isProcessing = true;
      await wackoState.loginWithSavedVault(savedPassphrase);
    } catch (err: any) {
      authError = err.message || 'Decryption failed: check your passphrase';
    } finally {
      isProcessing = false;
    }
  }

  // Signup form & Wizard state
  let signupStep = $state<1 | 2 | 3 | 4>(1);
  let stepDirection = $state<'forward' | 'backward'>('forward');

  function goToStep(target: 1 | 2 | 3 | 4) {
    if (target > signupStep) {
      if (signupStep === 1 && !pseudonym.trim()) {
        authError = 'Please choose an anonymous alias or pseudonym';
        return;
      }
      authError = '';
      stepDirection = 'forward';
    } else {
      authError = '';
      stepDirection = 'backward';
    }
    signupStep = target;
  }

  function nextStep() {
    if (signupStep === 1) {
      if (!pseudonym.trim()) {
        authError = 'Please choose an anonymous alias or pseudonym';
        return;
      }
      goToStep(2);
    } else if (signupStep === 2) {
      goToStep(3);
    } else if (signupStep === 3) {
      goToStep(4);
    }
  }

  function prevStep() {
    if (signupStep > 1) {
      goToStep((signupStep - 1) as 1 | 2 | 3);
    }
  }

  let pseudonym = $state('');
  let selectedMood = $state('Curious');
  let selectedInterests = $state<string[]>(['Cyberpunk', 'Late Night Talks', 'Ambient Music']);
  let signupPassphrase = $state('');
  let confirmPassphrase = $state('');
  let authError = $state('');
  let isProcessing = $state(false);

  // Login form
  let loginFile = $state<File | null>(null);
  let loginPassphrase = $state('');

  // Main Dashboard Tab: deck | trends | chats | vault
  let activeTab = $state<'deck' | 'trends' | 'chats' | 'vault'>('deck');

  // Chat message input
  let chatInputText = $state('');

  // Mid-Century curated mood options with geometric graphic styling
  const moodOptions = [
    { label: 'Curious', icon: 'compass', accent: '#D5A62A', desc: 'Exploring spontaneous conversations' },
    { label: 'Chill', icon: 'coffee', accent: '#74794B', desc: 'Slow vibes, relaxing chats, zero pressure' },
    { label: 'Romantic', icon: 'heart', accent: '#C65D36', desc: 'Seeking genuine chemistry and sparks' },
    { label: 'Wild', icon: 'spark', accent: '#427C7A', desc: 'Spontaneous, vibrant, late-night energy' },
    { label: 'Deep Talks', icon: 'orbit', accent: '#43352C', desc: 'Midnight philosophy, cosmos, inner thoughts' }
  ];

  // Curated interest pills
  const availableInterests = [
    'Cyberpunk', 'Late Night Talks', 'Ambient Music', 'Philosophy', 'Stargazing',
    'Indie Cinema', 'Techno', 'Roadtrips', 'Analog Photography', 'Anime',
    'Sci-Fi Books', 'Coffee Culture', 'Art & Design', 'Decentralization', 'Vinyl Records',
    'Architecture', 'Poetry', 'Jazz & Soul'
  ];

  function toggleInterest(item: string) {
    if (selectedInterests.includes(item)) {
      selectedInterests = selectedInterests.filter((i) => i !== item);
    } else {
      if (selectedInterests.length < 6) {
        selectedInterests = [...selectedInterests, item];
      }
    }
  }

  // =============================================================
  // Live Vibe & Sparks Editor (Post-Login)
  // =============================================================
  let showVibeModal = $state(false);
  let editMood = $state('Curious');
  let editInterests = $state<string[]>([]);
  let vibeToast = $state('');

  function openVibeEditor() {
    if (wackoState.vault) {
      editMood = wackoState.vault.profile.mood || 'Curious';
      editInterests = [...(wackoState.vault.profile.interests || [])];
    }
    showVibeModal = true;
  }

  function toggleEditInterest(item: string) {
    if (editInterests.includes(item)) {
      editInterests = editInterests.filter((i) => i !== item);
    } else if (editInterests.length < 6) {
      editInterests = [...editInterests, item];
    }
  }

  async function saveVibeChanges() {
    if (!editMood) return;
    try {
      await wackoState.updateProfileVibe(editMood, editInterests);
      showVibeModal = false;
      vibeToast = `Broadcast frequency updated to "${editMood}" across swarm!`;
      setTimeout(() => { vibeToast = ''; }, 3500);
    } catch (err: any) {
      alert('Failed to update vibe: ' + err.message);
    }
  }

  async function quickTuneMood(mood: string) {
    try {
      const interests = wackoState.vault?.profile.interests || [];
      await wackoState.updateProfileVibe(mood, interests);
      vibeToast = `Frequency tuned to "${mood}"!`;
      setTimeout(() => { vibeToast = ''; }, 3500);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function toggleTopicSpark(topic: string) {
    if (!wackoState.vault) return;
    const current = [...(wackoState.vault.profile.interests || [])];
    let next: string[];
    if (current.includes(topic)) {
      next = current.filter((t) => t !== topic);
      vibeToast = `Removed #${topic} from your sparks.`;
    } else {
      if (current.length >= 6) {
        vibeToast = 'Maximum 6 sparks allowed. Remove one first!';
        setTimeout(() => { vibeToast = ''; }, 3000);
        return;
      }
      next = [...current, topic];
      vibeToast = `Added #${topic} to your sparks!`;
    }
    await wackoState.updateProfileVibe(wackoState.vault.profile.mood, next);
    setTimeout(() => { vibeToast = ''; }, 3000);
  }

  // =============================================================
  // Stranger Deck Filtering
  // =============================================================
  let activeMoodFilter = $state<string | null>(null);
  let activeTopicFilter = $state<string | null>(null);

  function filterByMood(mood: string | null) {
    activeMoodFilter = activeMoodFilter === mood ? null : mood;
  }

  function filterByTopic(topic: string | null) {
    activeTopicFilter = activeTopicFilter === topic ? null : topic;
  }

  let activeDeckPeers = $derived.by(() => {
    return wackoState.discoveredPeers.filter((p) => {
      if (activeMoodFilter && p.mood?.toLowerCase() !== activeMoodFilter.toLowerCase()) {
        return false;
      }
      if (activeTopicFilter && !(p.interests || []).includes(activeTopicFilter)) {
        return false;
      }
      return true;
    });
  });

  // =============================================================
  // Swarm Pulse & Trending Telemetry
  // =============================================================
  const baseMoodActivity: Record<string, number> = {
    'Romantic': 19,
    'Deep Talks': 22,
    'Chill': 15,
    'Curious': 18,
    'Wild': 11
  };

  const baseTopicActivity: Record<string, { count: number; change: string }> = {
    'Late Night Talks': { count: 38, change: '+24%' },
    'Cyberpunk': { count: 32, change: '+18%' },
    'Analog Photography': { count: 28, change: '+15%' },
    'Philosophy': { count: 26, change: '+9%' },
    'Ambient Music': { count: 25, change: '+12%' },
    'Coffee Culture': { count: 22, change: '+8%' },
    'Indie Cinema': { count: 19, change: '+14%' },
    'Techno': { count: 18, change: '+21%' },
    'Stargazing': { count: 17, change: '+10%' },
    'Decentralization': { count: 16, change: '+33%' },
    'Art & Design': { count: 15, change: '+7%' },
    'Sci-Fi Books': { count: 13, change: '+5%' },
    'Vinyl Records': { count: 12, change: '+11%' },
    'Anime': { count: 11, change: '+6%' },
    'Architecture': { count: 9, change: '+16%' }
  };

  let trendingMoods = $derived.by(() => {
    const counts: Record<string, number> = { ...baseMoodActivity };
    for (const peer of wackoState.discoveredPeers) {
      const m = peer.mood || 'Curious';
      const key = Object.keys(counts).find((k) => k.toLowerCase() === m.toLowerCase()) || 'Curious';
      counts[key] = (counts[key] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([name, count]) => {
      const opt = moodOptions.find((o) => o.label.toLowerCase() === name.toLowerCase()) || {
        label: name,
        icon: 'spark',
        accent: '#C65D36',
        desc: 'Active frequency'
      };
      return {
        name,
        count,
        percent: Math.round((count / maxCount) * 100),
        ...opt,
        isActive: wackoState.vault?.profile.mood?.toLowerCase() === name.toLowerCase()
      };
    }).sort((a, b) => b.count - a.count);
  });

  let trendingTopics = $derived.by(() => {
    const counts: Record<string, { count: number; change: string }> = {};
    for (const [topic, meta] of Object.entries(baseTopicActivity)) {
      counts[topic] = { ...meta };
    }
    for (const peer of wackoState.discoveredPeers) {
      for (const interest of peer.interests || []) {
        if (!counts[interest]) {
          counts[interest] = { count: 4, change: '+5%' };
        }
        counts[interest].count += 1;
      }
    }
    return Object.entries(counts)
      .map(([topic, meta]) => ({
        topic,
        count: meta.count,
        change: meta.change,
        hasSpark: wackoState.vault?.profile.interests?.includes(topic) || false
      }))
      .sort((a, b) => b.count - a.count);
  });

  let totalSwarmPeers = $derived.by(() => {
    return trendingMoods.reduce((acc, m) => acc + m.count, 0);
  });

  // Handle Signup
  async function handleSignup() {
    authError = '';
    if (!pseudonym.trim()) {
      authError = 'Please choose an anonymous alias or pseudonym';
      return;
    }
    if (signupPassphrase.length < 8) {
      authError = 'Passphrase must be at least 8 characters long for strong encryption';
      return;
    }
    if (signupPassphrase !== confirmPassphrase) {
      authError = 'Passphrases do not match';
      return;
    }

    try {
      isProcessing = true;
      await wackoState.signup(pseudonym, selectedMood, selectedInterests, signupPassphrase);
    } catch (err: any) {
      authError = err.message || 'Failed to generate identity vault';
    } finally {
      isProcessing = false;
    }
  }

  // Handle File Drop / Select
  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      loginFile = target.files[0];
      authError = '';
    }
  }

  // Handle Login
  async function handleLogin() {
    authError = '';
    if (!loginFile) {
      authError = 'Please select or drop your .wacko identity file';
      return;
    }
    if (!loginPassphrase) {
      authError = 'Please enter your vault passphrase';
      return;
    }

    try {
      isProcessing = true;
      const arrayBuffer = await loginFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      await wackoState.loginWithVaultFile(buffer, loginPassphrase);
    } catch (err: any) {
      authError = err.message || 'Decryption failed: check your passphrase';
    } finally {
      isProcessing = false;
    }
  }

  // Chat Helpers
  let activeMatch = $derived(
    wackoState.vault?.matches.find((m) => m.id === wackoState.activeConversationId) || null
  );

  let activeConversationMessages = $derived(
    wackoState.vault?.messages.filter((m) => m.conversationId === wackoState.activeConversationId) || []
  );

  async function handleSendMessage() {
    if (!chatInputText.trim() || !wackoState.activeConversationId) return;
    const text = chatInputText;
    chatInputText = '';
    try {
      await wackoState.sendChatMessage(wackoState.activeConversationId, text);
    } catch (err: any) {
      alert(`Message failed to deliver: ${err.message}`);
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // Kinetic Swiping Motion State
  let swipeAction = $state<'pass' | 'like' | null>(null);

  function triggerPass(peerId: string) {
    if (swipeAction) return;
    swipeAction = 'pass';
    setTimeout(() => {
      wackoState.passStranger(peerId);
      swipeAction = null;
    }, 200);
  }

  function triggerLike(peer: any) {
    if (swipeAction || wackoState.isSolvingPoW) return;
    swipeAction = 'like';
    setTimeout(() => {
      wackoState.likeStranger(peer);
      swipeAction = null;
    }, 200);
  }

  // Keyboard shortcut listener for Dating Deck (Left = Pass, Right = Connect)
  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (wackoState.isLoggedIn && activeTab === 'deck' && activeDeckPeers.length > 0) {
        const currentStranger = activeDeckPeers[0];
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          triggerPass(currentStranger.peerId);
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          triggerLike(currentStranger);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Prune history
  let pruneFeedback = $state('');
  async function runPrune() {
    const count = await wackoState.pruneHistory();
    pruneFeedback = `Pruned ${count} older messages! Vault compressed.`;
    setTimeout(() => {
      pruneFeedback = '';
    }, 4000);
  }

  // Historic archive
  let archiveFeedback = $state('');
  function runArchive() {
    const count = wackoState.exportHistoricalArchive(30);
    archiveFeedback = `Exported cold archive (${count} messages). Memory optimized!`;
    setTimeout(() => {
      archiveFeedback = '';
    }, 5000);
  }

  function goToCelebrationChat() {
    const convId = wackoState.openCelebrationChat();
    if (convId) {
      activeTab = 'chats';
    }
  }

  // Passphrase strength calculation
  let passphraseStrength = $derived.by(() => {
    const p = signupPassphrase;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score += 25;
    if (p.length >= 12) score += 25;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 25;
    if (/[0-9!@#$%^&*]/.test(p)) score += 25;
    return score;
  });
</script>

<div class="min-h-screen flex flex-col justify-between selection:bg-[#C65D36] selection:text-[#FCFAF5]">
  <!-- MID-CENTURY MODERN TOP APP BAR -->
  <header class="sticky top-0 z-40 border-b border-[#D8D0C4] bg-[#FCFAF5]/95 backdrop-blur-sm px-4 lg:px-8 py-3.5">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <!-- Brand & Protocol -->
      <div class="flex items-center gap-3">
        <!-- Mid-Century Geometric Emblem (Arch & Sun Disc) -->
        <div class="relative w-10 h-10 rounded-xl bg-[#C65D36] flex items-center justify-center overflow-hidden shadow-sm">
          <!-- Geometric Semicircle & Sun -->
          <svg class="w-6 h-6 text-[#FCFAF5]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <circle cx="12" cy="12" r="4" fill="#D5A62A"/>
          </svg>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl font-bold tracking-tight text-[#292925] font-display">WACKO</span>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#427C7A]/15 text-[#427C7A] border border-[#427C7A]/30">
              <span class="w-1.5 h-1.5 rounded-full bg-[#427C7A]"></span>
              BitSocial P2P
            </span>
          </div>
          <p class="text-[11px] text-[#A69A89] hidden sm:block">Decentralized stranger dating &bull; Pure ephemeral privacy</p>
        </div>
      </div>

      <!-- Right Header Actions -->
      {#if wackoState.isLoggedIn && wackoState.vault}
        <div class="flex items-center gap-2.5">
          <!-- Live Swarm Beacon in Mid-Century Olive -->
          <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#74794B]/15 border border-[#74794B]/30 text-[#74794B] text-xs font-semibold">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#74794B] opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-[#74794B]"></span>
            </span>
            <span>Swarm Active</span>
          </div>

          <!-- Live Vibe Pill & Editor Trigger -->
          <button
            type="button"
            onclick={openVibeEditor}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-xs font-semibold text-[#292925] transition cursor-pointer active:scale-95 shadow-xs"
            title="Click to tune your mood & sparks"
          >
            <span class="w-2 h-2 rounded-full bg-[#C65D36] animate-pulse"></span>
            <span class="hidden sm:inline text-[#A69A89]">Vibe:</span>
            <span class="font-bold text-[#C65D36] capitalize">{wackoState.vault.profile.mood || 'Curious'}</span>
            <span class="text-[10px] text-[#A69A89] ml-0.5">✏️</span>
          </button>

          <!-- Active Strangers Pill -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F0E6] border border-[#D8D0C4] text-xs text-[#292925]">
            <span class="font-bold text-[#C65D36]">{wackoState.discoveredPeers.length}</span>
            <span class="hidden xs:inline text-[#A69A89]">active</span>
          </div>

          <!-- Save Vault Snapshot -->
          <button
            onclick={() => wackoState.exportUpdatedVault()}
            title="Export encrypted vault backup (.wacko)"
            class="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-xs font-medium text-[#292925] transition cursor-pointer"
          >
            <svg class="w-3.5 h-3.5 text-[#427C7A]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>Save Vault</span>
          </button>

          <!-- Go Ghost / Logout -->
          <button
            onclick={() => wackoState.logout()}
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C65D36]/10 hover:bg-[#C65D36]/20 border border-[#C65D36]/30 text-[#C65D36] text-xs font-bold transition cursor-pointer"
            title="Leave swarm immediately and clear memory"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>Go Ghost</span>
          </button>
        </div>
      {:else}
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFEAE1] border border-[#D8D0C4] text-xs text-[#A69A89]">
          <span class="w-2 h-2 rounded-full bg-[#A69A89]"></span>
          <span>Ghost Mode (Offline)</span>
        </div>
      {/if}
    </div>
  </header>

  <!-- MAIN VIEWPORT -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
    {#if !wackoState.isLoggedIn}
      <!-- AUTHENTICATION / ONBOARDING SCREEN (SPLIT SCREEN LAYOUT) -->
      <div class="w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-4">
        <!-- LEFT COLUMN: EDITORIAL TYPOGRAPHY & BRAND CONTEXT -->
        <div class="lg:col-span-5 flex flex-col justify-center text-left">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C65D36]/10 border border-[#C65D36]/25 text-[#C65D36] text-xs font-semibold mb-4 w-fit">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Decentralized Stranger Dating</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#292925] font-display leading-[1.12] mb-4">
            Mingle with Strangers. <br />
            <span class="text-[#C65D36]">Zero Servers.</span> <br />
            Pure Privacy.
          </h1>

          <p class="text-sm text-[#43352C] leading-relaxed mb-6">
            Your persona, keys, and chat history live strictly inside an encrypted <span class="font-mono font-medium text-[#292925] bg-[#EFEAE1] px-1.5 py-0.5 rounded">.wacko</span> hash file. When you close the app, you leave zero trace on the network.
          </p>

          <!-- Mid-Century Architectural Highlights -->
          <div class="space-y-3 pt-2 border-t border-[#D8D0C4]/70">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-[#C65D36]/15 text-[#C65D36] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </div>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#292925]">Sovereign Cryptography</h4>
                <p class="text-xs text-[#5A554C] leading-normal">Client-side PBKDF2 + AES-256-GCM. Your encrypted vault stays on your hardware.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-[#D5A62A]/20 text-[#A87E12] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </div>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#292925]">BitSocial GunDB Swarm</h4>
                <p class="text-xs text-[#5A554C] leading-normal">Peer-to-peer stranger discovery without central databases, profiles, or tracking.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-[#74794B]/20 text-[#74794B] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </div>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#292925]">Instant Cloak</h4>
                <p class="text-xs text-[#5A554C] leading-normal">Ghost Mode lets you camouflage or sever discovery beacon instantly.</p>
              </div>
            </div>
          </div>

          <!-- Dynamic Context Card reflecting active step -->
          <div class="mt-6 p-3.5 rounded-xl bg-[#EFEAE1]/70 border border-[#D8D0C4] flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#292925] text-[#FCFAF5] flex items-center justify-center shrink-0 text-xs font-bold font-mono">
              {#if authMode === 'signup'}
                0{signupStep}
              {:else if authMode === 'saved'}
                ID
              {:else}
                UP
              {/if}
            </div>
            <div class="text-xs text-[#43352C]">
              {#if authMode === 'signup'}
                {#if signupStep === 1}
                  <strong class="text-[#292925]">01 Moniker:</strong> Pick an anonymous alias. This is the only moniker peers see.
                {:else if signupStep === 2}
                  <strong class="text-[#292925]">02 Vibe:</strong> Tune your broadcast frequency to match peer resonance.
                {:else if signupStep === 3}
                  <strong class="text-[#292925]">03 Sparks:</strong> Pick mutual passions to spark deep conversations.
                {:else}
                  <strong class="text-[#292925]">04 Sovereign Vault:</strong> Set your master key to lock your portable identity.
                {/if}
              {:else if authMode === 'saved'}
                <strong class="text-[#292925]">Saved Session:</strong> Unlock your browser-cached vault with your passphrase.
              {:else}
                <strong class="text-[#292925]">Restore Vault:</strong> Drop your existing <span class="font-mono">.wacko</span> hash file to log in.
              {/if}
            </div>
          </div>

          <!-- Eames Bauhaus Accent Motif -->
          <div class="hidden lg:flex items-center gap-2 pt-4">
            <div class="w-3 h-3 rounded-full bg-[#C65D36]"></div>
            <div class="w-6 h-1.5 rounded-full bg-[#D5A62A]"></div>
            <div class="w-3 h-3 rounded-full bg-[#74794B]"></div>
            <div class="w-8 h-1.5 rounded-full bg-[#427C7A]"></div>
            <div class="h-[1px] flex-1 bg-[#D8D0C4]"></div>
          </div>
        </div>

        <!-- RIGHT COLUMN: INTERACTIVE FORM & INPUTS -->
        <div class="lg:col-span-7 w-full">
          <!-- Mid-Century Architectural Card Container -->
          <div class="bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-6 sm:p-8 shadow-sm relative">
          <!-- Segmented Tab Navigation -->
          <div class="flex rounded-xl bg-[#EFEAE1] p-1 border border-[#D8D0C4] mb-6">
            {#if wackoState.savedVaultRecord}
              <button
                type="button"
                class="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer {authMode === 'saved' ? 'bg-[#292925] text-[#FCFAF5] shadow-xs' : 'text-[#43352C] hover:text-[#292925]'}"
                onclick={() => { authMode = 'saved'; authError = ''; }}
              >
                Saved ({wackoState.savedVaultRecord.pseudonymHint})
              </button>
            {/if}
            <button
              type="button"
              class="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer {authMode === 'signup' ? 'bg-[#292925] text-[#FCFAF5] shadow-xs' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => { authMode = 'signup'; authError = ''; }}
            >
              New Persona
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer {authMode === 'login' ? 'bg-[#292925] text-[#FCFAF5] shadow-xs' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => { authMode = 'login'; authError = ''; }}
            >
              Upload Vault
            </button>
          </div>

          <!-- Auth Error Notification -->
          {#if authError}
            <div class="mb-5 p-3.5 rounded-xl bg-[#C65D36]/10 border border-[#C65D36]/30 text-[#C65D36] text-xs flex items-center gap-2.5">
              <svg class="w-4 h-4 shrink-0 text-[#C65D36]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path stroke-linecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              <span>{authError}</span>
            </div>
          {/if}

          <!-- TAB 1: SAVED IN BROWSER INDEXEDDB -->
          {#if authMode === 'saved' && wackoState.savedVaultRecord}
            <form onsubmit={(e) => { e.preventDefault(); handleLoginWithSaved(); }} class="space-y-5">
              <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4] flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-[#C65D36] flex items-center justify-center font-bold text-[#FCFAF5] text-lg font-display">
                    {wackoState.savedVaultRecord.pseudonymHint.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span class="text-[10px] text-[#A69A89] uppercase tracking-wider font-bold block">Saved Identity</span>
                    <span class="text-base font-bold text-[#292925] block">{wackoState.savedVaultRecord.pseudonymHint}</span>
                    <span class="text-[11px] text-[#427C7A] font-mono">
                      #{wackoState.savedVaultRecord.fileHash.slice(0, 8)} • {(wackoState.savedVaultRecord.byteLength / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onclick={() => wackoState.clearBrowserStorage()}
                  title="Remove from browser storage"
                  class="text-[#A69A89] hover:text-[#C65D36] p-2 transition cursor-pointer rounded-lg hover:bg-[#EFEAE1]"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div>
                <label for="saved-passphrase-input" class="block text-xs font-bold text-[#43352C] uppercase tracking-wider mb-2">
                  Master Passphrase
                </label>
                <input
                  id="saved-passphrase-input"
                  type="password"
                  placeholder="Enter your master passphrase to unlock"
                  bind:value={savedPassphrase}
                  class="w-full px-4 py-2.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                class="w-full py-3.5 rounded-xl font-bold text-sm bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {#if isProcessing}
                  <div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Decrypting Identity...</span>
                {:else}
                  <span>Unlock & Join Swarm</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                {/if}
              </button>
            </form>

          <!-- TAB 2: SIGNUP NEW PERSONA (MID-CENTURY WIZARD) -->
          {:else if authMode === 'signup'}
            <div>
              <!-- Mid-Century Architectural Stepper -->
              <div class="mb-7 px-1">
                <div class="flex items-center justify-between relative">
                  <!-- Connecting Architectural Track Line -->
                  <div class="absolute left-6 right-6 top-4 -translate-y-1/2 h-[2px] bg-[#D8D0C4] z-0"></div>
                  <!-- Active progress fill -->
                  <div
                    class="absolute left-6 top-4 -translate-y-1/2 h-[2px] bg-[#C65D36] z-0 transition-all duration-300"
                    style="width: {((signupStep - 1) / 3) * 100}%"
                  ></div>

                  <!-- Step 1: Moniker -->
                  <button
                    type="button"
                    onclick={() => goToStep(1)}
                    class="relative z-10 flex flex-col items-center group cursor-pointer"
                  >
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 {signupStep === 1 ? 'bg-[#C65D36] text-[#FCFAF5] ring-4 ring-[#C65D36]/20' : signupStep > 1 ? 'bg-[#74794B] text-[#FCFAF5]' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#A69A89]'}">
                      {#if signupStep > 1}
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {:else}
                        01
                      {/if}
                    </div>
                    <span class="text-[10px] font-bold mt-1.5 transition-colors {signupStep === 1 ? 'text-[#C65D36]' : signupStep > 1 ? 'text-[#74794B]' : 'text-[#A69A89]'}">
                      Moniker
                    </span>
                  </button>

                  <!-- Step 2: Vibe -->
                  <button
                    type="button"
                    onclick={() => goToStep(2)}
                    class="relative z-10 flex flex-col items-center group cursor-pointer"
                  >
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 {signupStep === 2 ? 'bg-[#C65D36] text-[#FCFAF5] ring-4 ring-[#C65D36]/20' : signupStep > 2 ? 'bg-[#74794B] text-[#FCFAF5]' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#A69A89]'}">
                      {#if signupStep > 2}
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {:else}
                        02
                      {/if}
                    </div>
                    <span class="text-[10px] font-bold mt-1.5 transition-colors {signupStep === 2 ? 'text-[#C65D36]' : signupStep > 2 ? 'text-[#74794B]' : 'text-[#A69A89]'}">
                      Vibe
                    </span>
                  </button>

                  <!-- Step 3: Sparks -->
                  <button
                    type="button"
                    onclick={() => goToStep(3)}
                    class="relative z-10 flex flex-col items-center group cursor-pointer"
                  >
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 {signupStep === 3 ? 'bg-[#C65D36] text-[#FCFAF5] ring-4 ring-[#C65D36]/20' : signupStep > 3 ? 'bg-[#74794B] text-[#FCFAF5]' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#A69A89]'}">
                      {#if signupStep > 3}
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {:else}
                        03
                      {/if}
                    </div>
                    <span class="text-[10px] font-bold mt-1.5 transition-colors {signupStep === 3 ? 'text-[#C65D36]' : signupStep > 3 ? 'text-[#74794B]' : 'text-[#A69A89]'}">
                      Sparks
                    </span>
                  </button>

                  <!-- Step 4: Vault -->
                  <button
                    type="button"
                    onclick={() => goToStep(4)}
                    class="relative z-10 flex flex-col items-center group cursor-pointer"
                  >
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 {signupStep === 4 ? 'bg-[#C65D36] text-[#FCFAF5] ring-4 ring-[#C65D36]/20' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#A69A89]'}">
                      04
                    </div>
                    <span class="text-[10px] font-bold mt-1.5 transition-colors {signupStep === 4 ? 'text-[#C65D36]' : 'text-[#A69A89]'}">
                      Vault
                    </span>
                  </button>
                </div>
              </div>

              <!-- ================= STEP 1: MONIKER ================= -->
              {#if signupStep === 1}
                <div class="space-y-6 {stepDirection === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}">
                  <div>
                    <h3 class="text-xl font-bold font-display text-[#292925]">What shall strangers call you?</h3>
                    <p class="text-xs text-[#43352C] mt-1 leading-relaxed">
                      Choose an anonymous pseudonym or moniker. This is the only identifier visible to peers in the swarm.
                    </p>
                  </div>

                  <!-- Mid-Century Geometric Avatar Disc Preview -->
                  <div class="flex items-center justify-center py-2">
                    <div class="relative w-24 h-24 rounded-2xl bg-[#F5F0E6] border border-[#D8D0C4] flex items-center justify-center overflow-hidden shadow-xs">
                      <!-- Eames/Girard Overlapping Shapes -->
                      <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#D5A62A]/25"></div>
                      <div class="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-[#C65D36]/20"></div>
                      <div class="relative z-10 w-16 h-16 rounded-xl bg-[#C65D36] flex items-center justify-center text-3xl font-bold text-[#FCFAF5] font-display shadow-xs">
                        {pseudonym.trim() ? pseudonym.trim().charAt(0).toUpperCase() : '?'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label for="alias-input" class="block text-xs font-bold text-[#43352C] uppercase tracking-wider mb-2">
                      Anonymous Alias / Moniker
                    </label>
                    <input
                      id="alias-input"
                      type="text"
                      placeholder="e.g. VelvetNova, HorizonDrifter"
                      bind:value={pseudonym}
                      onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}
                      maxlength={24}
                      class="w-full px-4 py-3 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-sm font-medium"
                      required
                    />
                  </div>

                  <div class="pt-2">
                    <button
                      type="button"
                      onclick={nextStep}
                      class="w-full py-3.5 rounded-xl font-bold text-sm bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue to Vibe</span>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                  </div>
                </div>

              <!-- ================= STEP 2: VIBE ================= -->
              {:else if signupStep === 2}
                <div class="space-y-6 {stepDirection === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}">
                  <div>
                    <h3 class="text-xl font-bold font-display text-[#292925]">Set your frequency.</h3>
                    <p class="text-xs text-[#43352C] mt-1 leading-relaxed">
                      Signals your current mood and conversational energy to nearby strangers.
                    </p>
                  </div>

                  <div class="grid grid-cols-1 gap-2.5">
                    {#each moodOptions as mood}
                      {@const isChosen = selectedMood === mood.label}
                      <button
                        type="button"
                        class="flex items-center gap-3.5 p-3 rounded-xl border text-left transition cursor-pointer {isChosen ? 'border-[#C65D36] bg-[#C65D36]/10 text-[#292925] ring-1 ring-[#C65D36]' : 'border-[#D8D0C4] bg-[#FCFAF5] text-[#43352C] hover:border-[#A69A89]'}"
                        onclick={() => selectedMood = mood.label}
                      >
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 {isChosen ? 'bg-[#C65D36] text-[#FCFAF5]' : 'bg-[#EFEAE1] text-[#43352C]'}">
                          {#if mood.icon === 'compass'}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 8-4-8z"/></svg>
                          {:else if mood.icon === 'coffee'}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>
                          {:else if mood.icon === 'heart'}
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          {:else if mood.icon === 'spark'}
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          {:else}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>
                          {/if}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-bold text-sm text-[#292925] font-display">{mood.label}</div>
                          <div class="text-xs text-[#A69A89] truncate">{mood.desc}</div>
                        </div>
                        {#if isChosen}
                          <div class="w-5 h-5 rounded-full bg-[#C65D36] text-[#FCFAF5] flex items-center justify-center shrink-0">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                          </div>
                        {/if}
                      </button>
                    {/each}
                  </div>

                  <div class="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onclick={prevStep}
                      class="px-5 py-3 rounded-xl font-bold text-xs bg-[#F5F0E6] hover:bg-[#EFEAE1] border border-[#D8D0C4] text-[#43352C] transition active:scale-95 cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onclick={nextStep}
                      class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Choose Sparks</span>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                  </div>
                </div>

              <!-- ================= STEP 3: SPARKS ================= -->
              {:else if signupStep === 3}
                <div class="space-y-6 {stepDirection === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-xl font-bold font-display text-[#292925]">What sparks your curiosity?</h3>
                      <p class="text-xs text-[#43352C] mt-1 leading-relaxed">
                        Pick up to 6 interests. Shared interests raise your compatibility match scores.
                      </p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold shrink-0 {selectedInterests.length > 0 ? 'bg-[#74794B] text-[#FCFAF5]' : 'bg-[#EFEAE1] text-[#A69A89]'}">
                      {selectedInterests.length}/6
                    </span>
                  </div>

                  <div class="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                    {#each availableInterests as interest}
                      {@const isSelected = selectedInterests.includes(interest)}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer {isSelected ? 'bg-[#74794B] text-[#FCFAF5] font-semibold' : 'bg-[#EFEAE1] text-[#43352C] hover:bg-[#D8D0C4]'}"
                        onclick={() => toggleInterest(interest)}
                      >
                        {interest} {isSelected ? '✓' : ''}
                      </button>
                    {/each}
                  </div>

                  <div class="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onclick={prevStep}
                      class="px-5 py-3 rounded-xl font-bold text-xs bg-[#F5F0E6] hover:bg-[#EFEAE1] border border-[#D8D0C4] text-[#43352C] transition active:scale-95 cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onclick={nextStep}
                      class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Lock Sovereign Vault</span>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                  </div>
                </div>

              <!-- ================= STEP 4: SOVEREIGN VAULT ================= -->
              {:else if signupStep === 4}
                <form onsubmit={(e) => { e.preventDefault(); handleSignup(); }} class="space-y-5 {stepDirection === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}">
                  <div>
                    <h3 class="text-xl font-bold font-display text-[#292925]">Lock your sovereign vault.</h3>
                    <p class="text-xs text-[#43352C] mt-1 leading-relaxed">
                      Your identity and keys are encrypted locally using PBKDF2 (600,000 iterations) + AES-256-GCM.
                    </p>
                  </div>

                  <div class="space-y-3 pt-1">
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <label for="passphrase-input" class="text-xs font-bold text-[#43352C] uppercase tracking-wider">
                          Master Passphrase
                        </label>
                        {#if signupPassphrase}
                          <span class="text-[10px] uppercase font-bold tracking-wider text-[#A69A89]">
                            {#if passphraseStrength < 50}
                              Weak
                            {:else if passphraseStrength < 75}
                              Good
                            {:else}
                              Strong
                            {/if}
                          </span>
                        {/if}
                      </div>
                      <input
                        id="passphrase-input"
                        type="password"
                        placeholder="At least 8 characters"
                        bind:value={signupPassphrase}
                        class="w-full px-4 py-2.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-sm"
                        required
                      />
                      {#if signupPassphrase}
                        <div class="w-full h-1 bg-[#EFEAE1] rounded-full mt-2 overflow-hidden">
                          <div
                            class="h-full transition-all duration-300 {passphraseStrength < 50 ? 'bg-[#C65D36]' : passphraseStrength < 75 ? 'bg-[#D5A62A]' : 'bg-[#74794B]'}"
                            style="width: {passphraseStrength}%"
                          ></div>
                        </div>
                      {/if}
                    </div>

                    <div>
                      <input
                        type="password"
                        placeholder="Confirm master passphrase"
                        bind:value={confirmPassphrase}
                        class="w-full px-4 py-2.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-sm"
                        required
                      />
                    </div>
                  </div>

                  <!-- Cryptographic Notice Callout -->
                  <div class="p-3.5 rounded-xl bg-[#427C7A]/10 border border-[#427C7A]/30 text-[#427C7A] text-xs flex items-start gap-2.5">
                    <svg class="w-4 h-4 shrink-0 text-[#427C7A] mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    <div class="leading-relaxed text-[#292925]">
                      <strong>Instant Vault Download:</strong> Submitting automatically downloads an encrypted <span class="font-mono text-[#427C7A] font-bold">.wacko</span> hash file. It is your single portable key to return.
                    </div>
                  </div>

                  <div class="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onclick={prevStep}
                      class="px-5 py-3 rounded-xl font-bold text-xs bg-[#F5F0E6] hover:bg-[#EFEAE1] border border-[#D8D0C4] text-[#43352C] transition active:scale-95 cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition disabled:opacity-50 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {#if isProcessing}
                        <div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                        <span>Generating Keys & Vault...</span>
                      {:else}
                        <span>Enter Swarm & Save Vault</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                        </svg>
                      {/if}
                    </button>
                  </div>
                </form>
              {/if}
            </div>

          <!-- TAB 3: LOAD EXISTING HASH FILE -->
          {:else}
            <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-5">
              <!-- Dropzone -->
              <div>
                <span class="block text-xs font-bold text-[#43352C] uppercase tracking-wider mb-2">
                  Select Your .wacko Hash File
                </span>
                <label class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#D8D0C4] hover:border-[#C65D36] rounded-xl bg-[#F5F0E6] hover:bg-[#EFEAE1] transition cursor-pointer">
                  <input
                    type="file"
                    accept=".wacko"
                    onchange={handleFileSelect}
                    class="hidden"
                  />
                  <div class="w-12 h-12 rounded-xl bg-[#C65D36]/15 flex items-center justify-center text-[#C65D36] mb-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  {#if loginFile}
                    <span class="text-sm font-semibold text-[#292925]">{loginFile.name}</span>
                    <span class="text-xs text-[#C65D36] mt-0.5">{(loginFile.size / 1024).toFixed(1)} KB &bull; Loaded</span>
                  {:else}
                    <span class="text-sm font-medium text-[#292925]">Click to choose or drop your .wacko file</span>
                    <span class="text-xs text-[#A69A89] mt-1">Accepts client-encrypted Wacko Vaults</span>
                  {/if}
                </label>
              </div>

              <!-- Passphrase -->
              <div>
                <label for="login-passphrase-input" class="block text-xs font-bold text-[#43352C] uppercase tracking-wider mb-2">
                  Vault Master Passphrase
                </label>
                <input
                  id="login-passphrase-input"
                  type="password"
                  placeholder="Enter the passphrase you used during creation"
                  bind:value={loginPassphrase}
                  class="w-full px-4 py-2.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-sm"
                  required
                />
              </div>

              <!-- Submit -->
              <button
                type="submit"
                disabled={isProcessing || !loginFile}
                class="w-full py-3.5 rounded-xl font-bold text-sm bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {#if isProcessing}
                  <div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Decrypting Vault...</span>
                {:else}
                  <span>Decrypt & Join BitSocial Swarm</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                {/if}
              </button>
            </form>
          {/if}
        </div>
      </div>
    </div>
  {:else}
      <!-- LOGGED IN MAIN DATING EXPERIENCE -->
      <div class="flex-1 flex flex-col max-w-5xl w-full mx-auto">
        <!-- Mid-Century Segmented Navigation Dock -->
        <div class="flex items-center justify-center mb-6">
          <nav class="flex rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] p-1.5 shadow-xs">
            <!-- Tab: Deck -->
            <button
              class="flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer {activeTab === 'deck' ? 'bg-[#C65D36] text-[#FCFAF5]' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => activeTab = 'deck'}
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-.3 0-.6.2-.7.4-1.2 2.2-2.3 4.2-3.8 6.1C5.8 10.7 4 13.5 4 16.5 4 20.6 7.6 24 12 24s8-3.4 8-7.5c0-3.3-2-6.2-4-8.4-1.3-1.4-2.5-3.3-3.3-5.7-.1-.3-.4-.4-.7-.4z"/>
              </svg>
              <span>Stranger Deck</span>
              {#if wackoState.discoveredPeers.length > 0}
                <span class="px-2 py-0.5 rounded-full bg-white/30 text-[10px] text-[#FCFAF5] font-bold">
                  {wackoState.discoveredPeers.length}
                </span>
              {/if}
            </button>

            <!-- Tab: Trending & Swarm Pulse -->
            <button
              class="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer {activeTab === 'trends' ? 'bg-[#C65D36] text-[#FCFAF5]' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => activeTab = 'trends'}
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.61 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
              </svg>
              <span>Trending & Swarm</span>
              <span class="px-2 py-0.5 rounded-full {activeTab === 'trends' ? 'bg-white/30 text-[#FCFAF5]' : 'bg-[#D5A62A]/20 text-[#A87E12]'} text-[10px] font-bold">
                {totalSwarmPeers}
              </span>
            </button>

            <!-- Tab: Chats & Matches -->
            <button
              class="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer {activeTab === 'chats' ? 'bg-[#C65D36] text-[#FCFAF5]' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => activeTab = 'chats'}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <span>Matches & Chats</span>
              {#if wackoState.vault?.matches.length}
                <span class="px-2 py-0.5 rounded-full bg-[#74794B] text-[10px] text-[#FCFAF5] font-bold">
                  {wackoState.vault.matches.length}
                </span>
              {/if}
            </button>

            <!-- Tab: Vault & Privacy -->
            <button
              class="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer {activeTab === 'vault' ? 'bg-[#C65D36] text-[#FCFAF5]' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => activeTab = 'vault'}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span>Vault & Privacy</span>
            </button>
          </nav>
        </div>

        <!-- ==================== TAB 1: STRANGER DECK ==================== -->
        {#if activeTab === 'deck'}
          <div class="flex-1 flex flex-col items-center justify-center py-2">
            <!-- Mid-Century Deck Filter Bar -->
            <div class="w-full max-w-sm sm:max-w-md mb-4 flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#A69A89]">Filter:</span>
                <button
                  type="button"
                  onclick={() => { activeMoodFilter = null; activeTopicFilter = null; }}
                  class="px-2.5 py-1 rounded-full font-bold transition cursor-pointer {(!activeMoodFilter && !activeTopicFilter) ? 'bg-[#292925] text-[#FCFAF5]' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#43352C] hover:bg-[#EFEAE1]'}"
                >
                  All ({wackoState.discoveredPeers.length})
                </button>
                {#each moodOptions as mood}
                  {@const isSelected = activeMoodFilter?.toLowerCase() === mood.label.toLowerCase()}
                  <button
                    type="button"
                    onclick={() => filterByMood(mood.label)}
                    class="px-2.5 py-1 rounded-full font-bold transition cursor-pointer flex items-center gap-1 {isSelected ? 'bg-[#C65D36] text-[#FCFAF5]' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#43352C] hover:bg-[#EFEAE1]'}"
                  >
                    <span>{mood.label}</span>
                  </button>
                {/each}
              </div>
              {#if activeTopicFilter}
                <button
                  type="button"
                  onclick={() => activeTopicFilter = null}
                  class="px-2.5 py-1 rounded-full bg-[#427C7A] text-[#FCFAF5] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Clear topic filter"
                >
                  <span>#{activeTopicFilter}</span>
                  <span>✕</span>
                </button>
              {/if}
            </div>

            {#if activeDeckPeers.length === 0}
              {#if wackoState.discoveredPeers.length > 0}
                <!-- Peers online, but none matching filter -->
                <div class="max-w-md w-full bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-8 text-center shadow-sm">
                  <div class="w-14 h-14 rounded-2xl bg-[#EFEAE1] flex items-center justify-center mx-auto mb-4 text-[#A69A89]">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </div>
                  <h3 class="text-xl font-bold font-display text-[#292925]">No Peers with "{activeMoodFilter || activeTopicFilter}"</h3>
                  <p class="text-xs text-[#43352C] mt-1.5 leading-relaxed">
                    There are {wackoState.discoveredPeers.length} active strangers in other frequencies right now.
                  </p>
                  <button
                    type="button"
                    onclick={() => { activeMoodFilter = null; activeTopicFilter = null; }}
                    class="mt-4 px-4 py-2 rounded-xl bg-[#C65D36] text-[#FCFAF5] text-xs font-bold hover:bg-[#B5522E] transition cursor-pointer"
                  >
                    Show All Strangers
                  </button>
                </div>
              {:else}
                <!-- MID-CENTURY GEOMETRIC COMPASS RADAR (EMPTY PEERS STATE) -->
                <div class="max-w-md w-full bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-8 sm:p-10 text-center shadow-sm relative overflow-hidden">
                  <!-- Concentric Mid-Century Geometric Rings -->
                  <div class="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                    <div class="absolute inset-0 rounded-full border border-[#D5A62A]/50 animate-radar-arc-1"></div>
                    <div class="absolute inset-0 rounded-full border border-[#C65D36]/40 animate-radar-arc-2"></div>
                    <div class="absolute inset-0 rounded-full border border-[#427C7A]/30 animate-radar-arc-3"></div>
                    <div class="relative w-18 h-18 rounded-2xl bg-[#C65D36] flex items-center justify-center shadow-xs">
                      <svg class="w-8 h-8 text-[#FCFAF5]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2c-.3 0-.6.2-.7.4-1.2 2.2-2.3 4.2-3.8 6.1C5.8 10.7 4 13.5 4 16.5 4 20.6 7.6 24 12 24s8-3.4 8-7.5c0-3.3-2-6.2-4-8.4-1.3-1.4-2.5-3.3-3.3-5.7-.1-.3-.4-.4-.7-.4z"/>
                      </svg>
                    </div>
                  </div>

                  <h3 class="text-2xl font-bold font-display text-[#292925]">Searching Your Frequency...</h3>
                  <p class="text-xs text-[#43352C] mt-2 leading-relaxed">
                    Listening to the BitSocial Gossipsub discovery topic. Only strangers currently online in the mesh will appear.
                  </p>

                  <!-- Live Test Simulator Tip -->
                  <div class="mt-6 p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4] text-xs text-[#292925] text-left">
                    <div class="font-bold text-[#C65D36] mb-1 flex items-center gap-1.5">
                      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span>Instant Local Test:</span>
                    </div>
                    <p class="text-[#43352C] leading-relaxed">
                      Open an incognito window or second browser tab to <span class="font-mono font-bold text-[#427C7A]">localhost:5173</span>, generate a second persona, and both tabs will discover each other over BitSocial!
                    </p>
                  </div>
                </div>
              {/if}
            {:else}
              <!-- MID-CENTURY ARCHITECTURAL DATING CARD -->
              {@const currentStranger = activeDeckPeers[0]}
              <div class="max-w-sm sm:max-w-md w-full flex flex-col items-center">
                <!-- The Portrait Card with Mid-Century Motion -->
                <div class="w-full aspect-[3/4] relative rounded-2xl overflow-hidden border border-[#D8D0C4] shadow-sm bg-[#FCFAF5] flex flex-col justify-between transition-all duration-200 {swipeAction === 'like' ? 'translate-x-14 -translate-y-3 rotate-6 opacity-0' : swipeAction === 'pass' ? '-translate-x-14 translate-y-3 -rotate-6 opacity-0' : 'animate-card-settle'}">
                  <!-- Abstract Mid-Century Graphic Silhouette Top -->
                  <div class="relative h-1/2 bg-[#F5F0E6] overflow-hidden flex items-center justify-center border-b border-[#D8D0C4]">
                    <!-- Overlapping Eames Geometric Shapes -->
                    <div class="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#D5A62A]/20"></div>
                    <div class="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-[#C65D36]/15"></div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-dashed border-[#427C7A]/30"></div>

                    <!-- Center Geometric Monogram -->
                    <div class="relative z-10 w-24 h-24 rounded-2xl bg-[#C65D36] flex items-center justify-center text-4xl font-bold text-[#FCFAF5] font-display shadow-xs">
                      {currentStranger.pseudonym.charAt(0).toUpperCase()}
                    </div>

                    <!-- Top Bar Badges on the Card -->
                    <div class="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-20">
                      <!-- Live Status Badge -->
                      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCFAF5] border border-[#74794B]/30 text-[#74794B] text-xs font-bold">
                        <span class="w-2 h-2 rounded-full bg-[#74794B] animate-pulse"></span>
                        <span>Live Stranger</span>
                      </div>

                      <!-- Compatibility Match Pill -->
                      <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FCFAF5] border border-[#C65D36]/40 text-xs font-bold text-[#C65D36]">
                        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <span>{currentStranger.compatibility.score}% Match</span>
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Card Profile Info -->
                  <div class="p-6 flex flex-col justify-end bg-[#FCFAF5]">
                    <!-- Name & Vibe -->
                    <div class="flex items-baseline gap-2 mb-1">
                      <h3 class="text-2xl sm:text-3xl font-bold text-[#292925] font-display tracking-tight">
                        {currentStranger.pseudonym}
                      </h3>
                      <span class="text-xs text-[#74794B] font-semibold">
                        &bull; {currentStranger.mood}
                      </span>
                    </div>

                    <!-- Compatibility Reason -->
                    {#if currentStranger.compatibility.reasons.length > 0}
                      <p class="text-xs text-[#427C7A] mb-3 font-semibold">
                        &bull; {currentStranger.compatibility.reasons.join(' &bull; ')}
                      </p>
                    {/if}

                    <!-- Interests Pills -->
                    <div class="flex flex-wrap gap-1.5 mt-1">
                      {#each currentStranger.interests as tag}
                        {@const isShared = wackoState.vault?.profile.interests.includes(tag)}
                        <span class="px-2.5 py-1 rounded-md text-xs {isShared ? 'bg-[#C65D36] text-[#FCFAF5] font-semibold' : 'bg-[#EFEAE1] text-[#43352C]'}">
                          {tag} {isShared ? '★' : ''}
                        </span>
                      {/each}
                    </div>
                  </div>
                </div>

                <!-- SOLID MID-CENTURY ACTION DOCK -->
                <div class="flex items-center justify-center gap-6 mt-6">
                  <!-- Pass Button (Left) -->
                  <button
                    onclick={() => triggerPass(currentStranger.peerId)}
                    title="Pass [←]"
                    class="w-14 h-14 rounded-full bg-[#FCFAF5] border border-[#D8D0C4] hover:bg-[#EFEAE1] active:scale-90 text-[#292925] flex items-center justify-center transition-transform duration-150 cursor-pointer shadow-xs"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>

                  <!-- Super Vibe Button (Center: Mustard Yellow) -->
                  <button
                    onclick={() => triggerLike(currentStranger)}
                    disabled={wackoState.isSolvingPoW}
                    title="Super Vibe [Space]"
                    class="w-12 h-12 rounded-full bg-[#D5A62A] hover:bg-[#C29522] active:scale-90 text-[#FCFAF5] flex items-center justify-center transition-transform duration-150 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  </button>

                  <!-- Connect Button (Right: Burnt Orange) -->
                  <button
                    onclick={() => triggerLike(currentStranger)}
                    disabled={wackoState.isSolvingPoW}
                    title="Connect [→]"
                    class="w-16 h-16 rounded-full bg-[#C65D36] hover:bg-[#B5522E] active:scale-95 text-[#FCFAF5] flex items-center justify-center transition-transform duration-150 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {#if wackoState.isSolvingPoW}
                      <div class="w-6 h-6 border-3 border-white/40 border-t-white rounded-full animate-spin"></div>
                    {:else}
                      <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    {/if}
                  </button>
                </div>

                <!-- Keyboard Shortcuts Subtitle -->
                <div class="mt-3 text-[11px] text-[#A69A89] font-medium select-none">
                  Press <kbd class="px-1.5 py-0.5 rounded bg-[#FCFAF5] border border-[#D8D0C4] text-[#43352C]">←</kbd> to Pass &bull; <kbd class="px-1.5 py-0.5 rounded bg-[#FCFAF5] border border-[#D8D0C4] text-[#43352C]">→</kbd> to Connect
                </div>
              </div>
            {/if}
          </div>

        <!-- ==================== TAB 2: SWARM TRENDING & TOPICS ==================== -->
        {:else if activeTab === 'trends'}
          <div class="space-y-6 max-w-4xl w-full mx-auto pb-4">
            <!-- Swarm Telemetry & Persona Status Banner -->
            <div class="bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D8D0C4]">
                <div>
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5A62A]/20 text-[#A87E12] text-xs font-bold mb-2">
                    <span class="w-2 h-2 rounded-full bg-[#D5A62A] animate-ping"></span>
                    <span>BitSocial Live Telemetry</span>
                  </div>
                  <h2 class="text-2xl sm:text-3xl font-black font-display text-[#292925] tracking-tight">
                    Swarm Pulse & Trending Topics
                  </h2>
                  <p class="text-xs text-[#43352C] mt-1 leading-relaxed">
                    Live peer distribution across decentralized Gossipsub topics. Tune your frequency or join hot conversations.
                  </p>
                </div>

                <!-- Total Network Nodes Counter -->
                <div class="px-5 py-3 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4] text-center shrink-0">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-[#A69A89] block">Total Swarm Nodes</span>
                  <span class="text-2xl font-black font-display text-[#C65D36] block">{totalSwarmPeers}</span>
                  <span class="text-[11px] text-[#74794B] font-semibold">● Mesh Online</span>
                </div>
              </div>

              <!-- Your Active Persona Broadcast Status -->
              <div class="mt-5 p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-[#C65D36] text-[#FCFAF5] flex items-center justify-center font-bold text-xl font-display shadow-xs shrink-0">
                    {wackoState.vault?.profile.pseudonym.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-sm text-[#292925]">{wackoState.vault?.profile.pseudonym}</span>
                      <span class="px-2 py-0.5 rounded-full bg-[#C65D36]/15 text-[#C65D36] text-[10px] font-bold">
                        Vibe: {wackoState.vault?.profile.mood || 'Curious'}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      {#each (wackoState.vault?.profile.interests || []) as interest}
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FCFAF5] border border-[#D8D0C4] text-[#43352C]">
                          #{interest}
                        </span>
                      {/each}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onclick={openVibeEditor}
                  class="px-4 py-2.5 rounded-xl bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  <span>Tune Frequency & Sparks</span>
                </button>
              </div>
            </div>

            <!-- SECTION 1: ACTIVE MOODS & FREQUENCIES -->
            <div class="bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold font-display text-[#292925]">Active Frequencies (Moods)</h3>
                  <p class="text-xs text-[#43352C] mt-0.5">Click any mood to tune your broadcast beacon or filter the stranger deck.</p>
                </div>
                <span class="text-xs font-bold text-[#A69A89]">5 Frequencies</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {#each trendingMoods as mood}
                  <div class="p-4 rounded-xl border transition {mood.isActive ? 'border-[#C65D36] bg-[#C65D36]/10 ring-1 ring-[#C65D36]' : 'border-[#D8D0C4] bg-[#FCFAF5] hover:bg-[#F5F0E6]'} flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold {mood.isActive ? 'bg-[#C65D36] text-[#FCFAF5]' : 'bg-[#EFEAE1] text-[#43352C]'}">
                            {#if mood.icon === 'compass'}
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 8-4-8z"/></svg>
                            {:else if mood.icon === 'coffee'}
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>
                            {:else if mood.icon === 'heart'}
                              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            {:else if mood.icon === 'spark'}
                              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                            {:else}
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>
                            {/if}
                          </div>
                          <div>
                            <span class="font-bold text-sm text-[#292925] font-display block">{mood.name}</span>
                            <span class="text-[10px] text-[#A69A89]">{mood.count} peers active</span>
                          </div>
                        </div>
                        {#if mood.isActive}
                          <span class="px-2 py-0.5 rounded-full bg-[#C65D36] text-[#FCFAF5] text-[9px] font-bold">
                            Active
                          </span>
                        {/if}
                      </div>

                      <p class="text-xs text-[#5A554C] leading-normal mb-3">
                        {mood.desc}
                      </p>

                      <!-- Activity Density Bar -->
                      <div class="w-full h-1.5 bg-[#EFEAE1] rounded-full overflow-hidden mb-3">
                        <div
                          class="h-full rounded-full transition-all duration-300 {mood.isActive ? 'bg-[#C65D36]' : 'bg-[#74794B]'}"
                          style="width: {mood.percent}%"
                        ></div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 pt-2 border-t border-[#D8D0C4]/60">
                      {#if !mood.isActive}
                        <button
                          type="button"
                          onclick={() => quickTuneMood(mood.name)}
                          class="flex-1 py-1.5 rounded-lg bg-[#EFEAE1] hover:bg-[#E8E1D5] text-[#292925] font-bold text-[11px] transition cursor-pointer"
                        >
                          Tune Vibe
                        </button>
                      {/if}
                      <button
                        type="button"
                        onclick={() => { filterByMood(mood.name); activeTab = 'deck'; }}
                        class="flex-1 py-1.5 rounded-lg bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-[#43352C] font-semibold text-[11px] transition cursor-pointer"
                      >
                        Filter Deck
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- SECTION 2: TRENDING SPARKS & TOPICS -->
            <div class="bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold font-display text-[#292925]">Trending Sparks (Topics)</h3>
                  <p class="text-xs text-[#43352C] mt-0.5">Ranked by peer engagement in the gossipsub mesh. Click to add to your sparks.</p>
                </div>
                <span class="text-xs font-bold text-[#A69A89]">{trendingTopics.length} Hot Topics</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {#each trendingTopics as item, index}
                  <div class="p-3.5 rounded-xl border border-[#D8D0C4] bg-[#FCFAF5] hover:bg-[#F5F0E6] transition flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <!-- Rank Disc -->
                      <div class="w-7 h-7 rounded-lg {index < 3 ? 'bg-[#C65D36] text-[#FCFAF5]' : 'bg-[#EFEAE1] text-[#A69A89]'} flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </div>

                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="font-bold text-xs text-[#292925] truncate">#{item.topic}</span>
                          <span class="text-[9px] text-[#C65D36] font-bold shrink-0">{item.change}</span>
                        </div>
                        <span class="text-[10px] text-[#A69A89] block">{item.count} peers</span>
                      </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onclick={() => toggleTopicSpark(item.topic)}
                        class="px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer {item.hasSpark ? 'bg-[#C65D36] text-[#FCFAF5]' : 'bg-[#EFEAE1] hover:bg-[#E8E1D5] text-[#43352C]'}"
                        title={item.hasSpark ? 'Remove from sparks' : 'Add to your sparks'}
                      >
                        {item.hasSpark ? '★ Active' : '+ Spark'}
                      </button>
                      <button
                        type="button"
                        onclick={() => { filterByTopic(item.topic); activeTab = 'deck'; }}
                        class="p-1 rounded-md text-[#A69A89] hover:text-[#C65D36] hover:bg-[#EFEAE1] transition cursor-pointer"
                        title="Filter deck by this topic"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

        <!-- ==================== TAB 3: CHATS & MATCHES ==================== -->
        {:else if activeTab === 'chats'}
          <div class="flex-1 bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-3 min-h-[580px]">
            <!-- Matches & Conversations Sidebar -->
            <div class="border-r border-[#D8D0C4] flex flex-col bg-[#F5F0E6]">
              <!-- Top Stories / New Matches Bar -->
              <div class="p-4 border-b border-[#D8D0C4]">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-bold text-xs uppercase tracking-wider text-[#43352C] font-display">New Matches</h3>
                  <span class="text-[11px] text-[#C65D36] font-bold">{wackoState.vault?.matches.length || 0}</span>
                </div>

                {#if !wackoState.vault?.matches.length}
                  <div class="text-[11px] text-[#A69A89] py-1">
                    No mutual connections yet.
                  </div>
                {:else}
                  <!-- Horizontal Match Avatars Carousel -->
                  <div class="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {#each wackoState.vault.matches as match}
                      {@const isOnline = !!wackoState.p2pClient.getActivePeer(match.peerId)}
                      <button
                        onclick={() => wackoState.selectConversation(match.id)}
                        class="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                      >
                        <div class="relative w-12 h-12 rounded-xl bg-[#C65D36] flex items-center justify-center font-bold text-[#FCFAF5] text-sm group-hover:opacity-90 transition">
                          {match.pseudonym.charAt(0).toUpperCase()}
                          {#if isOnline}
                            <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#74794B] border-2 border-[#FCFAF5]"></span>
                          {/if}
                        </div>
                        <span class="text-[10px] text-[#292925] font-semibold truncate max-w-[50px]">{match.pseudonym}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- Message Conversations List -->
              <div class="flex-1 overflow-y-auto divide-y divide-[#D8D0C4]/60">
                {#if !wackoState.vault?.matches.length}
                  <div class="p-6 text-center text-xs text-[#A69A89]">
                    Head over to the
                    <button onclick={() => activeTab = 'deck'} class="text-[#C65D36] underline font-bold cursor-pointer">Stranger Deck</button>
                    to find your connection!
                  </div>
                {:else}
                  {#each wackoState.vault.matches as match}
                    {@const isOnline = !!wackoState.p2pClient.getActivePeer(match.peerId)}
                    {@const isSelected = wackoState.activeConversationId === match.id}
                    {@const lastMsg = wackoState.vault.messages.filter((m) => m.conversationId === match.id).slice(-1)[0]}
                    <button
                      onclick={() => wackoState.selectConversation(match.id)}
                      class="w-full text-left p-4 hover:bg-[#EFEAE1] transition flex items-center gap-3 cursor-pointer {isSelected ? 'bg-[#FCFAF5] border-l-4 border-[#C65D36]' : ''}"
                    >
                      <div class="relative w-11 h-11 rounded-lg bg-[#D5A62A] shrink-0 flex items-center justify-center font-bold text-[#FCFAF5] text-sm">
                        {match.pseudonym.charAt(0).toUpperCase()}
                        {#if isOnline}
                          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#74794B] border-2 border-[#FCFAF5] rounded-full"></span>
                        {/if}
                      </div>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-sm text-[#292925] truncate">{match.pseudonym}</span>
                          <span class="text-[10px] text-[#A69A89]">{isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                        <div class="text-xs text-[#43352C] truncate mt-0.5">
                          {lastMsg ? lastMsg.text : `Vibe: ${match.mood}`}
                        </div>
                      </div>
                    </button>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- Active Conversation Window -->
            <div class="md:col-span-2 flex flex-col bg-[#FCFAF5]">
              {#if activeMatch}
                {@const isPeerOnline = !!wackoState.p2pClient.getActivePeer(activeMatch.peerId)}
                <!-- Chat Window Header -->
                <div class="p-4 border-b border-[#D8D0C4] bg-[#F5F0E6] flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-[#C65D36] flex items-center justify-center font-bold text-[#FCFAF5] text-sm">
                      {activeMatch.pseudonym.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-[#292925] text-sm">{activeMatch.pseudonym}</span>
                        {#if isPeerOnline}
                          <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#74794B]/15 text-[#74794B] border border-[#74794B]/30 font-semibold">Live</span>
                        {:else}
                          <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[#A69A89]">Offline</span>
                        {/if}
                      </div>
                      <div class="text-[11px] text-[#427C7A] flex items-center gap-1 font-medium">
                        <svg class="w-3 h-3 text-[#427C7A]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        <span>E2EE Direct ECDH Session</span>
                      </div>
                    </div>
                  </div>

                  <!-- Quick Backup Action -->
                  <button
                    onclick={() => wackoState.exportUpdatedVault()}
                    class="text-xs px-3 py-1.5 rounded-lg bg-[#FCFAF5] hover:bg-[#EFEAE1] border border-[#D8D0C4] text-[#292925] font-semibold transition cursor-pointer"
                  >
                    Save Vault
                  </button>
                </div>

                <!-- Chat Messages Stream -->
                <div class="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFAF5]">
                  {#if activeConversationMessages.length === 0}
                    <div class="h-full flex flex-col items-center justify-center text-center p-6 text-[#A69A89] text-xs">
                      <div class="w-12 h-12 rounded-full bg-[#C65D36]/10 flex items-center justify-center text-[#C65D36] mb-2">
                        <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </div>
                      <span class="font-bold text-[#292925] text-sm">You and {activeMatch.pseudonym} connected!</span>
                      <p class="mt-1 text-[#43352C]">Say hello. All messages are encrypted end-to-end directly over P2P.</p>
                    </div>
                  {:else}
                    {#each activeConversationMessages as msg}
                      {@const isMe = msg.senderId === wackoState.vault?.profile.id}
                      <div class="flex flex-col {isMe ? 'items-end' : 'items-start'} animate-msg">
                        <div class="max-w-[78%] px-4 py-2.5 rounded-xl text-sm leading-relaxed {isMe ? 'bg-[#C65D36] text-[#FCFAF5] rounded-tr-none' : 'bg-[#F5F0E6] border border-[#D8D0C4] text-[#292925] rounded-tl-none'}">
                          {msg.text}
                        </div>
                        <span class="text-[10px] text-[#A69A89] mt-1 px-1 font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe ? ' &bull; E2EE' : ''}
                        </span>
                      </div>
                    {/each}
                  {/if}
                </div>

                <!-- Chat Input Form -->
                <div class="p-3.5 border-t border-[#D8D0C4] bg-[#F5F0E6]">
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={isPeerOnline ? `Whisper to ${activeMatch.pseudonym}...` : `${activeMatch.pseudonym} is currently offline`}
                      bind:value={chatInputText}
                      onkeydown={handleKeyPress}
                      class="flex-1 px-4 py-2.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-sm"
                    />
                    <button
                      onclick={handleSendMessage}
                      disabled={!chatInputText.trim()}
                      class="px-5 py-2.5 rounded-lg bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] font-bold text-xs shadow-xs transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Send</span>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              {:else}
                <div class="h-full flex flex-col items-center justify-center p-8 text-center text-[#A69A89] text-sm">
                  <div class="w-14 h-14 rounded-xl bg-[#F5F0E6] flex items-center justify-center text-[#A69A89] mb-3">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                  </div>
                  <span class="font-bold text-[#292925]">Select a matched stranger</span>
                  <p class="text-xs text-[#43352C] mt-1">Pick a conversation from the sidebar to start encrypted messaging.</p>
                </div>
              {/if}
            </div>
          </div>

        <!-- ==================== TAB 3: VAULT & PRIVACY ==================== -->
        {:else if activeTab === 'vault'}
          <div class="max-w-2xl w-full mx-auto space-y-6">
            <div class="bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-6 sm:p-8 shadow-sm">
              <h3 class="text-xl font-bold font-display text-[#292925] mb-1">Encrypted Identity Vault</h3>
              <p class="text-xs text-[#43352C] mb-6">Security metrics, cryptographic fingerprint, and storage compression pipeline.</p>

              <!-- Metric Cards in Mid-Century Accents -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4]">
                  <span class="text-[11px] font-bold text-[#A69A89] uppercase tracking-wider block">Vault Fingerprint (SHA-256)</span>
                  <span class="font-mono text-xs text-[#427C7A] truncate mt-1 block">{wackoState.currentFileHash || 'Active'}</span>
                </div>

                <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4]">
                  <span class="text-[11px] font-bold text-[#A69A89] uppercase tracking-wider block">Total Chat Messages</span>
                  <span class="text-xl font-bold text-[#C65D36] mt-1 block">{wackoState.vault?.messages.length || 0} messages</span>
                </div>

                <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4]">
                  <span class="text-[11px] font-bold text-[#A69A89] uppercase tracking-wider block">Compression Pipeline</span>
                  <span class="text-sm font-bold text-[#74794B] mt-1 block">Gzip Stream (75% - 90% savings)</span>
                </div>

                <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4]">
                  <span class="text-[11px] font-bold text-[#A69A89] uppercase tracking-wider block">Encryption Standard</span>
                  <span class="text-sm font-bold text-[#43352C] mt-1 block">AES-256-GCM + PBKDF2</span>
                </div>
              </div>

              <!-- Message Pruning -->
              <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span class="font-bold text-sm text-[#292925] block">Prune Message History</span>
                  <span class="text-xs text-[#43352C] mt-0.5 block">Retains newest 50 messages per stranger to keep vault files featherlight.</span>
                  {#if pruneFeedback}
                    <span class="text-xs text-[#74794B] font-bold mt-1 block">{pruneFeedback}</span>
                  {/if}
                </div>
                <button
                  onclick={runPrune}
                  class="px-4 py-2 rounded-lg bg-[#427C7A] hover:bg-[#356664] text-[#FCFAF5] text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Prune History Now
                </button>
              </div>

              <!-- Archive -->
              <div class="p-4 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4] flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div>
                  <span class="font-bold text-sm text-[#292925] block">Export Historical Archive (.json)</span>
                  <span class="text-xs text-[#43352C] mt-0.5 block">Exports chats older than 30 days into cold storage and purges active memory.</span>
                  {#if archiveFeedback}
                    <span class="text-xs text-[#427C7A] font-bold mt-1 block">{archiveFeedback}</span>
                  {/if}
                </div>
                <button
                  onclick={runArchive}
                  class="px-4 py-2 rounded-lg bg-[#D5A62A] hover:bg-[#C29522] text-[#FCFAF5] text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Export Archive
                </button>
              </div>

              <!-- Export Updated Vault -->
              <div class="mt-6 pt-6 border-t border-[#D8D0C4] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span class="font-bold text-sm text-[#292925] block">Download Latest Vault Backup</span>
                  <span class="text-xs text-[#43352C] mt-0.5 block">Save your latest contacts and chats to a portable .wacko file.</span>
                </div>
                <button
                  onclick={() => wackoState.exportUpdatedVault()}
                  class="px-5 py-2.5 rounded-xl bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] font-bold text-xs shadow-xs transition cursor-pointer shrink-0 flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  <span>Download .wacko File</span>
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <!-- MID-CENTURY TUNE FREQUENCY & SPARKS MODAL -->
  {#if showVibeModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292925]/60 backdrop-blur-xs">
      <div class="max-w-md w-full bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-6 sm:p-7 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <!-- Close button -->
        <button
          type="button"
          onclick={() => showVibeModal = false}
          class="absolute top-5 right-5 text-[#A69A89] hover:text-[#292925] p-1 rounded-lg hover:bg-[#EFEAE1] transition cursor-pointer"
          title="Close modal"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <!-- Header -->
        <div class="mb-5 pr-6">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C65D36]/10 text-[#C65D36] text-[10px] font-bold mb-1.5">
            <span>● Live Presence Broadcast</span>
          </div>
          <h3 class="text-xl font-bold font-display text-[#292925]">
            Tune Frequency & Sparks
          </h3>
          <p class="text-xs text-[#43352C] mt-1 leading-relaxed">
            Change your mood or interests anytime. BitSocial relays update your beacon instantly without resetting your keys or chat history.
          </p>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); saveVibeChanges(); }} class="space-y-5">
          <!-- Step A: Frequency / Mood Radio List -->
          <div>
            <span class="block text-xs font-bold text-[#43352C] uppercase tracking-wider mb-2">
              Select Your Vibe
            </span>
            <div class="grid grid-cols-1 gap-2">
              {#each moodOptions as mood}
                {@const isChosen = editMood.toLowerCase() === mood.label.toLowerCase()}
                <button
                  type="button"
                  class="flex items-center gap-3 p-2.5 rounded-xl border text-left transition cursor-pointer {isChosen ? 'border-[#C65D36] bg-[#C65D36]/10 text-[#292925] ring-1 ring-[#C65D36]' : 'border-[#D8D0C4] bg-[#FCFAF5] text-[#43352C] hover:border-[#A69A89]'}"
                  onclick={() => editMood = mood.label}
                >
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 {isChosen ? 'bg-[#C65D36] text-[#FCFAF5]' : 'bg-[#EFEAE1] text-[#43352C]'}">
                    {#if mood.icon === 'compass'}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 8-4-8z"/></svg>
                    {:else if mood.icon === 'coffee'}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>
                    {:else if mood.icon === 'heart'}
                      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    {:else if mood.icon === 'spark'}
                      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-xs text-[#292925] font-display">{mood.label}</div>
                    <div class="text-[11px] text-[#A69A89] truncate">{mood.desc}</div>
                  </div>
                  {#if isChosen}
                    <div class="w-4 h-4 rounded-full bg-[#C65D36] text-[#FCFAF5] flex items-center justify-center shrink-0">
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Step B: Sparks / Interests Selector -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="block text-xs font-bold text-[#43352C] uppercase tracking-wider">
                Sparks (Pick Up To 6)
              </span>
              <span class="text-[11px] font-mono font-bold {editInterests.length === 6 ? 'text-[#C65D36]' : 'text-[#74794B]'}">
                {editInterests.length}/6
              </span>
            </div>
            <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-[#F5F0E6] border border-[#D8D0C4]">
              {#each availableInterests as interest}
                {@const isSelected = editInterests.includes(interest)}
                <button
                  type="button"
                  onclick={() => toggleEditInterest(interest)}
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 {isSelected ? 'bg-[#C65D36] text-[#FCFAF5] font-semibold' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#43352C] hover:bg-[#EFEAE1]'}"
                >
                  <span>{interest}</span>
                  {#if isSelected}
                    <span class="text-[10px]">✓</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Modal Action Buttons -->
          <div class="flex items-center gap-3 pt-3 border-t border-[#D8D0C4]">
            <button
              type="button"
              onclick={() => showVibeModal = false}
              class="w-1/3 py-2.5 rounded-xl bg-[#F5F0E6] hover:bg-[#EFEAE1] border border-[#D8D0C4] text-[#43352C] font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 py-2.5 rounded-xl bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Broadcast New Frequency</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- FLOATING VIBE TOAST NOTIFICATION -->
  {#if vibeToast}
    <div class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#292925] text-[#FCFAF5] border border-[#D8D0C4]/30 shadow-lg text-xs font-semibold animate-msg">
      <div class="w-5 h-5 rounded-full bg-[#C65D36] flex items-center justify-center shrink-0">
        <svg class="w-3 h-3 text-[#FCFAF5]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <span>{vibeToast}</span>
      <button
        type="button"
        onclick={() => vibeToast = ''}
        class="text-white/60 hover:text-white ml-1 p-0.5"
      >
        ✕
      </button>
    </div>
  {/if}

  <!-- MID-CENTURY MUTUAL MATCH CELEBRATION MODAL -->
  {#if wackoState.newMatchCelebration}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292925]/60 backdrop-blur-xs">
      <div class="max-w-sm w-full bg-[#FCFAF5] border-2 border-[#C65D36] rounded-2xl p-6 sm:p-8 text-center shadow-md relative overflow-hidden">
        <!-- Overlapping Geometric Profile Circles -->
        <div class="flex items-center justify-center relative mb-5">
          <!-- My Avatar in Mustard -->
          <div class="w-16 h-16 rounded-xl bg-[#D5A62A] flex items-center justify-center text-xl font-bold text-[#FCFAF5] font-display shadow-xs -mr-2 z-10 animate-match-left">
            {wackoState.vault?.profile.pseudonym.charAt(0).toUpperCase() || 'Y'}
          </div>
          <!-- Center Heart Connector Badge -->
          <div class="w-8 h-8 rounded-full bg-[#C65D36] text-[#FCFAF5] flex items-center justify-center z-30 shadow-xs animate-heart-pop">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <!-- Stranger Avatar in Olive -->
          <div class="w-16 h-16 rounded-xl bg-[#74794B] flex items-center justify-center text-xl font-bold text-[#FCFAF5] font-display shadow-xs -ml-2 z-10 animate-match-right">
            {wackoState.newMatchCelebration.pseudonym.charAt(0).toUpperCase()}
          </div>
        </div>

        <h3 class="text-2xl font-bold font-display text-[#292925]">
          It's a Match!
        </h3>
        <p class="text-xs text-[#43352C] mt-2 leading-relaxed">
          You and <strong class="text-[#C65D36]">{wackoState.newMatchCelebration.pseudonym}</strong> both connected over BitSocial!
        </p>

        <div class="flex flex-col gap-2.5 mt-6">
          <button
            onclick={goToCelebrationChat}
            class="w-full py-3.5 rounded-xl bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Send First Whisper (E2EE Chat)
          </button>
          <button
            onclick={() => wackoState.dismissCelebration()}
            class="w-full py-2.5 rounded-xl bg-[#F5F0E6] hover:bg-[#EFEAE1] border border-[#D8D0C4] text-[#43352C] hover:text-[#292925] font-semibold text-xs transition cursor-pointer"
          >
            Keep Exploring
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- MID-CENTURY MINIMAL FOOTER -->
  <footer class="border-t border-[#D8D0C4] py-4 px-6 text-center text-xs text-[#A69A89] bg-[#FCFAF5]">
    Wacko &bull; Decentralized Stranger Mingling via <a href="https://bitsocial.net/" target="_blank" rel="noopener noreferrer" class="text-[#43352C] hover:text-[#C65D36] underline font-medium">BitSocial P2P Protocol</a>. All keys are encrypted client-side.
  </footer>
</div>
