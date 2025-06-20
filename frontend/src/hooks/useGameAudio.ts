import { useEffect, useCallback } from 'react';
import { audioManager, SoundEffect, VoiceAnnouncement } from '../utils/audioManager';

export const useGameAudio = () => {
  useEffect(() => {
    // Initialize audio manager on first use
    audioManager.initialize();

    // Handle user interaction to resume audio context (required for mobile browsers)
    const handleUserInteraction = () => {
      audioManager.resumeContext();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  const playCardDeal = useCallback(() => {
    audioManager.playSoundEffect('card_deal');
  }, []);

  const playCardPlay = useCallback(() => {
    audioManager.playSoundEffect('card_play');
  }, []);

  const playCardWin = useCallback(() => {
    audioManager.playSoundEffect('card_win');
  }, []);

  const playButtonClick = useCallback(() => {
    audioManager.playSoundEffect('button_click');
  }, []);

  const playTruco = useCallback(async () => {
    await audioManager.playTrucoSequence('truco');
  }, []);

  const playEnvido = useCallback(async () => {
    await audioManager.playEnvidoSequence('envido');
  }, []);

  const playRealEnvido = useCallback(async () => {
    await audioManager.playEnvidoSequence('real_envido');
  }, []);

  const playFaltaEnvido = useCallback(async () => {
    await audioManager.playEnvidoSequence('falta_envido');
  }, []);

  const playQuiero = useCallback(async () => {
    await audioManager.playVoiceAnnouncement('quiero');
  }, []);

  const playNoQuiero = useCallback(async () => {
    await audioManager.playVoiceAnnouncement('no_quiero');
  }, []);

  const playRetruco = useCallback(async () => {
    await audioManager.playTrucoSequence('retruco');
  }, []);

  const playValeCuatro = useCallback(async () => {
    await audioManager.playTrucoSequence('vale_cuatro');
  }, []);

  const playMazo = useCallback(async () => {
    await audioManager.playVoiceAnnouncement('mazo');
  }, []);

  const playVictory = useCallback(async () => {
    await audioManager.playWinSequence();
    await audioManager.playVoiceAnnouncement('partida_ganada');
  }, []);

  const playDefeat = useCallback(async () => {
    await audioManager.playSoundEffect('defeat');
  }, []);

  const playRoundWin = useCallback(async () => {
    await audioManager.playSoundEffect('round_win');
    await audioManager.playVoiceAnnouncement('ronda_ganada');
  }, []);

  const playTurnIndicator = useCallback(async () => {
    await audioManager.playSoundEffect('notification');
    await audioManager.playVoiceAnnouncement('tu_turno');
  }, []);

  const playCardDealSequence = useCallback(async (cardCount: number) => {
    await audioManager.playCardSequence(cardCount, 150);
  }, []);

  const playCustomSound = useCallback((sound: SoundEffect, volume?: number) => {
    audioManager.playSoundEffect(sound, volume);
  }, []);

  const playCustomVoice = useCallback((voice: VoiceAnnouncement, volume?: number) => {
    audioManager.playVoiceAnnouncement(voice, volume);
  }, []);

  const startBackgroundMusic = useCallback(() => {
    audioManager.playBackgroundMusic();
  }, []);

  const stopBackgroundMusic = useCallback(() => {
    audioManager.stopBackgroundMusic();
  }, []);

  const toggleMute = useCallback(() => {
    audioManager.toggle();
  }, []);

  const getAudioSettings = useCallback(() => {
    return audioManager.getSettings();
  }, []);

  // Game-specific sound combinations
  const playCantoResponse = useCallback(async (canto: string, response: 'quiero' | 'no_quiero') => {
    if (response === 'quiero') {
      await playQuiero();
    } else {
      await playNoQuiero();
    }
  }, [playQuiero, playNoQuiero]);

  const playCantoByType = useCallback(async (cantoType: string) => {
    switch (cantoType.toLowerCase()) {
      case 'truco':
        await playTruco();
        break;
      case 'envido':
        await playEnvido();
        break;
      case 'real envido':
      case 'realenvido':
        await playRealEnvido();
        break;
      case 'falta envido':
      case 'faltaenvido':
        await playFaltaEnvido();
        break;
      case 'retruco':
        await playRetruco();
        break;
      case 'vale cuatro':
      case 'valecuatro':
        await playValeCuatro();
        break;
      case 'mazo':
        await playMazo();
        break;
      default:
        await audioManager.playSoundEffect('notification');
    }
  }, [playTruco, playEnvido, playRealEnvido, playFaltaEnvido, playRetruco, playValeCuatro, playMazo]);

  return {
    // Basic sounds
    playCardDeal,
    playCardPlay,
    playCardWin,
    playButtonClick,
    
    // Voice announcements
    playTruco,
    playEnvido,
    playRealEnvido,
    playFaltaEnvido,
    playQuiero,
    playNoQuiero,
    playRetruco,
    playValeCuatro,
    playMazo,
    
    // Game states
    playVictory,
    playDefeat,
    playRoundWin,
    playTurnIndicator,
    
    // Sequences
    playCardDealSequence,
    playCantoResponse,
    playCantoByType,
    
    // Advanced
    playCustomSound,
    playCustomVoice,
    
    // Music
    startBackgroundMusic,
    stopBackgroundMusic,
    
    // Settings
    toggleMute,
    getAudioSettings
  };
};
