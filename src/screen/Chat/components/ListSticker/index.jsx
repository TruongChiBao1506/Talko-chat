import React from 'react';
import PropTypes from 'prop-types';
import './style.css'
import StickerItem from '../StickerItem';

ListSticker.propTypes = {
    data: PropTypes.array,
    onClose: PropTypes.func,
    onScroll: PropTypes.func,
};

function ListSticker({ data = [], onClose = null, onScroll = null }) {
    return (
        <div id='sticker-list'>
            {data?.map((ele, index) => (
                <StickerItem
                    key={index}
                    data={ele}
                    onClose={onClose}
                    onScroll={onScroll}
                />
            ))}

        </div>
    );
}

export default ListSticker;