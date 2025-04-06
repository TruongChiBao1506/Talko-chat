import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ImageItem from '../ImageItem';
import './style.css';
import { Image } from 'antd';
import ModalVideoCustom from '../../../../modals/ModalVideoCustom';
import ThumbnailCustom from '../../../../components/ThumbnailCustom';
ContentTabPaneMedia.propTypes = {
    items: PropTypes.array,
    type: PropTypes.string,
};

function ContentTabPaneMedia(items = [], type = 'image') {
    const [visible, setVisible] = useState(false);
    const [currentVideo, setCurrentVideo] = useState('');

    const handleVisibleModal = (url) => {
        setVisible(true);
        setCurrentVideo(url);

    }

    const handleOnClose = () => {
        setVisible(false);
        setCurrentVideo('');
    }

    return (
        <div id='content-tabpane-media-wrapper'>
            <div className='item-in-archive-media'>
                <div className='list-item-sent'>


                    {type === 'video' ? (
                        <>
                            {
                                items.map((ele, index) => (
                                    <ThumbnailCustom
                                        key={index}
                                        url={ele.content}
                                        onVisibleVideoModal={handleVisibleModal}
                                        height={110}
                                        width={110}
                                    />
                                ))
                            }
                        </>
                    ) : (
                        <Image.PreviewGroup>
                            {items.map((itemEle, index) => (
                                <ImageItem
                                    key={index}
                                    url={itemEle.content}
                                    type={type}
                                    onVisibleVideoModal={handleVisibleModal}
                                />
                            ))}
                        </Image.PreviewGroup>

                    )}

                </div>
            </div>

            <ModalVideoCustom
                isVisible={visible}
                url={currentVideo}
                onClose={handleOnClose}
            />
        </div>
    );
}

export default ContentTabPaneMedia;