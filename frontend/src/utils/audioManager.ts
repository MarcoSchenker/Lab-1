// Audio Manager for the Truco game
// Handles sound effects, voice announcements, and background music

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  musicVolume: number;
  isMuted: boolean;
}

export type SoundEffect = 
  | 'card_deal'
  | 'card_play'
  | 'card_win'
  | 'card_flip'
  | 'button_click'
  | 'truco_call'
  | 'envido_call'
  | 'victory'
  | 'defeat'
  | 'round_win'
  | 'notification'
  | 'coin_drop'
  | 'applause';

export type VoiceAnnouncement = 
  | 'truco'
  | 'envido'
  | 'real_envido'
  | 'falta_envido'
  | 'quiero'
  | 'no_quiero'
  | 'retruco'
  | 'vale_cuatro'
  | 'mazo'
  | 'son_buenas'
  | 'son_mejores'
  | 'primera'
  | 'parda'
  | 'tu_turno'
  | 'ronda_ganada'
  | 'partida_ganada';

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private soundEffects: Map<SoundEffect, AudioBuffer> = new Map();
  private voiceAnnouncements: Map<VoiceAnnouncement, AudioBuffer> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    voiceVolume: 0.9,
    musicVolume: 0.3,
    isMuted: false
  };
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load settings from localStorage
      this.loadSettings();
      
      // Preload essential sounds
      await this.preloadEssentialSounds();
      
      this.isInitialized = true;
      console.log('🎵 Audio Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Audio Manager:', error);
    }
  }

  private async preloadEssentialSounds(): Promise<void> {
    const essentialSounds: SoundEffect[] = [
      'card_deal',
      'card_play',
      'button_click',
      'truco_call',
      'envido_call'
    ];

    const loadPromises = essentialSounds.map(async (sound) => {
      try {
        const buffer = await this.loadAudioBuffer(`/sounds/sfx/${sound}.ogg`);
        this.soundEffects.set(sound, buffer);
      } catch (error) {
        console.warn(`Failed to load sound effect: ${sound}`, error);
        // Create a silent buffer as fallback
        this.soundEffects.set(sound, this.createSilentBuffer());
      }
    });

    await Promise.all(loadPromises);
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  private createSilentBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
    return buffer;
  }

  public async playSoundEffect(sound: SoundEffect, volume: number = 1): Promise<void> {
    if (!this.isInitialized || this.settings.isMuted || !this.audioContext) return;

    try {
      let buffer = this.soundEffects.get(sound);
      
      // Load on demand if not preloaded
      if (!buffer) {
        try {
          buffer = await this.loadAudioBuffer(`/sounds/sfx/${sound}.ogg`);
          this.soundEffects.set(sound, buffer);
        } catch (error) {
          console.warn(`Failed to load sound effect: ${sound}`, error);
          return;
        }
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      
      // Calculate final volume
      const finalVolume = volume * this.settings.sfxVolume * this.settings.masterVolume;
      gainNode.gain.value = Math.max(0, Math.min(1, finalVolume));

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      console.error(`Failed to play sound effect: ${sound}`, error);
    }
  }

  public async playVoiceAnnouncement(voice: VoiceAnnouncement, volume: number = 1): Promise<void> {
    if (!this.isInitialized || this.settings.isMuted || !this.audioContext) return;

    try {
      let buffer = this.voiceAnnouncements.get(voice);
      
      // Load on demand if not preloaded
      if (!buffer) {
        try {
          buffer = await this.loadAudioBuffer(`/sounds/voice/${voice}.ogg`);
          this.voiceAnnouncements.set(voice, buffer);
        } catch (error) {
          console.warn(`Failed to load voice announcement: ${voice}`, error);
          return;
        }
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      
      // Calculate final volume
      const finalVolume = volume * this.settings.voiceVolume * this.settings.masterVolume;
      gainNode.gain.value = Math.max(0, Math.min(1, finalVolume));

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      console.error(`Failed to play voice announcement: ${voice}`, error);
    }
  }

  public playBackgroundMusic(track: string = 'background.ogg'): void {
    if (this.settings.isMuted) return;

    try {
      if (this.backgroundMusic) {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
      }

      this.backgroundMusic = new Audio(`/sounds/music/${track}`);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.settings.musicVolume * this.settings.masterVolume;
      
      const playPromise = this.backgroundMusic.play();
      if (playPromise) {
        playPromise.catch(error => {
          console.warn('Failed to play background music:', error);
        });
      }
    } catch (error) {
      console.error('Failed to initialize background music:', error);
    }
  }

  public stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  public updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Update background music volume if playing
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.settings.musicVolume * this.settings.masterVolume;
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('truco_audio_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('truco_audio_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
    }
  }

  public mute(): void {
    this.settings.isMuted = true;
    this.saveSettings();
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = 0;
    }
  }

  public unmute(): void {
    this.settings.isMuted = false;
    this.saveSettings();
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.settings.musicVolume * this.settings.masterVolume;
    }
  }

  public toggle(): void {
    if (this.settings.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  // Sequence methods for complex audio scenarios
  public async playCardSequence(cards: number, delay: number = 100): Promise<void> {
    for (let i = 0; i < cards; i++) {
      await this.playSoundEffect('card_deal');
      if (i < cards - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public async playWinSequence(): Promise<void> {
    await this.playSoundEffect('card_win');
    await new Promise(resolve => setTimeout(resolve, 300));
    await this.playSoundEffect('applause');
  }

  public async playTrucoSequence(call: VoiceAnnouncement): Promise<void> {
    await this.playSoundEffect('truco_call');
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.playVoiceAnnouncement(call);
  }

  public async playEnvidoSequence(call: VoiceAnnouncement): Promise<void> {
    await this.playSoundEffect('envido_call');
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.playVoiceAnnouncement(call);
  }

  // Resume audio context for mobile browsers
  public resumeContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const audioManager = AudioManager.getInstance();
