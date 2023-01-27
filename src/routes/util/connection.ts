import { writable } from 'svelte/store';

export const peer = writable();
export const targetPid = writable();
export const conn  = writable();
