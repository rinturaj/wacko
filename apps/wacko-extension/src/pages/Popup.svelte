<script lang="ts">
  import { wackoState } from '../lib/wacko-state.svelte';
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
    'Indie Cinema', 'Synthwave', 'Vintage Vinyl', 'Brutalism', 'Coffee & Vinyl',
    'Cryptography', 'Night Walks', 'Architecture', 'Obscure Art', 'Lo-Fi Beats'
  ];

  function toggleInterest(tag: string) {
    if (selectedInterests.includes(tag)) {
      selectedInterests = selectedInterests.filter((t) => t !== tag);
    } else {
      if (selectedInterests.length < 5) {
        selectedInterests = [...selectedInterests, tag];
      }
    }
  }

  // Edit Vibe Modal State
  let isEditingVibe = $state(false);
  let editMood = $state('');
  let editInterests = $state<string[]>([]);

  function openVibeEditor() {
    if (!wackoState.vault) return;
    editMood = wackoState.vault.profile.mood;
    editInterests = [...wackoState.vault.profile.interests];
    isEditingVibe = true;
  }

  function toggleEditInterest(tag: string) {
    if (editInterests.includes(tag)) {
      editInterests = editInterests.filter((t) => t !== tag);
    } else {
      if (editInterests.length < 5) {
        editInterests = [...editInterests, tag];
      }
    }
  }

  async function handleSaveVibe() {
    try {
      await wackoState.updateProfileVibe(editMood, editInterests);
      isEditingVibe = false;
    } catch (err: any) {
      console.error('Failed to update vibe:', err);
    }
  }

  // Signup Submit
  async function handleSignup() {
    authError = '';
    if (!pseudonym.trim()) {
      authError = 'Please enter an anonymous pseudonym';
      return;
    }
    if (signupPassphrase.length < 8) {
      authError = 'Passphrase must be at least 8 characters long';
      return;
    }
    if (signupPassphrase !== confirmPassphrase) {
      authError = 'Passphrases do not match';
      return;
    }

    try {
      isProcessing = true;
      await wackoState.signup(pseudonym, selectedMood, selectedInterests, signupPassphrase);
      activeTab = 'deck';
    } catch (err: any) {
      authError = err.message || 'Signup failed';
    } finally {
      isProcessing = false;
    }
  }

  // Login Submit (File Upload)
  async function handleLoginWithFile() {
    authError = '';
    if (!loginFile) {
      authError = 'Please select your .wacko identity file';
      return;
    }
    if (!loginPassphrase) {
      authError = 'Please enter your master passphrase';
      return;
    }

    try {
      isProcessing = true;
      const arrayBuffer = await loginFile.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      await wackoState.loginWithVaultFile(fileBuffer, loginPassphrase);
      activeTab = 'deck';
    } catch (err: any) {
      authError = err.message || 'Decryption failed: check your passphrase';
    } finally {
      isProcessing = false;
    }
  }

  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      loginFile = e.dataTransfer.files[0];
    }
  }

  // Send message in active chat
  async function handleSendMessage() {
    if (!chatInputText.trim() || !wackoState.activeConversationId) return;
    const text = chatInputText;
    chatInputText = '';
    try {
      await wackoState.sendChatMessage(wackoState.activeConversationId, text);
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
  }

  // Active chat details
  let activeChatContact = $derived.by(() => {
    if (!wackoState.vault || !wackoState.activeConversationId) return null;
    return wackoState.vault.matches.find((m) => m.id === wackoState.activeConversationId) || null;
  });

  let activeChatMessages = $derived.by(() => {
    if (!wackoState.vault || !wackoState.activeConversationId) return [];
    return wackoState.vault.messages.filter((m) => m.conversationId === wackoState.activeConversationId);
  });

  // Total unread count across all conversations
  let totalUnreadCount = $derived.by(() => {
    return Object.values(wackoState.unreadCounts).reduce((acc, curr) => acc + curr, 0);
  });

  // Pop out to full browser tab
  function popOutToTab() {
    try {
      const extChrome = (globalThis as any).chrome;
      if (extChrome?.tabs?.create) {
        extChrome.tabs.create({ url: extChrome.runtime.getURL('src/popup.html') });
      } else {
        window.open(window.location.href, '_blank');
      }
    } catch {
      window.open(window.location.href, '_blank');
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

<div class="w-full h-full min-h-[580px] max-h-[600px] flex flex-col justify-between selection:bg-[#C65D36] selection:text-[#FCFAF5] bg-[#F5F0E6] text-[#292925] overflow-hidden">
  <!-- TOP APP BAR -->
  <header class="shrink-0 border-b border-[#D8D0C4] bg-[#FCFAF5]/95 backdrop-blur-sm px-3.5 py-2.5 z-30">
    <div class="flex items-center justify-between">
      <!-- Brand & Protocol -->
      <div class="flex items-center gap-2.5">
        <div class="relative w-8 h-8 rounded-lg bg-[#C65D36] flex items-center justify-center overflow-hidden shadow-xs shrink-0">
          <svg class="w-5 h-5 text-[#FCFAF5]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <circle cx="12" cy="12" r="4" fill="#D5A62A"/>
          </svg>
        </div>

        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-base font-bold tracking-tight text-[#292925] font-display">WACKO</span>
            <span class="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-[#427C7A]/15 text-[#427C7A] border border-[#427C7A]/30">
              <span class="w-1.5 h-1.5 rounded-full bg-[#427C7A]"></span>
              BitSocial
            </span>
          </div>
        </div>
      </div>

      <!-- Right Header Actions -->
      {#if wackoState.isLoggedIn && wackoState.vault}
        <div class="flex items-center gap-1.5">
          <!-- Vibe Pill & Editor Trigger -->
          <button
            type="button"
            onclick={openVibeEditor}
            class="flex items-center gap-1 px-2 py-1 rounded-full bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-[11px] font-semibold text-[#292925] transition cursor-pointer"
            title="Tune your mood & vibe"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#C65D36] animate-pulse"></span>
            <span class="font-bold text-[#C65D36] capitalize max-w-[65px] truncate">{wackoState.vault.profile.mood || 'Curious'}</span>
            <span class="text-[9px] text-[#A69A89]">✏️</span>
          </button>

          <!-- Active Peers Badge -->
          <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5F0E6] border border-[#D8D0C4] text-[11px]">
            <span class="font-bold text-[#C65D36]">{wackoState.discoveredPeers.length}</span>
            <span class="text-[10px] text-[#A69A89]">online</span>
          </div>

          <!-- Pop Out Full Window -->
          <button
            type="button"
            onclick={popOutToTab}
            class="p-1.5 rounded-lg bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-[#43352C] transition cursor-pointer"
            title="Expand to full browser tab"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          <!-- Go Ghost / Logout -->
          <button
            type="button"
            onclick={() => wackoState.logout()}
            class="p-1.5 rounded-lg bg-[#C65D36]/10 hover:bg-[#C65D36]/20 border border-[#C65D36]/30 text-[#C65D36] transition cursor-pointer"
            title="Go Ghost (Instant Offline & Wipe Memory)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      {:else}
        <div class="flex items-center gap-1.5">
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#EFEAE1] border border-[#D8D0C4] text-[11px] text-[#A69A89]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#A69A89]"></span>
            <span>Ghost Mode</span>
          </div>

          <button
            type="button"
            onclick={popOutToTab}
            class="p-1.5 rounded-lg bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-[#43352C] transition cursor-pointer"
            title="Open in full browser tab"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </header>

  <!-- MAIN SCROLLABLE VIEWPORT -->
  <main class="flex-1 overflow-y-auto p-3.5 flex flex-col justify-start">
    {#if !wackoState.isLoggedIn}
      <!-- AUTHENTICATION CONTAINER -->
      <div class="w-full flex flex-col justify-start">
        <!-- Brand Intro Banner -->
        <div class="mb-3 text-center">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C65D36]/10 border border-[#C65D36]/25 text-[#C65D36] text-[10px] font-semibold mb-1.5">
            <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Decentralized Stranger Dating</span>
          </div>
          <h1 class="text-xl font-black tracking-tight text-[#292925] font-display">
            Mingle with Strangers. <span class="text-[#C65D36]">Zero Servers.</span>
          </h1>
          <p class="text-[11px] text-[#43352C] mt-0.5">
            Pure client-side cryptographic privacy powered by BitSocial P2P.
          </p>
        </div>

        <!-- Segmented Tab Switcher -->
        <div class="flex rounded-lg bg-[#EFEAE1] p-1 border border-[#D8D0C4] mb-3">
          {#if wackoState.savedVaultRecord}
            <button
              type="button"
              class="flex-1 py-1 text-xs font-semibold rounded-md transition cursor-pointer {authMode === 'saved' ? 'bg-[#292925] text-[#FCFAF5] shadow-xs' : 'text-[#43352C] hover:text-[#292925]'}"
              onclick={() => { authMode = 'saved'; authError = ''; }}
            >
              Saved ({wackoState.savedVaultRecord.pseudonymHint})
            </button>
          {/if}
          <button
            type="button"
            class="flex-1 py-1 text-xs font-semibold rounded-md transition cursor-pointer {authMode === 'signup' ? 'bg-[#292925] text-[#FCFAF5] shadow-xs' : 'text-[#43352C] hover:text-[#292925]'}"
            onclick={() => { authMode = 'signup'; authError = ''; }}
          >
            New Persona
          </button>
          <button
            type="button"
            class="flex-1 py-1 text-xs font-semibold rounded-md transition cursor-pointer {authMode === 'login' ? 'bg-[#292925] text-[#FCFAF5] shadow-xs' : 'text-[#43352C] hover:text-[#292925]'}"
            onclick={() => { authMode = 'login'; authError = ''; }}
          >
            Upload .wacko
          </button>
        </div>

        <!-- Auth Error Banner -->
        {#if authError}
          <div class="mb-3 p-2.5 rounded-lg bg-[#C65D36]/10 border border-[#C65D36]/30 text-[#C65D36] text-[11px] flex items-center gap-2">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            <span>{authError}</span>
          </div>
        {/if}

        <!-- TAB 1: SAVED IN BROWSER INDEXEDDB -->
        {#if authMode === 'saved' && wackoState.savedVaultRecord}
          <form onsubmit={(e) => { e.preventDefault(); handleLoginWithSaved(); }} class="space-y-3 bg-[#FCFAF5] p-3.5 rounded-xl border border-[#D8D0C4]">
            <div class="p-3 rounded-lg bg-[#F5F0E6] border border-[#D8D0C4] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-[#C65D36] flex items-center justify-center font-bold text-[#FCFAF5] text-sm font-display">
                  {wackoState.savedVaultRecord.pseudonymHint.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span class="text-[9px] text-[#A69A89] uppercase tracking-wider font-bold block">Cached Identity</span>
                  <span class="text-xs font-bold text-[#292925] block">{wackoState.savedVaultRecord.pseudonymHint}</span>
                  <span class="text-[10px] text-[#427C7A] font-mono">
                    #{wackoState.savedVaultRecord.fileHash.slice(0, 8)} • {(wackoState.savedVaultRecord.byteLength / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onclick={() => wackoState.clearBrowserStorage()}
                title="Remove from browser storage"
                class="text-[#A69A89] hover:text-[#C65D36] p-1.5 transition cursor-pointer rounded-md hover:bg-[#EFEAE1]"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div>
              <label for="ext-saved-passphrase" class="block text-[10px] font-bold text-[#43352C] uppercase tracking-wider mb-1">
                Master Passphrase
              </label>
              <input
                id="ext-saved-passphrase"
                type="password"
                placeholder="Enter passphrase to unlock"
                bind:value={savedPassphrase}
                class="w-full px-3 py-2 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              class="w-full py-2.5 rounded-lg font-bold text-xs bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {#if isProcessing}
                <div class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>Decrypting...</span>
              {:else}
                <span>Unlock & Join Mesh</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              {/if}
            </button>
          </form>

        <!-- TAB 2: SIGNUP NEW PERSONA (4-STEP WIZARD) -->
        {:else if authMode === 'signup'}
          <div class="bg-[#FCFAF5] p-3.5 rounded-xl border border-[#D8D0C4] space-y-3">
            <!-- Stepper indicators -->
            <div class="flex items-center justify-between relative px-2">
              <div class="absolute left-4 right-4 top-3.5 -translate-y-1/2 h-[2px] bg-[#D8D0C4] z-0"></div>
              <div
                class="absolute left-4 top-3.5 -translate-y-1/2 h-[2px] bg-[#C65D36] z-0 transition-all duration-300"
                style="width: {((signupStep - 1) / 3) * 100}%"
              ></div>

              {#each [1, 2, 3, 4] as step}
                <button
                  type="button"
                  onclick={() => goToStep(step as any)}
                  class="relative z-10 flex flex-col items-center cursor-pointer"
                >
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all {signupStep === step ? 'bg-[#C65D36] text-[#FCFAF5] ring-2 ring-[#C65D36]/20' : signupStep > step ? 'bg-[#74794B] text-[#FCFAF5]' : 'bg-[#FCFAF5] border border-[#D8D0C4] text-[#A69A89]'}">
                    {#if signupStep > step}✓{:else}{step}{/if}
                  </div>
                  <span class="text-[9px] font-bold mt-1 {signupStep === step ? 'text-[#C65D36]' : 'text-[#A69A89]'}">
                    {step === 1 ? 'Alias' : step === 2 ? 'Mood' : step === 3 ? 'Sparks' : 'Vault'}
                  </span>
                </button>
              {/each}
            </div>

            <!-- STEP 1: PSEUDONYM -->
            {#if signupStep === 1}
              <div class="space-y-3 pt-1">
                <div>
                  <label for="ext-pseudonym" class="block text-[10px] font-bold text-[#43352C] uppercase tracking-wider mb-1">
                    Anonymous Pseudonym / Moniker
                  </label>
                  <input
                    id="ext-pseudonym"
                    type="text"
                    placeholder="e.g., CyberFlaneur, NeonVelvet, RetroCosmonaut"
                    bind:value={pseudonym}
                    maxlength={24}
                    class="w-full px-3 py-2 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] placeholder-[#A69A89] focus:outline-none focus:border-[#C65D36] text-xs"
                    required
                  />
                  <span class="text-[10px] text-[#A69A89] mt-1 block">
                    Zero real names. Only this alias and your mood frequency are broadcast.
                  </span>
                </div>

                <button
                  type="button"
                  onclick={nextStep}
                  class="w-full py-2 rounded-lg font-bold text-xs bg-[#292925] hover:bg-[#43352C] text-[#FCFAF5] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Continue to Mood</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </button>
              </div>

            <!-- STEP 2: MOOD FREQUENCY -->
            {:else if signupStep === 2}
              <div class="space-y-2 pt-1">
                <span class="block text-[10px] font-bold text-[#43352C] uppercase tracking-wider">
                  Select Broadcast Mood
                </span>
                <div class="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                  {#each moodOptions as mood}
                    <button
                      type="button"
                      onclick={() => selectedMood = mood.label}
                      class="flex items-center justify-between p-2 rounded-lg border text-left transition cursor-pointer {selectedMood === mood.label ? 'border-[#C65D36] bg-[#C65D36]/10' : 'border-[#D8D0C4] bg-[#FCFAF5] hover:bg-[#F5F0E6]'}"
                    >
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: {mood.accent}"></span>
                        <div>
                          <span class="text-xs font-bold text-[#292925] block">{mood.label}</span>
                          <span class="text-[10px] text-[#A69A89]">{mood.desc}</span>
                        </div>
                      </div>
                      {#if selectedMood === mood.label}
                        <span class="text-xs font-bold text-[#C65D36]">✓</span>
                      {/if}
                    </button>
                  {/each}
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onclick={prevStep}
                    class="py-2 px-3 rounded-lg border border-[#D8D0C4] text-xs font-bold text-[#43352C] hover:bg-[#EFEAE1] transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onclick={nextStep}
                    class="flex-1 py-2 rounded-lg font-bold text-xs bg-[#292925] hover:bg-[#43352C] text-[#FCFAF5] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Continue to Sparks</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                </div>
              </div>

            <!-- STEP 3: SPARKS / INTERESTS -->
            {:else if signupStep === 3}
              <div class="space-y-2 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider">
                    Pick Up to 5 Sparks
                  </span>
                  <span class="text-[10px] text-[#A69A89]">
                    {selectedInterests.length}/5 selected
                  </span>
                </div>

                <div class="flex flex-wrap gap-1.5 max-h-[190px] overflow-y-auto pr-0.5">
                  {#each availableInterests as tag}
                    <button
                      type="button"
                      onclick={() => toggleInterest(tag)}
                      class="px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer {selectedInterests.includes(tag) ? 'bg-[#C65D36] text-[#FCFAF5] border-[#C65D36]' : 'bg-[#FCFAF5] text-[#43352C] border-[#D8D0C4] hover:border-[#C65D36]'}"
                    >
                      {tag}
                    </button>
                  {/each}
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onclick={prevStep}
                    class="py-2 px-3 rounded-lg border border-[#D8D0C4] text-xs font-bold text-[#43352C] hover:bg-[#EFEAE1] transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onclick={nextStep}
                    class="flex-1 py-2 rounded-lg font-bold text-xs bg-[#292925] hover:bg-[#43352C] text-[#FCFAF5] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Set Master Passphrase</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                </div>
              </div>

            <!-- STEP 4: MASTER PASSPHRASE -->
            {:else if signupStep === 4}
              <form onsubmit={(e) => { e.preventDefault(); handleSignup(); }} class="space-y-2.5 pt-1">
                <div>
                  <label for="ext-signup-pass" class="block text-[10px] font-bold text-[#43352C] uppercase tracking-wider mb-1">
                    Master Passphrase (PBKDF2 600k + AES-GCM)
                  </label>
                  <input
                    id="ext-signup-pass"
                    type="password"
                    placeholder="Min 8 characters"
                    bind:value={signupPassphrase}
                    class="w-full px-3 py-1.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] text-xs focus:outline-none focus:border-[#C65D36]"
                    required
                  />
                  <!-- Strength indicator bar -->
                  <div class="w-full bg-[#EFEAE1] h-1 rounded-full mt-1.5 overflow-hidden">
                    <div
                      class="h-full transition-all duration-300 {passphraseStrength <= 25 ? 'bg-[#C65D36]' : passphraseStrength <= 50 ? 'bg-[#D5A62A]' : passphraseStrength <= 75 ? 'bg-[#427C7A]' : 'bg-[#74794B]'}"
                      style="width: {passphraseStrength}%"
                    ></div>
                  </div>
                </div>

                <div>
                  <label for="ext-confirm-pass" class="block text-[10px] font-bold text-[#43352C] uppercase tracking-wider mb-1">
                    Confirm Passphrase
                  </label>
                  <input
                    id="ext-confirm-pass"
                    type="password"
                    placeholder="Repeat master passphrase"
                    bind:value={confirmPassphrase}
                    class="w-full px-3 py-1.5 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] text-xs focus:outline-none focus:border-[#C65D36]"
                    required
                  />
                </div>

                <div class="p-2 rounded-lg bg-[#F5F0E6] text-[10px] text-[#5A554C] leading-normal border border-[#D8D0C4]">
                  💡 Generates in-memory ECDH/ECDSA keys, compresses with Gzip, and downloads your portable <strong class="text-[#292925]">.wacko</strong> vault file.
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onclick={prevStep}
                    class="py-2 px-3 rounded-lg border border-[#D8D0C4] text-xs font-bold text-[#43352C] hover:bg-[#EFEAE1] transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    class="flex-1 py-2 rounded-lg font-bold text-xs bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {#if isProcessing}
                      <div class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span>Deriving AES Keys...</span>
                    {:else}
                      <span>Generate Vault & Connect</span>
                    {/if}
                  </button>
                </div>
              </form>
            {/if}
          </div>

        <!-- TAB 3: UPLOAD .WACKO VAULT FILE -->
        {:else if authMode === 'login'}
          <form onsubmit={(e) => { e.preventDefault(); handleLoginWithFile(); }} class="space-y-3 bg-[#FCFAF5] p-3.5 rounded-xl border border-[#D8D0C4]">
            <div
              role="region"
              aria-label="File Upload Zone"
              ondrop={handleFileDrop}
              ondragover={(e) => e.preventDefault()}
              class="border-2 border-dashed border-[#D8D0C4] hover:border-[#C65D36] rounded-xl p-4 text-center bg-[#F5F0E6]/50 transition cursor-pointer relative"
            >
              <input
                id="ext-file-input"
                type="file"
                accept=".wacko"
                onchange={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files && target.files[0]) {
                    loginFile = target.files[0];
                  }
                }}
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div class="flex flex-col items-center gap-1.5">
                <div class="w-8 h-8 rounded-full bg-[#C65D36]/15 text-[#C65D36] flex items-center justify-center text-sm font-bold">
                  📁
                </div>
                {#if loginFile}
                  <span class="text-xs font-bold text-[#292925] truncate max-w-[240px]">{loginFile.name}</span>
                  <span class="text-[10px] text-[#427C7A]">{(loginFile.size / 1024).toFixed(1)} KB ready</span>
                {:else}
                  <span class="text-xs font-semibold text-[#292925]">Drop .wacko identity file</span>
                  <span class="text-[10px] text-[#A69A89]">or click to browse</span>
                {/if}
              </div>
            </div>

            <div>
              <label for="ext-login-pass" class="block text-[10px] font-bold text-[#43352C] uppercase tracking-wider mb-1">
                Vault Passphrase
              </label>
              <input
                id="ext-login-pass"
                type="password"
                placeholder="Enter passphrase"
                bind:value={loginPassphrase}
                class="w-full px-3 py-2 rounded-lg bg-[#FCFAF5] border border-[#D8D0C4] text-[#292925] text-xs focus:outline-none focus:border-[#C65D36]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              class="w-full py-2.5 rounded-lg font-bold text-xs bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {#if isProcessing}
                <div class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>Verifying GCM Tag...</span>
              {:else}
                <span>Decrypt & Connect</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              {/if}
            </button>
          </form>
        {/if}
      </div>

    <!-- DASHBOARD VIEW WHEN LOGGED IN -->
    {:else}
      <!-- TAB 1: RADAR DECK (STRANGER DISCOVERY) -->
      {#if activeTab === 'deck'}
        <div class="space-y-3">
          <!-- Radar Header & Pulse -->
          <div class="p-3 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] flex items-center justify-between shadow-xs">
            <div class="flex items-center gap-2.5">
              <div class="relative w-7 h-7 flex items-center justify-center">
                <span class="absolute inset-0 rounded-full border border-[#C65D36] opacity-75 animate-ping"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-[#C65D36]"></span>
              </div>
              <div>
                <span class="text-xs font-bold text-[#292925] block">BitSocial Mesh Radar</span>
                <span class="text-[10px] text-[#A69A89]">Broadcasting signed presence &bull; TTL 45s</span>
              </div>
            </div>

            <button
              type="button"
              onclick={() => wackoState.recalculatePeerScores()}
              class="p-1.5 rounded-md hover:bg-[#EFEAE1] text-[#43352C] transition cursor-pointer text-xs"
              title="Refresh peer scores"
            >
              🔄
            </button>
          </div>

          <!-- Proof of Work Solving Indicator -->
          {#if wackoState.isSolvingPoW}
            <div class="p-2.5 rounded-xl bg-[#D5A62A]/15 border border-[#D5A62A]/40 text-[#43352C] text-xs flex items-center gap-2 animate-pulse">
              <div class="w-3.5 h-3.5 border-2 border-[#D5A62A] border-t-transparent rounded-full animate-spin shrink-0"></div>
              <span>Anti-Spam Shield: Solving Proof-of-Work challenge...</span>
            </div>
          {/if}

          <!-- DISCOVERED STRANGERS CARDS -->
          {#if wackoState.discoveredPeers.length > 0}
            <div class="space-y-2.5">
              {#each wackoState.discoveredPeers as peer (peer.peerId)}
                <div class="p-3 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] shadow-xs animate-card-settle space-y-2.5">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="w-9 h-9 rounded-lg bg-[#292925] text-[#FCFAF5] flex items-center justify-center font-bold text-sm font-display shrink-0">
                        {peer.pseudonym.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-bold text-[#292925]">{peer.pseudonym}</span>
                          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C65D36]/15 text-[#C65D36] border border-[#C65D36]/25">
                            {peer.mood}
                          </span>
                        </div>
                        <span class="text-[10px] text-[#A69A89] font-mono">
                          ID: {peer.peerId.slice(0, 10)}...
                        </span>
                      </div>
                    </div>

                    <!-- Synergy Score Pill -->
                    <div class="flex flex-col items-end">
                      <span class="text-xs font-extrabold text-[#74794B]">
                        {peer.compatibility.score}%
                      </span>
                      <span class="text-[9px] text-[#A69A89] uppercase font-bold tracking-wider">
                        Synergy
                      </span>
                    </div>
                  </div>

                  <!-- Mutual Interests Tags -->
                  <div class="flex flex-wrap gap-1">
                    {#each peer.interests as interest}
                      <span class="text-[10px] px-2 py-0.5 rounded-full border {wackoState.vault?.profile.interests.includes(interest) ? 'bg-[#C65D36]/10 text-[#C65D36] border-[#C65D36]/30 font-semibold' : 'bg-[#EFEAE1] text-[#43352C] border-[#D8D0C4]'}">
                        {wackoState.vault?.profile.interests.includes(interest) ? '★ ' : ''}{interest}
                      </span>
                    {/each}
                  </div>

                  <!-- Action Buttons: Pass & Like -->
                  <div class="flex items-center gap-2 pt-1 border-t border-[#D8D0C4]/60">
                    <button
                      type="button"
                      onclick={() => wackoState.passStranger(peer.peerId)}
                      class="flex-1 py-1.5 rounded-lg border border-[#D8D0C4] hover:bg-[#EFEAE1] text-xs font-bold text-[#43352C] transition cursor-pointer text-center"
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      disabled={wackoState.isSolvingPoW || wackoState.sentLikes.has(peer.peerId)}
                      onclick={() => wackoState.likeStranger(peer)}
                      class="flex-1 py-1.5 rounded-lg bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                    >
                      {#if wackoState.sentLikes.has(peer.peerId)}
                        <span>Liked ❤️</span>
                      {:else}
                        <span>Spark Interest</span>
                        <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      {/if}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- Empty state when scanning -->
            <div class="p-6 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] text-center space-y-3">
              <div class="relative w-16 h-16 mx-auto flex items-center justify-center">
                <span class="absolute inset-0 rounded-full border border-[#D5A62A] opacity-30 animate-radar-arc-1"></span>
                <span class="absolute inset-0 rounded-full border border-[#D5A62A] opacity-30 animate-radar-arc-2"></span>
                <span class="w-8 h-8 rounded-full bg-[#D5A62A]/20 flex items-center justify-center text-[#D5A62A]">
                  📡
                </span>
              </div>

              <div>
                <h3 class="text-xs font-bold text-[#292925] uppercase tracking-wider">Scanning Ephemeral Swarm</h3>
                <p class="text-[11px] text-[#A69A89] mt-1 leading-normal">
                  No strangers currently in your frequency. Open an incognito browser tab at <span class="font-mono text-[#43352C]">localhost:5173</span> to test local peer discovery!
                </p>
              </div>

              <button
                type="button"
                onclick={openVibeEditor}
                class="px-3 py-1.5 rounded-lg bg-[#EFEAE1] hover:bg-[#D8D0C4] text-xs font-semibold text-[#43352C] transition cursor-pointer"
              >
                Change Mood / Sparks
              </button>
            </div>
          {/if}
        </div>

      <!-- TAB 2: CHATS (E2EE DIRECT MESSAGING) -->
      {:else if activeTab === 'chats'}
        {#if wackoState.activeConversationId && activeChatContact}
          <!-- INDIVIDUAL CHAT ROOM -->
          <div class="h-full flex flex-col -m-3.5 p-3.5 bg-[#FCFAF5] space-y-2">
            <!-- Chat Room Header -->
            <div class="flex items-center justify-between pb-2 border-b border-[#D8D0C4]">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onclick={() => wackoState.selectConversation(null)}
                  class="p-1 rounded-md hover:bg-[#EFEAE1] text-[#43352C] transition cursor-pointer text-xs font-bold"
                >
                  ← Back
                </button>
                <div class="w-7 h-7 rounded-lg bg-[#C65D36] text-[#FCFAF5] flex items-center justify-center font-bold text-xs font-display">
                  {activeChatContact.pseudonym.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span class="text-xs font-bold text-[#292925] block leading-tight">{activeChatContact.pseudonym}</span>
                  <span class="text-[9px] text-[#427C7A] font-semibold">E2EE Secured (ECDH P-256)</span>
                </div>
              </div>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C65D36]/15 text-[#C65D36]">
                {activeChatContact.mood}
              </span>
            </div>

            <!-- Messages Stream -->
            <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px] max-h-[340px]">
              {#if activeChatMessages.length === 0}
                <div class="text-center py-8 text-[11px] text-[#A69A89]">
                  Whisper channel established.<br />Say hello to {activeChatContact.pseudonym}!
                </div>
              {:else}
                {#each activeChatMessages as msg (msg.id)}
                  <div class="flex flex-col {msg.senderId === wackoState.vault?.profile.id ? 'items-end' : 'items-start'}">
                    <div class="max-w-[80%] px-3 py-1.5 rounded-xl text-xs {msg.senderId === wackoState.vault?.profile.id ? 'bg-[#C65D36] text-[#FCFAF5] rounded-br-xs' : 'bg-[#EFEAE1] text-[#292925] rounded-bl-xs border border-[#D8D0C4]'}">
                      {msg.text}
                    </div>
                    <span class="text-[8px] text-[#A69A89] mt-0.5 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Message Input Form -->
            <form onsubmit={(e) => { e.preventDefault(); handleSendMessage(); }} class="flex items-center gap-1.5 pt-2 border-t border-[#D8D0C4]">
              <input
                type="text"
                placeholder="Whisper encrypted message..."
                bind:value={chatInputText}
                class="flex-1 px-3 py-1.5 rounded-lg bg-[#F5F0E6] border border-[#D8D0C4] text-[#292925] text-xs focus:outline-none focus:border-[#C65D36]"
              />
              <button
                type="submit"
                class="px-3 py-1.5 rounded-lg bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] text-xs font-bold transition cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        {:else}
          <!-- MATCHES / CONTACTS LIST -->
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider block">
              Mutual Spark Contacts ({wackoState.vault?.matches.length || 0})
            </span>

            {#if !wackoState.vault?.matches.length}
              <div class="p-6 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] text-center space-y-2">
                <span class="text-2xl block">💬</span>
                <h4 class="text-xs font-bold text-[#292925]">No Sparks Yet</h4>
                <p class="text-[11px] text-[#A69A89]">
                  Head over to the Radar Deck to discover strangers and spark mutual chemistry!
                </p>
                <button
                  type="button"
                  onclick={() => activeTab = 'deck'}
                  class="mt-1 px-3 py-1 rounded-lg bg-[#C65D36] text-[#FCFAF5] text-xs font-bold cursor-pointer"
                >
                  Explore Deck
                </button>
              </div>
            {:else}
              <div class="space-y-1.5">
                {#each wackoState.vault.matches as match (match.id)}
                  <button
                    type="button"
                    onclick={() => wackoState.selectConversation(match.id)}
                    class="w-full p-2.5 rounded-xl bg-[#FCFAF5] hover:bg-[#F5F0E6] border border-[#D8D0C4] text-left transition cursor-pointer flex items-center justify-between shadow-xs"
                  >
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg bg-[#292925] text-[#FCFAF5] flex items-center justify-center font-bold text-xs font-display shrink-0">
                        {match.pseudonym.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-bold text-[#292925]">{match.pseudonym}</span>
                          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#C65D36]/15 text-[#C65D36]">
                            {match.mood}
                          </span>
                        </div>
                        <span class="text-[10px] text-[#A69A89]">
                          Matched {new Date(match.matchedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {#if wackoState.unreadCounts[match.id]}
                      <span class="px-1.5 py-0.5 rounded-full bg-[#C65D36] text-[#FCFAF5] text-[10px] font-bold">
                        {wackoState.unreadCounts[match.id]}
                      </span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

      <!-- TAB 3: TRENDS (SWARM METRICS) -->
      {:else if activeTab === 'trends'}
        <div class="space-y-2.5">
          <div class="p-3 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] space-y-2">
            <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider block">
              BitSocial Swarm Health
            </span>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-2 rounded-lg bg-[#F5F0E6] border border-[#D8D0C4]">
                <span class="text-[9px] text-[#A69A89] uppercase font-bold block">P2P Status</span>
                <span class="font-bold text-[#74794B] capitalize">{wackoState.p2pStatus}</span>
              </div>
              <div class="p-2 rounded-lg bg-[#F5F0E6] border border-[#D8D0C4]">
                <span class="text-[9px] text-[#A69A89] uppercase font-bold block">Active Peers</span>
                <span class="font-bold text-[#C65D36]">{wackoState.discoveredPeers.length} discovered</span>
              </div>
              <div class="p-2 rounded-lg bg-[#F5F0E6] border border-[#D8D0C4]">
                <span class="text-[9px] text-[#A69A89] uppercase font-bold block">Encryption</span>
                <span class="font-bold text-[#427C7A]">ECDH P-256 + GCM</span>
              </div>
              <div class="p-2 rounded-lg bg-[#F5F0E6] border border-[#D8D0C4]">
                <span class="text-[9px] text-[#A69A89] uppercase font-bold block">Privacy</span>
                <span class="font-bold text-[#43352C]">Zero Server Storage</span>
              </div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] text-[11px] text-[#5A554C] space-y-1.5 leading-normal">
            <span class="font-bold text-[#292925] block text-xs">Decentralized Mesh Architecture</span>
            <p>
              Wacko uses decentralized pubsub topics over WebSockets and browser BroadcastChannel. When you close this extension, your node vanishes completely from the network (Ghost Mode).
            </p>
          </div>
        </div>

      <!-- TAB 4: VAULT (SECURITY & STORAGE) -->
      {:else if activeTab === 'vault'}
        <div class="space-y-2.5">
          <!-- Identity Summary -->
          <div class="p-3 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider">
                Cryptographic Identity
              </span>
              <span class="text-[9px] font-mono text-[#427C7A] bg-[#427C7A]/10 px-1.5 py-0.5 rounded">
                AES-256-GCM
              </span>
            </div>

            <div class="text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-[#A69A89]">Pseudonym:</span>
                <span class="font-bold text-[#292925]">{wackoState.vault?.profile.pseudonym}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#A69A89]">Fingerprint:</span>
                <span class="font-mono text-[10px] text-[#43352C] truncate max-w-[170px]">{wackoState.vault?.profile.id}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#A69A89]">PBKDF2 Iterations:</span>
                <span class="font-mono text-[10px] text-[#292925]">600,000 (SHA-256)</span>
              </div>
            </div>
          </div>

          <!-- Compression Telemetry -->
          {#if wackoState.lastPackedStats}
            <div class="p-3 rounded-xl bg-[#FCFAF5] border border-[#D8D0C4] space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider">Gzip Stream Savings</span>
                <span class="text-xs font-bold text-[#74794B]">{wackoState.lastPackedStats.savingsPercent}% saved</span>
              </div>
              <div class="flex justify-between text-[11px] text-[#A69A89]">
                <span>Uncompressed: {wackoState.lastPackedStats.uncompressedBytes} B</span>
                <span>Vault File: {wackoState.lastPackedStats.totalVaultBytes} B</span>
              </div>
            </div>
          {/if}

          <!-- Vault Actions -->
          <div class="space-y-1.5">
            <button
              type="button"
              onclick={() => wackoState.exportUpdatedVault()}
              class="w-full py-2 rounded-lg bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Export & Backup .wacko File</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </button>

            <button
              type="button"
              onclick={async () => {
                const removed = await wackoState.pruneHistory();
                alert(`Vault pruned! Cleaned ${removed} older messages.`);
              }}
              class="w-full py-2 rounded-lg border border-[#D8D0C4] hover:bg-[#FCFAF5] text-[#43352C] text-xs font-semibold transition cursor-pointer"
            >
              Prune Rolling Message Window
            </button>

            <button
              type="button"
              onclick={() => wackoState.logout()}
              class="w-full py-2 rounded-lg bg-[#C65D36]/10 hover:bg-[#C65D36]/20 border border-[#C65D36]/30 text-[#C65D36] text-xs font-bold transition cursor-pointer"
            >
              Go Ghost & Wipe Memory
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </main>

  <!-- BOTTOM NAVIGATION BAR (WHEN LOGGED IN) -->
  {#if wackoState.isLoggedIn}
    <nav class="shrink-0 border-t border-[#D8D0C4] bg-[#FCFAF5] px-2 py-1.5 flex items-center justify-around z-30">
      <button
        type="button"
        onclick={() => { activeTab = 'deck'; wackoState.selectConversation(null); }}
        class="flex flex-col items-center py-1 px-3 rounded-lg transition cursor-pointer {activeTab === 'deck' ? 'text-[#C65D36] font-bold' : 'text-[#A69A89] hover:text-[#43352C]'}"
      >
        <span class="text-base">🧭</span>
        <span class="text-[10px]">Radar</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'chats'; }}
        class="relative flex flex-col items-center py-1 px-3 rounded-lg transition cursor-pointer {activeTab === 'chats' ? 'text-[#C65D36] font-bold' : 'text-[#A69A89] hover:text-[#43352C]'}"
      >
        <span class="text-base">💬</span>
        <span class="text-[10px]">Chats</span>
        {#if totalUnreadCount > 0}
          <span class="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-[#C65D36] text-[#FCFAF5] text-[9px] flex items-center justify-center font-bold">
            {totalUnreadCount}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'trends'; wackoState.selectConversation(null); }}
        class="flex flex-col items-center py-1 px-3 rounded-lg transition cursor-pointer {activeTab === 'trends' ? 'text-[#C65D36] font-bold' : 'text-[#A69A89] hover:text-[#43352C]'}"
      >
        <span class="text-base">⚡️</span>
        <span class="text-[10px]">Swarm</span>
      </button>

      <button
        type="button"
        onclick={() => { activeTab = 'vault'; wackoState.selectConversation(null); }}
        class="flex flex-col items-center py-1 px-3 rounded-lg transition cursor-pointer {activeTab === 'vault' ? 'text-[#C65D36] font-bold' : 'text-[#A69A89] hover:text-[#43352C]'}"
      >
        <span class="text-base">🛡️</span>
        <span class="text-[10px]">Vault</span>
      </button>
    </nav>
  {/if}

  <!-- CELEBRATION MODAL ON MUTUAL MATCH -->
  {#if wackoState.newMatchCelebration}
    <div class="fixed inset-0 bg-[#292925]/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-card-settle">
      <div class="bg-[#FCFAF5] border-2 border-[#C65D36] rounded-2xl p-5 w-full max-w-[340px] text-center space-y-3.5 shadow-lg">
        <div class="w-12 h-12 mx-auto rounded-full bg-[#C65D36] text-[#FCFAF5] flex items-center justify-center text-2xl animate-heart-pop">
          ❤️
        </div>

        <div>
          <h2 class="text-base font-extrabold text-[#292925] font-display">Mutual Spark Detected!</h2>
          <p class="text-xs text-[#43352C] mt-1">
            You and <strong class="text-[#C65D36]">{wackoState.newMatchCelebration.pseudonym}</strong> liked each other.
          </p>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <button
            type="button"
            onclick={() => wackoState.dismissCelebration()}
            class="flex-1 py-2 rounded-lg border border-[#D8D0C4] text-xs font-semibold text-[#43352C] hover:bg-[#EFEAE1] transition cursor-pointer"
          >
            Keep Swiping
          </button>
          <button
            type="button"
            onclick={() => {
              wackoState.openCelebrationChat();
              activeTab = 'chats';
            }}
            class="flex-1 py-2 rounded-lg bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] text-xs font-bold transition cursor-pointer"
          >
            Whisper Chat
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- VIBE & SPARKS TUNING MODAL -->
  {#if isEditingVibe}
    <div class="fixed inset-0 bg-[#292925]/75 backdrop-blur-xs flex items-center justify-center p-3.5 z-50">
      <div class="bg-[#FCFAF5] border border-[#D8D0C4] rounded-2xl p-4 w-full max-w-[380px] space-y-3 max-h-[520px] overflow-y-auto">
        <div class="flex items-center justify-between pb-2 border-b border-[#D8D0C4]">
          <h3 class="text-xs font-bold text-[#292925] uppercase tracking-wider">Tune Broadcast Frequency</h3>
          <button
            type="button"
            onclick={() => isEditingVibe = false}
            class="text-[#A69A89] hover:text-[#292925] text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Mood selection -->
        <div class="space-y-1.5">
          <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider block">Mood</span>
          <div class="grid grid-cols-1 gap-1">
            {#each moodOptions as mood}
              <button
                type="button"
                onclick={() => editMood = mood.label}
                class="flex items-center justify-between p-1.5 rounded-lg border text-left transition cursor-pointer {editMood === mood.label ? 'border-[#C65D36] bg-[#C65D36]/10' : 'border-[#D8D0C4] bg-[#FCFAF5] hover:bg-[#F5F0E6]'}"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" style="background-color: {mood.accent}"></span>
                  <span class="text-xs font-bold text-[#292925]">{mood.label}</span>
                </div>
                {#if editMood === mood.label}
                  <span class="text-xs font-bold text-[#C65D36]">✓</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Sparks selection -->
        <div class="space-y-1.5">
          <span class="text-[10px] font-bold text-[#43352C] uppercase tracking-wider block">Sparks ({editInterests.length}/5)</span>
          <div class="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-0.5">
            {#each availableInterests as tag}
              <button
                type="button"
                onclick={() => toggleEditInterest(tag)}
                class="px-2 py-0.5 rounded-full text-[10px] font-medium border transition cursor-pointer {editInterests.includes(tag) ? 'bg-[#C65D36] text-[#FCFAF5] border-[#C65D36]' : 'bg-[#FCFAF5] text-[#43352C] border-[#D8D0C4]'}"
              >
                {tag}
              </button>
            {/each}
          </div>
        </div>

        <button
          type="button"
          onclick={handleSaveVibe}
          class="w-full py-2 rounded-lg bg-[#C65D36] hover:bg-[#B5522E] text-[#FCFAF5] text-xs font-bold transition cursor-pointer"
        >
          Save & Broadcast Updated Vibe
        </button>
      </div>
    </div>
  {/if}
</div>
