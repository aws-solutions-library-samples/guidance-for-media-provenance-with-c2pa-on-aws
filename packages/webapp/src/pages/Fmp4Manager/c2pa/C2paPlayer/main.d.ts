/**
 * C2PA Player TypeScript declarations
 */

export class C2PAPlayer {
  constructor(videoJsPlayer: any, videoElement: HTMLElement);
  
  initialize(): void;
  playbackUpdate(status: any): void;
  updateUI(): void;
  dispose(): void;
}
