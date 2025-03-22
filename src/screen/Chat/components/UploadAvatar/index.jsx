import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './style.css';
import { CameraOutlined, FileImageOutlined } from '@ant-design/icons';

UploadAvatar.propTypes = {
    avatar: PropTypes.string,
    getFile: PropTypes.func,
    isClear: PropTypes.bool,
};

UploadAvatar.defaultProps = {
    getFile: null,
    avatar: '',
    isClear: false,
};

function UploadAvatar({ avatar, getFile, isClear }) {
    const [imagePreview, setImagePreview] = useState("");

    // Cập nhật ảnh khi `avatar` thay đổi
    useEffect(() => {
        if (avatar) {
            setImagePreview(avatar);
        }
    }, [avatar]);

    // Xóa ảnh khi `isClear` được kích hoạt
    useEffect(() => {
        if (isClear) {
            setImagePreview('');
        }
    }, [isClear]);

    const handleOnChange = (e) => {
        const fileImage = e.target.files[0]; // Lấy file ảnh từ input

        if (!fileImage || !fileImage.type.match('image.*')) {
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(fileImage); // Đọc file dưới dạng URL dữ liệu base64
        reader.onloadend = () => setImagePreview(reader.result);
        // Khi quá trình đọc kết thúc, cập nhật ảnh preview bằng URL base64
        if (getFile) {
            getFile(fileImage); // Truyền file ảnh ra ngoài
        }
    };

    return (
        <div className='upload-avatar'>
            <div className="upload-avatar_default-avatar">
                <div className="upload-avatar_image">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Avatar Preview" />
                    ) : (
                        <label className='upload-avatar_text-select' htmlFor="upload-photo_custom">
                            <FileImageOutlined style={{fontSize:'25px'}}/>
                        </label>
                    )}
                </div>

                <div className="upload-avatar_icon">
                    <label htmlFor="upload-photo_custom">
                        <CameraOutlined style={{ fontSize: '13px' }} />
                    </label>
                    <input
                        id="upload-photo_custom"
                        type="file"
                        hidden
                        onChange={handleOnChange}
                        accept="image/*"
                    />
                </div>
            </div>
        </div>
    );
}

export default UploadAvatar;
