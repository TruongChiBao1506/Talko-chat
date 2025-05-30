import {
    DashOutlined, FileImageOutlined,
    FontColorsOutlined,
    LinkOutlined, SmileOutlined, PictureOutlined
} from '@ant-design/icons';
import { Button, Dropdown, Menu, Popover } from 'antd';
import UploadFile from '../../../../customfields/upLoadFile';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { BsNewspaper } from "react-icons/bs";
import { FcBarChart } from "react-icons/fc";
import { ReactComponent as GeminiIcon } from '../../../../assets/icons/gemini.svg';
import { IoText } from "react-icons/io5";
import { useSelector } from 'react-redux';
import ModalCreateVote from '../../../../modals/ModalCreateVote';
import Sticker from '../Sticker';
import './style.css';

NavigationChatBox.propTypes = {
    onClickTextFormat: PropTypes.func,
    isFocus: PropTypes.bool,
    onScroll: PropTypes.func,
    onViewVotes: PropTypes.func,
    onOpenInfoBlock: PropTypes.func,
    onEmojiClick: PropTypes.func,
    onMultiImageClick: PropTypes.func
};

NavigationChatBox.defaultProps = {
    onClickTextFormat: null,
    isFocus: false,
    onScroll: null,
    onViewVotes: null,
    onOpenInfoBlock: null,
    onEmojiClick: null,
    onMultiImageClick: null
};

const styleBorder = {
    borderColor: '#396edd'
}

const styleButton = {
    background: 'none',
    outline: 'none',
    border: 'red',
    padding: '0px',
    borderRadius: '50%',
    fontSize: '2.2rem',
}
const GeminiPictureIcon = () => (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
        <FileImageOutlined style={{ fontSize: 20 }} />
        <GeminiIcon
            style={{
                position: 'absolute',
                bottom: -6,
                right: -4,
                width: 14,
                height: 14,
                backgroundColor: 'transparent',
                borderRadius: '50%',
                padding: 1,
            }}
        />
    </span>
);


function NavigationChatBox(props) {
    const { onClickTextFormat, isFocus, onScroll, onViewVotes, onOpenInfoBlock, onEmojiClick, onMultiImageClick } = props;
    const [visiblePop, setVisiblePop] = useState(false);
    const { stickers, currentConversation, conversations } = useSelector(state => state.chat);
    const [isVisibleVote, setIsVisibleVote] = useState(false);
    const checkIsGroup = conversations.find(conver => conver._id === currentConversation).type;

    const handleOnClickTextFormat = () => {

        if (onClickTextFormat) {
            onClickTextFormat();
        }
    }


    const handleVisibleChange = (visible) => {
        setVisiblePop(visible)
    }

    const handleOnClose = () => {
        setVisiblePop(false)
    }
    const handleOnClick = ({ key }) => {
        if (key === 'VOTE') {
            setIsVisibleVote(true)
        }
        if (key === 'VIEW_NEWS') {
            if (onViewVotes) {
                onViewVotes();
            }
            if (onOpenInfoBlock) {
                onOpenInfoBlock();
            }
        }
    }

    const handleCloseModalVote = () => {
        setIsVisibleVote(false)
    }
    const menu = (
        <Menu onClick={handleOnClick}>
            <Menu.Item key='VOTE' icon={<FcBarChart />}>
                <span className='item-menu-vote'>Tạo cuộc bình chọn</span>
            </Menu.Item>
            <Menu.Item key='VIEW_NEWS' icon={<BsNewspaper />}>
                <span className="item-menu-vote"> Xem bảng tin nhóm</span>
            </Menu.Item>
        </Menu>
    );

    return (
        <div
            style={isFocus ? styleBorder : {}}
            id='navigation-chat-box'
        >
            <ul>
                <Popover
                    content={
                        <Sticker
                            onClose={handleOnClose}
                            data={stickers}
                            onScroll={onScroll}
                            onEmojiClick={onEmojiClick}
                        />}
                    trigger="click"
                    open={visiblePop}
                    onOpenChange={handleVisibleChange}
                    placement='topLeft'
                >
                    <li className='item-chat-box'>
                        <div title='Gửi sticker'>
                            <SmileOutlined />
                        </div>
                    </li>
                </Popover>


                <li className='item-chat-box'>

                    <UploadFile
                        typeOfFile='media'

                    >
                        <Button
                            title='Gửi hình ảnh'
                            type="text"
                            style={{...styleButton, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                        >
                            <GeminiPictureIcon />
                        </Button>
                    </UploadFile>
                </li>


                <li className='item-chat-box'>
                    <div
                        title='Gửi nhiều hình ảnh'
                        onClick={onMultiImageClick}
                    >
                        <PictureOutlined />
                    </div>
                </li>

                <li className='item-chat-box'>
                    <UploadFile
                        typeOfFile='File'

                    >
                        <Button
                            title='Gửi file'
                            type="text"
                            style={styleButton}
                        >
                            <LinkOutlined style={{ fontSize: 20 }} />
                        </Button>
                    </UploadFile>
                </li>

                <li className='item-chat-box'>
                    <div title='Định dạng tin nhắn' onClick={handleOnClickTextFormat}>
                        <FontColorsOutlined />
                    </div>
                </li>

                {checkIsGroup && (
                    <li className='item-chat-box'>

                        <Dropdown overlay={menu} placement="topLeft" trigger={['click']} arrow>
                            <Button
                                title='Vote'
                                type="text"
                                style={styleButton}
                            >
                                <DashOutlined />
                            </Button>
                        </Dropdown>
                    </li>
                )}


            </ul>


            <ModalCreateVote
                visible={isVisibleVote}
                onCancel={handleCloseModalVote}
            />
        </div>
    );
}

export default NavigationChatBox;