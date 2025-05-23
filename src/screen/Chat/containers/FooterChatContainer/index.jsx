import { LikeTwoTone, SendOutlined, SmileOutlined } from '@ant-design/icons';
import { Mentions, Modal } from 'antd';
import messageApi from '../../../../apis/messageApi';
import NavigationChatBox from '../../components/NavigationChatBox';
import PersonalIcon from '../../components/PersonalIcon';
import ReplyBlock from '../../components/ReplyBlock';
import TextEditor from '../../components/TextEditor';
import notificationSound from '../../../../utils/notificationSound';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import MENTION_STYLE from './MentionStyle';
import MultipleImageUpload from '../../../../customfields/MultipleImageUpload';
import './style.css';

FooterChatContainer.propTypes = {
    onScrollWhenSentText: PropTypes.func,
    socket: PropTypes.object,
    replyMessage: PropTypes.object,
    onCloseReply: PropTypes.func,
    userMention: PropTypes.object,
    onRemoveMention: PropTypes.func,
    onViewVotes: PropTypes.func,
    onOpenInfoBlock: PropTypes.func,
};

const style_EditorText = {
    flexDirection: 'column',
};

const style_addtion_interaction = {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
};

FooterChatContainer.defaultProps = {
    onScrollWhenSentText: null,
    socket: null,
    replyMessage: {},
    onCloseReply: null,
    userMention: {},
    onRemoveMention: null,
    onViewVotes: null,
    onOpenInfoBlock: null,
};

