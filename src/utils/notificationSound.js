/**
 * Utility để quản lý âm thanh thông báo trong ứng dụng
 */

// Khoảng thời gian tối thiểu (mili giây) giữa các âm thanh thông báo
const NOTIFICATION_COOLDOWN = 2000;

// Lưu trữ ID của tin nhắn gần đây đã gửi để tránh thông báo
const recentlySentMessages = new Set();
// Thời gian tối đa để lưu tin nhắn (mili giây)
const MAX_MESSAGE_CACHE_TIME = 20000; // 20 giây

// Object để lưu thời gian hết hạn của mỗi tin nhắn
const messageExpirations = {};// Xóa tin nhắn cũ khỏi cache
function cleanupOldMessages() {
  const now = Date.now();
  
  // Lọc qua các tin nhắn đã hết hạn
  Object.keys(messageExpirations).forEach(messageId => {
    if (messageExpirations[messageId] < now) {
      recentlySentMessages.delete(messageId);
      delete messageExpirations[messageId];
      console.log('Đã xóa tin nhắn hết hạn khỏi cache:', messageId);
    }
  });
  
  // Giới hạn kích thước cache nếu quá lớn
  if (recentlySentMessages.size > 100) {
    console.log('Cache quá lớn, đang làm sạch...');
    resetMessageCache();
  }
  
  // Lập lịch kiểm tra tiếp theo
  setTimeout(cleanupOldMessages, 10000);
}

// Reset bộ nhớ cache tin nhắn
function resetMessageCache() {
  recentlySentMessages.clear();
  Object.keys(messageExpirations).forEach(key => {
    delete messageExpirations[key];
  });
}

// Bắt đầu quá trình dọn dẹp
setTimeout(cleanupOldMessages, 10000);

class NotificationSoundManager {  constructor() {
    this.audio = new Audio('/notification.mp3');
    this.lastPlayed = 0;
    this.isPlaying = false;
    this.enabled = true; // Mặc định bật âm thanh
    this._currentUserId = null; // Lưu ID người dùng hiện tại
    
