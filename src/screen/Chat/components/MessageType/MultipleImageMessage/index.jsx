import React from 'react';
import PropTypes from 'prop-types';
import { Image } from 'antd';
import { fallback } from '../../../../../assets/fallbackImage';
import MESSAGE_STYLE from '../../../../../constants/messageStyle';
import OverlayImage from '../../../../../components/OverlayImage';
import './style.css';

MultipleImageMessage.propTypes = {
    images: PropTypes.array.isRequired,
    text: PropTypes.string,
    dateAt: PropTypes.object,
    isSeen: PropTypes.bool,
};

function MultipleImageMessage({ images = [], text = '', children, dateAt = null, isSeen = false }) {
    return (
        <>
            <div className="multiple-image-message-wrapper">
                <div className="multiple-image-grid">
                    {images.map((imageUrl, index) => (
                        <div 
                            key={index} 
                            className={`multiple-image-item ${images.length > 1 ? 'multiple' : 'single'} ${images.length > 4 ? 'small' : ''}`}
                        >
                            <Image
                                src={imageUrl}
                                fallback={fallback}
                                style={MESSAGE_STYLE.imageStyle}
                                preview={{ mask: <OverlayImage /> }}
                            />
                        </div>
                    ))}
                </div>
                {text && text.trim() !== '' && (
                    <div className="multiple-image-text">
                        {text}
                    </div>
                )}
                {children}
            </div>

            <div className="time-and-last_view">
                <div className="time-send">
                    <span>
                        {`0${dateAt.getHours()}`.slice(-2)}:{`0${dateAt.getMinutes()}`.slice(-2)}
                    </span>
                </div>
                {isSeen && (
                    <div className="is-seen-message">
                        Đã xem
                    </div>
                )}
            </div>
        </>
    );
}

export default MultipleImageMessage;