function FooterChatContainer({ onScrollWhenSentText, socket, replyMessage, onCloseReply, userMention, onRemoveMention, onViewVotes, onOpenInfoBlock }) {
    const [showTextFormat, setShowTextFormat] = useState(false);
    const { currentConversation, conversations, currentChannel, memberInConversation } = useSelector(
        (state) => state.chat
    );

    const getTypeConversation = conversations.find(ele => ele._id === currentConversation).type;

    const [isShowLike, setShowLike] = useState(true);
    // const { TextArea } = Input;
    const [valueText, setValueText] = useState('');
    const [isHightLight, setHightLight] = useState(false);
    const { user } = useSelector((state) => state.global);
    const [detailConver, setDetailConver] = useState({});
    const { Option } = Mentions;
    const checkGroup = conversations.find(ele => ele._id === currentConversation);
    const [mentionList, setMentionsList] = useState([]);
    const [mentionSelect, setMentionSelect] = useState([]);
    const preMention = useRef();
    const [showMultiImageUpload, setShowMultiImageUpload] = useState(false);

    const checkIsExistInSelect = (userMen) => {
        if (mentionSelect.length > 0) {
            const index = mentionSelect.findIndex(ele => ele._id === userMen._id);
            return index >= 0;
        } else {
            return false;
        }
    }



    useEffect(() => {
        if (userMention && Object.keys(userMention).length > 0) {

            let tempMensionSelect = [...mentionSelect];
            let tempMensionList = [...mentionList];
            let tempValueText = valueText;


            if (preMention.current) {


                if (checkIsExistInSelect(preMention.current)) {

                    const regex = new RegExp(`^@${preMention.current.name}`);
                    const newText = valueText.replace(regex, '');
                    tempValueText = newText;

                    tempMensionSelect = mentionSelect.filter(ele => ele._id !== preMention.current._id);
                    tempMensionList = [...mentionList, preMention.current]
                }
            }

            const checkExist = checkIsExistInSelect(userMention);

            if (!checkExist) {
                if (getTypeConversation) {
                    tempValueText = `@${userMention.name} ${tempValueText}`;
                }
                setValueText(tempValueText);
                setMentionSelect([...tempMensionSelect, userMention]);
                tempMensionList = tempMensionList.filter(ele => ele._id !== userMention._id);
                setMentionsList(tempMensionList);
            }
            preMention.current = userMention;

        }
    }, [userMention])


    useEffect(() => {

        if (memberInConversation.length > 0) {
            setMentionsList(memberInConversation);
        }

    }, [memberInConversation])


    useEffect(() => {

        setValueText('');
        setMentionSelect([]);
    }, [currentConversation])


    useEffect(() => {
        if (currentConversation) {
            const tempConver = conversations.find(
                (conver) => conver._id === currentConversation
            );
            if (tempConver) {
                setDetailConver(tempConver);
            }
        }

    }, [currentConversation])




    const handleClickTextFormat = () => {
    setShowTextFormat(!showTextFormat);
        setValueText('');
    };    
    
    async function sendMessage(value, type) {
        const listId = mentionSelect.map(ele => ele._id);


        const newMessage = {
            content: value,
            type: type,
            conversationId: currentConversation,
            tags: listId,

        };
        if (replyMessage && Object.keys(replyMessage).length > 0) {
            newMessage.replyMessageId = replyMessage._id;
        }

        if (currentChannel) {
            newMessage.channelId = currentChannel
        };


        await messageApi
            .sendTextMessage(newMessage)
            .then((res) => {
                const { _id } = res;
                
                // Quan trọng: Đánh dấu tin nhắn này là vừa được gửi
                // để không phát âm thanh thông báo khi nhận lại từ server
                if (_id) {
                    console.log('Đánh dấu tin nhắn đã gửi với ID:', _id);
                    notificationSound.markMessageAsSent(_id);
                }
                
                handleOnScroll(_id);
                console.log('Send Message Success');
            })
            .catch((err) => console.log('Send Message Fail'));
        setMentionsList(memberInConversation);
        setMentionSelect([]);

        if (onCloseReply) {
            onCloseReply();
        }
        if (onRemoveMention) {
            onRemoveMention();
        }

    }

    const handleOnScroll = (id) => {
        if (onScrollWhenSentText) {
            onScrollWhenSentText(id);
        }
    }

    const handleSentMessage = () => {
        if (valueText.trim()) {
            if (showTextFormat) {
                sendMessage(valueText, 'HTML');
            } else {
                sendMessage(valueText, 'TEXT');
            }
            setValueText('');
            socket.emit('not-typing', currentConversation, user);
        }


    };
    const handleSentLike = () => {
        sendMessage('👍', 'TEXT');
        setValueText('');
        socket.emit('not-typing', currentConversation, user);
    }

    const handleOnChageInput = (value) => {
        if (mentionSelect.length > 0) {
            mentionSelect.forEach((ele, index) => {
                const regex = new RegExp(`@${ele.name}`)
                if (regex.exec(value) === null) {
                    const tempMensionList = [...mentionList];
                    const checkExist = mentionList.every(temp => ele._id !== temp._id);
                    if (checkExist) {
                        tempMensionList.push(ele);
                    }
                    setMentionsList(tempMensionList);
                    setMentionSelect(mentionSelect.filter(select => select._id !== ele._id));
                    if (onRemoveMention) {
                        onRemoveMention();
                    }
                    return false;
                }

            })
        }

        value.length > 0 ? setShowLike(false) : setShowLike(true);
        setValueText(value);


        if (value.length > 0 && !currentChannel) {
            socket.emit('typing', currentConversation, user);
        } else {
            socket.emit('not-typing', currentConversation, user);
        }
    };

    const handleShowLike = (value) => {
        setShowLike(value);
    };


    const handleKeyPress = (event) => {

        if (event.nativeEvent.keyCode === 13) {
            if (!event.shiftKey) {
                const valueInput = event.target.value;

                if (valueInput.trim().length > 0) {
                    sendMessage(valueInput, 'TEXT');
                    setValueText('');
                    socket.emit('not-typing', currentConversation, user);

                }

                event.preventDefault();
            }
        }

    };

    const handleOnFocus = (e) => {
        if (currentChannel) {
            socket.emit('conversation-last-view', currentConversation, currentChannel);
        } else {
            socket.emit('conversation-last-view', (currentConversation));
        }


        setHightLight(true);
    };

    const handleOnBlur = (e) => {
        setHightLight(false);
        socket.emit('not-typing', currentConversation, user);
    };

    const handleSetValueEditor = (content) => {
        setValueText(content);
    };
    const handleSetEmojiEditor = (emoji) => {
        setValueText((prev) => prev + emoji);
    };    const handleSelectMention = ({ object }, _) => {
        setMentionSelect([...mentionSelect, object]);
        setMentionsList(mentionList.filter(ele => ele._id !== object._id));
    }
    
    const handleMultiImageClick = () => {
        setShowMultiImageUpload(true);
    }
    
    const handleMultiImagesSent = () => {
        setShowMultiImageUpload(false);
        handleOnScroll();
    }

    return (
        <div id='main-footer-chat'>
            <div className='navigation'>
                <NavigationChatBox
                    isFocus={isHightLight}
                    onClickTextFormat={handleClickTextFormat}
                    onScroll={handleOnScroll}
                    onViewVotes={onViewVotes}
                    onOpenInfoBlock={onOpenInfoBlock}
                    onEmojiClick={handleSetEmojiEditor}
                    onMultiImageClick={handleMultiImageClick}
                />
            </div>
            {
                (replyMessage && Object.keys(replyMessage).length > 0) &&
                (

                    <ReplyBlock
                        replyMessage={replyMessage}
                        onCloseReply={onCloseReply}
                    />
                )
            }



            <div
                className='chat-editor'
                style={showTextFormat ? style_EditorText : {}}
            >

                <div className='main-editor'>
                    {showTextFormat ? (
                        <TextEditor
                            showFormat={showTextFormat}
                            onFocus={handleOnFocus}
                            onBlur={handleOnBlur}
                            showLike={handleShowLike}
                            valueHtml={valueText}
                            onSetValue={handleSetValueEditor}
                        />
                    ) : (

                        <Mentions
                            autoSize={{ minRows: 1, maxRows: 5 }}
                            placeholder={`Nhập @, tin nhắt tới ${detailConver.name}`}
                            size='large'
                            // bordered={false}
                            onChange={handleOnChageInput}
                            onKeyPress={handleKeyPress}
                            value={valueText}
                            style={{ whiteSpace: 'pre-wrap', border: 'none', outline: 'none' }}
                            spellCheck={false}
                            onFocus={handleOnFocus}
                            onBlur={handleOnBlur}
                            onSelect={handleSelectMention}
                            split=" "
                        >
                            {checkGroup && (
                                mentionList.map((ele, index) => {
                                    if (ele._id !== user._id) {
                                        return (
                                            <Option
                                                value={ele.name}
                                                key={index}
                                                object={ele}
                                            >
                                                <div
                                                    className='mention-option_wrapper'
                                                    style={MENTION_STYLE.MENTION_ITEM}
                                                >
                                                    <div className='icon-user-item'>
                                                        <PersonalIcon
                                                            demention={24}
                                                            avatar={ele.avatar}
                                                            name={ele.name}
                                                        />
                                                    </div>

                                                    <div
                                                        style={MENTION_STYLE.NAME_ITEM}
                                                        className='name-user-item'
                                                    >
                                                        {ele.name}
                                                    </div>
                                                </div>
                                            </Option>
                                        )
                                    }
                                }))}
                        </Mentions>
                    )}
                </div>

                <div
                    className='addtion-interaction'
                    style={
                        showTextFormat ? style_addtion_interaction : undefined
                    }
                >

                    {
                        isShowLike ? (
                            <div className='like-emoji'>
                                <div
                                    className='send-text-thumb'
                                    onClick={handleSentLike}>
                                    <LikeTwoTone twoToneColor='#fadb14' />
                                </div>
                            </div>
                        ) : (
                            <div className='like-emoji'>
                                <div
                                    className='send-text-thumb'
                                    onClick={handleSentMessage}>
                                    <SendOutlined />
                                </div>
                            </div>
                        )
                    }

                </div>
            </div>            <Modal
                title="Gửi nhiều hình ảnh"
                open={showMultiImageUpload}
                onCancel={() => setShowMultiImageUpload(false)}
                footer={null}
                width={600}
                destroyOnClose={true}
            >
                <MultipleImageUpload 
                    conversationId={currentConversation}
                    channelId={currentChannel}
                    onImagesSent={handleMultiImagesSent}
                />
            </Modal>
        </div>
    );
}

export default FooterChatContainer;