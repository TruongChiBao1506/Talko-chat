import { CloseCircleFilled } from '@ant-design/icons';
import PropTypes from 'prop-types';
import React from 'react';
import { defaultStyles, FileIcon } from 'react-file-icon';
import { MdQuestionAnswer } from 'react-icons/md';
import fileHelpers from '../../../../utils/fileHelpers';
import './style.css';

ReplyBlock.propTypes = {
    replyMessage: PropTypes.object,
    onCloseReply: PropTypes.func,
};

function ReplyBlock({ replyMessage = null, onCloseReply = null }) {
    const handleOnCloseReply = () => {
        if (onCloseReply) {
            onCloseReply();
        }
    };

    const fileName = replyMessage.type === 'FILE' && fileHelpers.getFileName(replyMessage.content);
    const fileExtension = replyMessage.type === 'FILE' && fileHelpers.getFileExtension(fileName);

    // Xử lý MULTI_IMAGE
    let multiImageData = null;
    let isMultiImage = replyMessage.type === 'MULTI_IMAGE';
    if (isMultiImage) {
        try {
            multiImageData = JSON.parse(replyMessage.content);
        } catch (e) {
            multiImageData = null;
        }
    }

    return (
        <div className='reply-block-wrapper'>
            <div className='reply-block'>
                <div className="vertical-bar" />

                {/* Hiển thị ảnh cho MULTI_IMAGE */}
                {isMultiImage && multiImageData && Array.isArray(multiImageData.images) ? (
                    <div className="reply-block_logo" style={{ display: 'flex', gap: 4 }}>
                        {multiImageData.images.slice(0, 2).map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt="img"
                                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }}
                            />
                        ))}
                    </div>
                ) : replyMessage.type === 'IMAGE' ? (
                    <div className="reply-block_logo">
                        <img
                            src={replyMessage.content}
                            alt="img"
                        />
                    </div>
                ) : replyMessage.type === 'VIDEO' ? (
                    <div className="reply-block_logo">
                        <img
                            src='https://www.pngitem.com/pimgs/m/501-5010215_vidia-logos-download-video-logo-png-transparent-png.png'
                            alt="video"
                        />
                    </div>
                ) : replyMessage.type === 'FILE' ? (
                    <div className="reply-block_logo">
                        <div className="file_info-icon">
                            <FileIcon
                                extension={fileExtension}
                                {...defaultStyles[fileExtension]}
                            />
                        </div>
                    </div>
                ) : replyMessage.type === 'STICKER' ? (
                    <div className="reply-block_logo">
                        <img
                            src={replyMessage.content}
                            alt="sticker"
                        />
                    </div>
                ) : (
                    <div></div>
                )}

                <div className="reply-block_info">
                    <div className="info-blog_info--top">
                        <MdQuestionAnswer />&nbsp;<span>Trả lời <strong className="reply-block_info--user">{replyMessage.user.name}</strong></span>
                    </div>

                    <div className="info-blog_info--bottom">
                        {isMultiImage && multiImageData && Array.isArray(multiImageData.images) ? (
                            <React.Fragment>
                                <span>[Hình ảnh]</span>
                                {multiImageData.text && (
                                    <span style={{ marginLeft: 8, color: '#333' }}>{multiImageData.text}</span>
                                )}
                            </React.Fragment>
                        ) : isMultiImage && !multiImageData ? (
                            <span style={{ color: 'red' }}>[Không thể hiển thị ảnh]</span>
                        ) : replyMessage.type === 'IMAGE' ? (
                            <span>[Hình ảnh]</span>
                        ) : replyMessage.type === 'VIDEO' ? (
                            <span>[Video]</span>
                        ) : replyMessage.type === 'FILE' ? (
                            <span>[File] {fileName}</span>
                        ) : replyMessage.type === 'STICKER' ? (
                            <span>[Sticker]</span>
                        ) : replyMessage.type === 'HTML' ? (
                            <span>[Văn bản]</span>
                        ) : (
                            <span>{replyMessage.content}</span>
                        )}
                    </div>
                </div>

                <div className="reply-block_close-btn" onClick={handleOnCloseReply}>
                    <CloseCircleFilled />
                </div>
            </div>
        </div>
    );
}

export default ReplyBlock;