import React, { useState, useEffect } from 'react';
import { audioManager, AudioSettings } from '../utils/audioManager';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AudioSettingsComponent: React.FC<AudioSettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(audioManager.getSettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(audioManager.getSettings());
    }
  }, [isOpen]);

  const handleSettingChange = (key: keyof AudioSettings, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    audioManager.updateSettings(newSettings);
  };

  const testSound = async (type: 'sfx' | 'voice' | 'music') => {
    switch (type) {
      case 'sfx':
        await audioManager.playSoundEffect('card_play');
        break;
      case 'voice':
        await audioManager.playVoiceAnnouncement('truco');
        break;
      case 'music':
        audioManager.playBackgroundMusic();
        setTimeout(() => audioManager.stopBackgroundMusic(), 3000);
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-stone-800 rounded-lg p-6 w-full max-w-md mx-4 text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-yellow-300">Configuración de Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Master Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Volumen General</label>
              <span className="text-sm text-gray-300">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.masterVolume}
              onChange={(e) => handleSettingChange('masterVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Sound Effects Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Efectos de Sonido</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">{Math.round(settings.sfxVolume * 100)}%</span>
                <button
                  onClick={() => testSound('sfx')}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Test
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.sfxVolume}
              onChange={(e) => handleSettingChange('sfxVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Voice Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Anuncios de Voz</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">{Math.round(settings.voiceVolume * 100)}%</span>
                <button
                  onClick={() => testSound('voice')}
                  className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                >
                  Test
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.voiceVolume}
              onChange={(e) => handleSettingChange('voiceVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Música de Fondo</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">{Math.round(settings.musicVolume * 100)}%</span>
                <button
                  onClick={() => testSound('music')}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                >
                  Test
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.musicVolume}
              onChange={(e) => handleSettingChange('musicVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Mute Toggle */}
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Silenciar Todo</label>
            <button
              onClick={() => handleSettingChange('isMuted', !settings.isMuted)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.isMuted ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.isMuted ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              const defaultSettings = {
                masterVolume: 0.7,
                sfxVolume: 0.8,
                voiceVolume: 0.9,
                musicVolume: 0.3,
                isMuted: false
              };
              setSettings(defaultSettings);
              audioManager.updateSettings(defaultSettings);
            }}
            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded"
          >
            Restablecer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-black font-medium rounded"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioSettingsComponent;
