import soundManager from './soundManager';
import notificationSound from './notificationSound';

/**
 * Utility function to stop all sounds playing in the application
 * This ensures no lingering sounds continue playing when switching contexts
 */
const stopAllSounds = () => {
  // Dừng âm thanh từ soundManager
  if (soundManager && typeof soundManager.stop === 'function') {
    try {
      soundManager.stop('ringtone');
    } catch (err) {
      console.error('Lỗi khi dừng ringtone từ soundManager:', err);
    }
  }

  // Dừng âm thanh từ notificationSound nếu có
  if (notificationSound && typeof notificationSound.stop === 'function') {
    try {
      notificationSound.stop();
      console.log('Đã dừng âm thanh từ notificationSound');
    } catch (err) {
      console.error('Lỗi khi dừng âm thanh từ notificationSound:', err);
    }
  }

  // Dừng tất cả các audio elements đang phát
  try {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        console.log('Đã dừng audio element');
      }
    });
  } catch (err) {
    console.error('Lỗi khi dừng các audio elements:', err);
  }
  
  // Xóa bỏ interval phát lại ringtone nếu có
  try {
    if (window.currentRingInterval) {
      clearInterval(window.currentRingInterval);
      window.currentRingInterval = null;
      console.log('Đã xóa interval phát lại ringtone');
    }
  } catch (err) {
    console.error('Lỗi khi xóa interval phát lại ringtone:', err);
  }
    // Xóa tất cả các event listener phát âm thanh
  try {
    if (window.currentPlayOnClickHandler) {
      document.removeEventListener('click', window.currentPlayOnClickHandler);
      window.currentPlayOnClickHandler = null;
      console.log('Đã xóa event listener phát âm thanh cụ thể');
    }
  } catch (err) {
    console.error('Lỗi khi xóa event listener phát âm thanh:', err);
  }
};

export default stopAllSounds;
