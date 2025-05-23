import { useState, useEffect, useCallback } from 'react';

export default function useAudioStream() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hàm yêu cầu quyền truy cập microphone
  const getAudioStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      setStream(mediaStream);
      return mediaStream;
    } catch (err) {
      console.error('Lỗi khi truy cập microphone:', err);
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hàm dừng stream khi không cần thiết
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  // Tự động dọn dẹp khi component unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    stream,
    error,
    isLoading,
    getAudioStream,
    stopStream
  };
}