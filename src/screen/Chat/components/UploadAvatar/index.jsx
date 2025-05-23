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

    useEffect(() => {
        if (isClear) {
            console.log('clear');
            setImagePreview('');
        }
    }, [isClear]);

    const handleOnChange = async (e) => {
        const files = e.target.files;

        const fileImage = files[0];
        
        const reader = new FileReader();
        if (fileImage && fileImage.type.match('image.*')) {   
            reader.readAsDataURL(fileImage);
            reader.onloadend = function (e) {
                setImagePreview(reader.result);
            };

            if (getFile) {
                getFile(fileImage)
            }

        }
    }

    return (
        <div className='upload-avatar'>
            <div className="upload-avatar_default-avatar">
                <div className="upload-avatar_image">
                    {(avatar || imagePreview) ? (
                        <img src={imagePreview ? imagePreview : avatar} alt="Avatar Preview" />
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
