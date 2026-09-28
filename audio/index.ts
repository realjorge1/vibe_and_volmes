// Phase 2 audio engine — single import surface.
// Modular by concern: recording / playback / waveform / scoring / metadata /
// export. Nothing here touches the simulation; systems/songs is the bridge.

export * from './recording/recorder';
export * from './playback/audioPlayer';
export * from './playback/layeredPlayback';
export * from './waveform/waveform';
export * from './scoring/scoreEngine';
export * from './metadata/songMetadata';
export * from './export/exporter';
