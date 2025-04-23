import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import CheckLink, { replaceConentWithouLink, replaceContentToLink } from '../../../../../utils/linkHelper';
import { LinkPreview } from "@dhaiwat10/react-link-preview";
import parse from 'html-react-parser'
import './style.css';
import ReplyMessage from '../ReplyMessage';
TextMessage.propTypes = {
    content: PropTypes.string,
    dateAt: PropTypes.object,
    isVisibleTime: PropTypes.bool.isRequired,
    isSeen: PropTypes.bool,
    tags: PropTypes.array,
    replyMessage: PropTypes.object,
};

function TextMessage({ content, children, dateAt = null, isSeen = false, replyMessage = null, tags = [] }) {
    const isLinkPresent = CheckLink(content);
    const handleOnClickTag = () => {
        console.log("tag");
    }
    useEffect(() => {
        tags.forEach(tag => {
            const temp = document.getElementById(`mtc-${tag._id}`);

            if (temp) {

                temp.onclick = handleOnClickTag;
            }

        })
    }, [tags]);

    const tranferTextToTagUser = (contentMes, tagUser) => {

        let tempContent = contentMes;

        if (tagUser.length > 0) {
            tags.forEach((ele) => {
                tempContent = tempContent.replace(
                    `@${ele.name}`,
                    `<span id='mtc-${ele._id}' className="tag-user" }>@${ele.name}</span>`
                );
            });
        }
        return parse(tempContent);
    }
    // const extractURLs = (text) => {
    //     const pattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&//=]*)/g;
    //     return text.match(pattern) || [];
    // };

    const matchesLink = isLinkPresent;

    const renderMessageText = (contentMes) => {

        if (!matchesLink) {
            return (
                <>
                    {tags.length > 0 ? (
                        tranferTextToTagUser(contentMes, tags)
                    ) : (
                        contentMes
                    )}
                </>
            )

        } else {
            if (matchesLink) {
                return (
                    <>
                        <div
                            className={`${replaceConentWithouLink(contentMes, matchesLink[0])}`.length > 0 ? 'content-single-link' : ''}
                        >
                            {
                                tags.length > 0 ? (
                                    tranferTextToTagUser(replaceConentWithouLink(contentMes, matchesLink[0]), tags)
                                ) : contentMes

                            }
                        </div>
                        <LinkPreview
                            url={content}
                            imageHeight="20vh"
                            className='link-preview-custom'
                            fallback={<p>Không thể tải preview cho: {content}</p>}
                            onError={(e) => console.error('Link preview error:', e)}
                        />
                    </>
                )
            }

            if (matchesLink.length > 1) {
                return (
                    <div className='content-mutiple-link'>{
                        tags.length > 0 ? (
                            tranferTextToTagUser(replaceContentToLink(contentMes, matchesLink), tags)
                        ) : (
                            parse(replaceContentToLink(contentMes, matchesLink))
                        )
                    }</div>
                )
            }
        }

    }


    return (
        <div className='text-message-item'>
            {(replyMessage && Object.keys(replyMessage).length > 0) && (
                <ReplyMessage
                    replyMessage={replyMessage}
                />

            )}

            {
                renderMessageText(content)
            }

            <div className="time-and-last_view">

                <div className="time-send">
                    <span>
                        {`0${dateAt.getHours()}`.slice(
                            -2
                        )}
                        :
                        {`0${dateAt.getMinutes()}`.slice(
                            -2
                        )}
                    </span>

                </div>

                {
                    isSeen && (
                        <div className="is-seen-message">
                            Đã xem
                        </div>
                    )

                }
            </div>

            {children}

        </div>
    );
}

export default TextMessage;