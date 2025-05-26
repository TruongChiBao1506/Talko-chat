class CallRingtone {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.ringtoneUrl = '/ringtone.mp3'; // File âm thanh trong thư mục public
    }

    // Khởi tạo âm thanh
    initialize() {
        if (!this.audio) {
            this.audio = new Audio(this.ringtoneUrl);
            this.audio.loop = true; // Lặp lại cho đến khi dừng
            this.audio.volume = 0.7; // Âm lượng 70%
            
            // Xử lý lỗi
            this.audio.addEventListener('error', (e) => {
                console.error('❌ Lỗi khi tải âm thanh cuộc gọi:', e);
            });

            // Log khi âm thanh sẵn sàng
            this.audio.addEventListener('canplaythrough', () => {
                console.log('🔊 Âm thanh cuộc gọi đã sẵn sàng');
            });
        }
    }

    // Phát âm thanh cuộc gọi
    async play() {
        try {
            this.initialize();
            
            if (this.isPlaying) {
                console.log('🔊 Âm thanh cuộc gọi đang phát');
                return;
            }

            console.log('🔊 Bắt đầu phát âm thanh cuộc gọi');
            this.isPlaying = true;
            
            // Reset thời gian phát về đầu
            this.audio.currentTime = 0;
            
            await this.audio.play();
            console.log('🔊 Đã bắt đầu phát âm thanh cuộc gọi');
            
        } catch (error) {
            console.error('❌ Lỗi khi phát âm thanh cuộc gọi:', error);
            this.isPlaying = false;
            
            // Fallback: thử phát lại sau 1 giây
            setTimeout(() => {
                this.forcePlay();
            }, 1000);
        }
    }

    // Force play - thử phát mà không cần user interaction
    forcePlay() {
        if (this.audio && !this.isPlaying) {
            this.audio.play().catch(err => {
                console.log('🔇 Không thể tự động phát âm thanh - cần tương tác người dùng');
            });
        }
    }

    // Dừng âm thanh
    stop() {
        if (this.audio && this.isPlaying) {
            console.log('🔇 Dừng âm thanh cuộc gọi');
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
        }
    }

    // Thiết lập âm lượng
    setVolume(volume) {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    // Kiểm tra trạng thái phát
    getIsPlaying() {
        return this.isPlaying;
    }

    // Cleanup
    destroy() {
        this.stop();
        if (this.audio) {
            this.audio.removeEventListener('error', () => {});
            this.audio.removeEventListener('canplaythrough', () => {});
            this.audio = null;
        }
    }
}

// Export singleton instance
const callRingtone = new CallRingtone();
export default callRingtone;