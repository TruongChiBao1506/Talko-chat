class SoundManager {
    constructor() {
        this.sounds = {
            ringtone: this.createSound('/ringtone.mp3', 0.8, true),
            notification: this.createSound('/notification.mp3', 0.5, false),
        };

        this.masterMuted = false;
        this.masterVolume = 1.0;

        // Xem người dùng đã tương tác hay chưa (bỏ qua autoplay policy)
        this.audioUnlocked = sessionStorage.getItem('audioUnlocked') === 'true';

        // Tự động unlock audio khi người dùng click lần đầu
        if (!this.audioUnlocked) {
            document.addEventListener('click', this.unlockAudio.bind(this), { once: true });
        }
    }

    createSound(src, volume, loop) {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.loop = loop;
        audio.preload = 'auto';
        return { instance: audio, volume, loop, muted: false };
    }

    unlockAudio() {
        this.audioUnlocked = true;
        sessionStorage.setItem('audioUnlocked', 'true');
        console.log('Audio đã được unlock nhờ tương tác người dùng');
    }

    play(soundName, { force = false } = {}) {
        const sound = this.sounds[soundName];
        if (!sound || !sound.instance) return false;
        if (this.masterMuted || sound.muted) return false;
        if (!this.audioUnlocked && !force) return false;

        try {
            sound.instance.currentTime = 0;
            sound.instance.volume = sound.volume * this.masterVolume;
            sound.instance.loop = sound.loop;

            sound.instance.play().catch((err) => {
                console.warn(`Không thể phát ${soundName}:`, err.message);
            });
            return true;
        } catch (e) {
            console.error(`Lỗi phát ${soundName}:`, e);
            return false;
        }
    }

    stop(soundName) {
        const sound = this.sounds[soundName];
        if (sound && sound.instance) {
            sound.instance.pause();
            sound.instance.currentTime = 0;
        }
    }

    setMuted(soundName, muted) {
        const sound = this.sounds[soundName];
        if (!sound) return;
        sound.muted = muted;
        if (muted) this.stop(soundName);
    }

    setMasterMuted(muted) {
        this.masterMuted = muted;
        if (muted) {
            Object.keys(this.sounds).forEach((name) => this.stop(name));
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound.instance) {
                sound.instance.volume = sound.volume * this.masterVolume;
            }
        });
    }
}

export default new SoundManager();
