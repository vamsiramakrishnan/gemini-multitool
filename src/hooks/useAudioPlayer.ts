import { useCallback, useRef } from 'react';

export const useAudioPlayer = () => {
  const audioElements = useRef<HTMLAudioElement[]>([]);

  const playAudio = useCallback((url: string) => {
    const audio = new Audio(url);
    audioElements.current.push(audio);
    
    audio.addEventListener('ended', () => {
      const index = audioElements.current.indexOf(audio);
      if (index > -1) {
        audioElements.current.splice(index, 1);
      }
    });

    return audio.play();
  }, []);

  const stopAllAudio = useCallback(() => {
    audioElements.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioElements.current = [];
  }, []);

  return {
    playAudio,
    stopAllAudio,
  };
}; 