    // Khôi phục trạng thái bật/tắt từ localStorage nếu có
    try {
      const savedState = localStorage.getItem('notificationSoundEnabled');
      if (savedState !== null) {
        this.enabled = savedState === 'true';
      }
      
      // Cũng lấy ID người dùng từ localStorage nếu có
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          if (userData && userData._id) {
            this._currentUserId = userData._id;
            console.log('Đã lấy ID người dùng từ localStorage:', this._currentUserId);
          }
        } catch (parseError) {
          console.error('Lỗi khi parse thông tin người dùng:', parseError);
        }
      }
    } catch (e) {
      console.error('Không thể đọc dữ liệu từ localStorage:', e);
    }
  }
  
  /**
   * Cập nhật ID người dùng hiện tại để kiểm tra tin nhắn
   * @param {string} userId - ID của người dùng hiện tại
   */
  setCurrentUser(userId) {
    if (userId) {
      this._currentUserId = userId;
    }
  }
  
  /**
   * Bật hoặc tắt âm thanh thông báo
   * @param {boolean} enabled - true để bật, false để tắt
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    // Lưu trạng thái vào localStorage
    try {
      localStorage.setItem('notificationSoundEnabled', enabled.toString());
    } catch (e) {
      console.error('Không thể lưu trạng thái âm thanh vào localStorage:', e);
    }
    
    return this.enabled;
  }
  
  /**
   * Kiểm tra xem âm thanh thông báo có được bật không
   * @returns {boolean} - true nếu được bật, false nếu bị tắt
   */  isEnabled() {
    return this.enabled;
  }
  
  /**
   * Kiểm tra xem một người gửi có phải là người dùng hiện tại không
   * @param {string} senderId - ID của người gửi tin nhắn
   * @returns {boolean} - true nếu người gửi là người dùng hiện tại
   */
  isCurrentUser(senderId) {
    if (!senderId || !this._currentUserId) {
      return false;
    }
    
    // So sánh cả dạng string và object
    const isMatch = String(senderId) === String(this._currentUserId) || 
                    (typeof senderId === 'object' && senderId._id && 
                     String(senderId._id) === String(this._currentUserId));
    
    if (isMatch) {
      console.log(`Xác định người gửi ${senderId} là người dùng hiện tại ${this._currentUserId}`);
    }
    
    return isMatch;
  }
    
    /**
   * Reset bộ nhớ cache tin nhắn trong trường hợp có vấn đề
   * @param {string} userId - ID người dùng hiện tại (tùy chọn)
   */
  resetCache(userId = null) {
    console.log('Yêu cầu reset cache tin nhắn từ bên ngoài');
    
    // Cập nhật ID người dùng nếu được cung cấp
    if (userId) {
      this._currentUserId = userId;
      console.log('Đã cập nhật ID người dùng khi reset cache:', userId);
    }
    
    resetMessageCache();
    return true;
  }
    /**
   * Đánh dấu một tin nhắn vừa được gửi để không phát âm thanh thông báo
   * @param {string} messageId - ID của tin nhắn vừa gửi
   */  markMessageAsSent(messageId) {
    if (!messageId) {
      console.log('Không thể đánh dấu tin nhắn vì thiếu messageId');
      return;
    }
    
    // Xử lý nhiều định dạng ID
    const idToMark = typeof messageId === 'object' && messageId._id ? messageId._id : messageId;
    const strId = String(idToMark);
    
    console.log('Đánh dấu tin nhắn đã gửi:', idToMark);
    
    // Thêm tin nhắn vào danh sách đã gửi (cả dưới dạng gốc và string)
    recentlySentMessages.add(idToMark);
    if (idToMark !== strId) {
      recentlySentMessages.add(strId);
    }
    
    // Thiết lập thời gian hết hạn cho tin nhắn này
    const expirationTime = Date.now() + MAX_MESSAGE_CACHE_TIME;
    messageExpirations[idToMark] = expirationTime;
    
    console.log(`Tin nhắn ${idToMark} sẽ hết hạn sau: ${new Date(expirationTime).toLocaleTimeString()}`);
    console.log('Danh sách tin nhắn hiện tại:', Array.from(recentlySentMessages));
  }
    /**
   * Kiểm tra xem một tin nhắn có phải do người dùng hiện tại vừa gửi không
   * @param {string} messageId - ID của tin nhắn cần kiểm tra
   * @returns {boolean} - true nếu tin nhắn vừa được gửi bởi người dùng
   */  isRecentlySentMessage(messageId) {
    if (!messageId) {
      console.log('Không thể kiểm tra tin nhắn vì thiếu messageId');
      return false;
    }
    
    // Kiểm tra xem id có ở dạng object._id không
    const idToCheck = typeof messageId === 'object' && messageId._id ? messageId._id : messageId;
    
    // Kiểm tra id trong định dạng string
    const strId = String(idToCheck);
    const result = recentlySentMessages.has(idToCheck) || recentlySentMessages.has(strId);
    
    if (result) {
      console.log(`Tin nhắn ${idToCheck} được nhận diện là do mình gửi, không phát âm thanh`);
      
      // Hiển thị thời gian còn lại trong cache
      const expirationKey = messageExpirations[idToCheck] ? idToCheck : strId;
      if (messageExpirations[expirationKey]) {
        const timeLeft = messageExpirations[expirationKey] - Date.now();
        console.log(`Tin nhắn ${idToCheck} còn ${Math.round(timeLeft/1000)}s trong cache`);
      }
    } else {
      console.log(`Tin nhắn ${idToCheck} không có trong danh sách các tin nhắn vừa gửi`);
      console.log('Danh sách các ID tin nhắn hiện có:', Array.from(recentlySentMessages));
    }
    return result;
  }

  /**
   * Phát âm thanh thông báo với kiểm soát khoảng thời gian và xử lý lỗi
   * @param {Object} options - Các tùy chọn cho âm thanh
   * @param {number} options.volume - Âm lượng từ 0 đến 1
   * @param {boolean} options.force - Bỏ qua kiểm tra khoảng thời gian và phát ngay
   * @returns {Promise<boolean>} - Trả về true nếu âm thanh được phát thành công
   */  play(options = {}) {
    const { volume = 0.5, force = false, messageId = null, senderId = null } = options;
    const now = Date.now();
    
    // In chi tiết để gỡ lỗi
    console.log('Chuẩn bị phát âm thanh với options:', JSON.stringify({
      volume, force, messageId: messageId ? String(messageId).substring(0, 8) + '...' : null,
      senderId: senderId ? String(senderId).substring(0, 8) + '...' : null
    }));
    
    // Kiểm tra xem âm thanh thông báo có được bật không
    if (!this.enabled && !force) {
      console.log('Âm thanh thông báo đã bị tắt');
      return Promise.resolve(false);
    }
    
    // Kiểm tra tin nhắn gửi đi thông qua nhiều cách
    // 1. Kiểm tra messageId trong danh sách tin nhắn vừa gửi
    if (messageId) {
      console.log('Kiểm tra messageId:', typeof messageId === 'string' ? messageId : JSON.stringify(messageId));
      
      if (this.isRecentlySentMessage(messageId)) {
        console.log('Bỏ qua âm thanh: tin nhắn được tìm thấy trong cache gửi đi');
        return Promise.resolve(false);
      }
    }
    
    // 2. Kiểm tra thêm bằng senderId nếu có
    if (senderId && this._currentUserId && 
        (String(senderId) === String(this._currentUserId) || senderId === this._currentUserId)) {
      console.log('Bỏ qua âm thanh: tin nhắn từ chính người dùng hiện tại');
      
      // Đánh dấu tin nhắn này để không phát âm thanh trong tương lai
      if (messageId) {
        this.markMessageAsSent(messageId);
      }
      
      return Promise.resolve(false);
    }
    
    // Kiểm tra khoảng thời gian giữa các lần phát
    if (!force && now - this.lastPlayed < NOTIFICATION_COOLDOWN) {
      console.log('Âm thanh thông báo đang trong thời gian hồi, bỏ qua');
      return Promise.resolve(false);
    }

    // Nếu đang phát, reset để phát lại
    if (this.isPlaying) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    // Đảm bảo audio element đã được tải lại và sẵn sàng
    // Điều này giúp tránh lỗi như "The play() request was interrupted"
    this.audio.src = '/notification.mp3';
    this.audio.load();

    // Cập nhật thời gian phát cuối cùng
    this.lastPlayed = now;
    this.audio.volume = volume;
    
    // Phát âm thanh và xử lý lỗi
    try {
      this.isPlaying = true;
      const playPromise = this.audio.play();
      
      if (playPromise !== undefined) {
        return playPromise
          .then(() => {
            // Xử lý khi âm thanh kết thúc
            this.audio.onended = () => {
              this.isPlaying = false;
            };
            return true;
          })
          .catch(error => {
            console.error('Lỗi phát âm thanh thông báo:', error);
            this.isPlaying = false;
            
            // Nếu lỗi là do autoplay policy (thường gặp nhất)
            if (error.name === 'NotAllowedError') {
              console.log('Lỗi autoplay, cần tương tác người dùng');
              // Không cần xử lý gì thêm ở đây, ứng dụng sẽ chờ sự kiện click
            }
            
            return false;
          });
      }
      
      return Promise.resolve(true);
    } catch (error) {
      console.error('Lỗi không xác định khi phát âm thanh:', error);
      this.isPlaying = false;
      return Promise.resolve(false);
    }
  }
}

// Xuất instance duy nhất để sử dụng trong toàn bộ ứng dụng
const notificationSound = new NotificationSoundManager();

export default notificationSound;
