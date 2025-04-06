import io from 'socket.io-client';

// Biến singleton để lưu trữ kết nối duy nhất
let socketInstance = null;

/**
 * Khởi tạo và trả về kết nối socket
 * @returns {Object} Socket instance
 */
export function init() {
    // Nếu socket đã tồn tại và đang kết nối, trả về instance hiện tại
    if (socketInstance && socketInstance.connected) {
        console.log('Socket already connected, reusing existing socket');
        return socketInstance;
    }

    // Nếu socket tồn tại nhưng không kết nối, hủy nó
    if (socketInstance) {
        console.log('Cleaning up disconnected socket');
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketInstance = null;
    }

    // Lấy URL từ biến môi trường
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
    if (!SOCKET_URL) {
        console.error('REACT_APP_SOCKET_URL is not defined');
        return null;
    }

    // Tạo socket mới với cấu hình tối ưu cho kết nối ổn định
    socketInstance = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,            // Bật tự động kết nối lại
        reconnectionAttempts: 10, // Số lần thử kết nối lại không giới hạn
        reconnectionDelay: 1000,       // Delay giữa các lần thử kết nối lại
        reconnectionDelayMax: 5000,    // Delay tối đa
        timeout: 20000,                // Timeout cho kết nối
        auth: {                        // Thông tin xác thực
            token: localStorage.getItem('token') || ''
        }
    });

    // Thiết lập các event handlers cơ bản
    _setupEventHandlers(socketInstance);

    console.log('Socket initialized with URL:', SOCKET_URL);
    return socketInstance;
}

/**
 * Thiết lập các event handlers cho socket
 * @param {Object} socket - Socket instance
 * @private
 */
function _setupEventHandlers(socket) {
    // Xử lý sự kiện kết nối thành công
    socket.on('connect', () => {
        console.log('Socket connected with ID:', socket.id);
        
        // Tự động join với userId nếu có
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (userId) {
            console.log('Auto-joining with userId:', userId);
            socket.emit('join', userId);
        }
    });

    // Xử lý sự kiện mất kết nối
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected. Reason:', reason);
        
        // Xử lý các lý do ngắt kết nối khác nhau
        if (reason === 'io server disconnect') {
            // Server chủ động ngắt kết nối - có thể cần làm mới token
            console.log('Server disconnected the socket, attempting to reconnect...');
            setTimeout(() => {
                // Cập nhật token trước khi kết nối lại
                const token = localStorage.getItem('token') || '';
                socket.auth = { token };
                socket.connect();
            }, 1000);
        } 
        else if (reason === 'client namespace disconnect') {
            // Client namespace disconnect - thường do lỗi xác thực
            console.log('Client namespace disconnect, attempting to reconnect...');
            setTimeout(() => {
                socket.connect();
            }, 1000);
        }
        // Các trường hợp khác sẽ được xử lý tự động bởi Socket.IO
    });

    // Log các sự kiện tái kết nối
    socket.io.on('reconnect', (attempt) => {
        console.log(`Socket reconnected after ${attempt} attempts`);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`Socket reconnection attempt: ${attempt}`);
        // Cập nhật token khi tái kết nối
        const token = localStorage.getItem('token') || '';
        socket.auth = { token };
    });

    socket.io.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error.message);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
    });
}

/**
 * Lấy socket instance hiện tại hoặc khởi tạo mới nếu chưa tồn tại
 * @returns {Object} Socket instance
 */
export function getSocket() {
    if (!socketInstance) {
        return init();
    }
    return socketInstance;
}

/**
 * Đóng kết nối socket - chỉ sử dụng khi cần thiết (đăng xuất, đóng ứng dụng)
 */
export function closeConnection() {
    if (socketInstance) {
        console.log('Closing socket connection');
        socketInstance.disconnect();
        socketInstance = null;
    }
}

// Khởi tạo socket ngay khi import module
export const socket = init();

// Export default socket instance
export default socket;