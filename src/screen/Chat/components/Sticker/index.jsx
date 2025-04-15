
import React from 'react';
import PropTypes from 'prop-types';
import './style.css';
import { Tabs } from 'antd';
import { GiftOutlined, SmileOutlined } from '@ant-design/icons';
import ListSticker from '../ListSticker';

Sticker.propTypes = {
    data: PropTypes.array,
    onClose: PropTypes.func,
    onScroll: PropTypes.func,
    onEmojiClick: PropTypes.func,
};


function Sticker({ data = [], onClose = null, onScroll = null, onEmojiClick = null }) {

    const handleOnClose = () => {
        if (onClose) {
            onClose()
        }
    };

    const { TabPane } = Tabs;

    function handleOnChange() {

    }
    const handleEmojiClick = (emoji) => {
        if (onEmojiClick) {
            onEmojiClick(emoji);
        }
    };
    const emojiCategories = [
        {
          name: 'Phổ biến',
          emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
            '😉', '😊', '😇', '🥰', '😍', '😘', '😗', '😚', '😙', '😋',
            '👍', '👎', '👏', '🙌', '👐', '🤝', '❤️', '💔', '💯', '🔥',
          ]
        },
        {
          name: 'Biểu cảm',
          emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '☺️', '😊',
            '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙',
            '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
          ]
        },
        {
          name: 'Động vật',
          emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
          ]
        }
      ];

    return (
        <div id='sticker'>

            <Tabs defaultActiveKey="1" onChange={handleOnChange}>
                <TabPane
                    tab={
                        <span className='menu-item'><GiftOutlined /> STICKER</span>
                    }
                    key="1"
                >
                    <ListSticker
                        data={data}
                        onClose={handleOnClose}
                        onScroll={onScroll}
                    />
                </TabPane>
                {/* Tab EMOJI mới */}
                <TabPane
                    tab={
                        <span className='menu-item'><SmileOutlined /> EMOJI</span>
                    }
                    key="2"
                >
                    <div className="emoji-container">
                        {emojiCategories.map((category, index) => (
                            <div key={index} className="emoji-category">
                                <h4>{category.name}</h4>
                                <div className="emoji-list">
                                    {category.emojis.map((emoji, idx) => (
                                        <span 
                                        key={idx} 
                                        className="emoji-item"
                                        onClick={()=>handleEmojiClick(emoji)}>{emoji}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabPane>
            </Tabs>
        </div>
    );
}

export default Sticker;
