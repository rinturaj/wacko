import { Peer } from 'peerjs';
import { writable } from 'svelte/store';

export const peer = new Peer();

export const pid = writable();

export let targetPid = '';

export let conn = peer.connect(null);



export function connect(id:string) {
    targetPid = id
    conn = peer.connect(id);
	conn.on('open', function () {
    // Receive messages
    console.log("oppend");
    
    conn.on('data', function (data) {
        console.log('Received', data);
    });

    // Send messages
    conn.send('Hello!');
});
}
