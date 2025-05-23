// utils/callAudioHelpers.js

/**
 * Lấy stream audio từ thiết bị của người dùng
 * @param {boolean} audioOnly - Chỉ lấy audio, bỏ qua video
 * @returns {Promise<MediaStream>} - Stream audio từ micro
 */
export const getUserAudioMedia = async (audioOnly = true) => {
    try {
        const constraints = {
            audio: true,
            video: audioOnly ? false : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
    } catch (error) {
        console.error('Lỗi khi truy cập thiết bị media:', error);
        throw new Error(
            error.name === 'NotAllowedError'
                ? 'Quyền truy cập micro bị từ chối. Vui lòng cấp quyền và thử lại.'
                : error.name === 'NotFoundError'
                ? 'Không tìm thấy micro. Vui lòng kiểm tra thiết bị.'
                : 'Không thể truy cập micro. Vui lòng kiểm tra thiết bị và cài đặt.'
        );
    }
};

/**
 * Tạo một stream trống
 * @returns {MediaStream} - Một MediaStream trống
 */
export const getEmptyMedia = () => {
    return new MediaStream();
};

/**
 * Kiểm tra quyền truy cập micro
 * @returns {Promise<boolean>} - True nếu quyền micro được cấp
 */
export const checkMicrophonePermission = async () => {
    try {
        // Kiểm tra quyền micro qua API permissions
        if (navigator.permissions && navigator.permissions.query) {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            if (permissionStatus.state === 'granted') {
                return true;
            }
            if (permissionStatus.state === 'denied') {
                return false;
            }
        }

        // Nếu không thể kiểm tra quyền hoặc quyền đang ở trạng thái 'prompt', thử yêu cầu quyền
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stopMediaTracks(stream); // Dừng stream ngay để tránh giữ micro
            return true;
        } catch (error) {
            console.error('Lỗi khi thử yêu cầu quyền micro:', error);
            return false;
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra quyền micro:', error);
        return false;
    }
};

/**
 * Dừng tất cả track trong stream
 * @param {MediaStream} stream - Stream cần dừng
 */
export const stopMediaTracks = (stream) => {
    if (stream && stream.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
    }
};

/**
 * Lấy danh sách thiết bị micro
 * @returns {Promise<MediaDeviceInfo[]>} - Danh sách thiết bị micro
 */
export const getMicrophoneDevices = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((device) => device.kind === 'audioinput');
    } catch (error) {
        console.error('Lỗi khi liệt kê thiết bị micro:', error);
        return [];
    }
};