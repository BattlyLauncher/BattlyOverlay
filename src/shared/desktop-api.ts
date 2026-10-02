import type {
  WorldsAction,
  WorldsSnapshot,
  WorldsEvent,
  WorldsPublicRoom,
  WorldsVoiceCommand,
} from './social/battly-worlds-contract';
/** Host bridge only. Network access and account credentials belong to the embedding app. */
export interface BattlyDesktopApi {
  getWorldsSnapshot(): Promise<WorldsSnapshot>;
  worldsAction(action: WorldsAction): Promise<WorldsSnapshot>;
  getWorldsPublicRooms(page: number): Promise<WorldsPublicRoom[]>;
  worldsVoiceCommand(command: WorldsVoiceCommand): Promise<void>;
  worldsVoiceParty(action: 'room' | 'join' | 'create', value?: string | string[]): Promise<void>;
  onWorldsEvent(listener: (event: WorldsEvent) => void): () => void;
}
