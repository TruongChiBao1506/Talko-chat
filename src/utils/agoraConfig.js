// Cập nhật APP_ID với ID của dự án Agora mới
export const APP_ID = "5bc3cba5648449c189ca3b5b726d1c12"; // Thay bằng ID dự án mới của bạn
export const TOKEN = null; // Không cần token với dự án không xác thực

// Tạo channel ID dựa trên conversationId
export const generateChannelId = (conversationId) => {
  return `conversation_channel_${conversationId}`;
};

// Tạo UID ngẫu nhiên để tránh xung đột
export const generateUid = () => {
  return Math.floor(Math.random() * 100000);
};

// Trong dự án không xác thực, hàm này sẽ luôn trả về null
export const fetchToken = async (channelName, uid) => {
  console.log('📱 Sử dụng kết nối không cần token cho kênh:', channelName);
  return null;
};