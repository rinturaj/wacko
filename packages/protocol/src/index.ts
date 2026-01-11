import { EncryptedMessage } from '@wacko/core';

export class RelayClient {
  constructor(public relayUrl: string) {}

  async send(message: EncryptedMessage): Promise<void> {
    console.log('Sending message to relay:', message);
    // TODO: Implement WebSocket or HTTP push
  }

  subscribe(userId: string, callback: (msg: EncryptedMessage) => void) {
    console.log('Subscribing to messages for:', userId);
    // TODO: Implement subscription
  }
}
