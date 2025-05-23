import React from 'react';
import PropTypes from 'prop-types';
import ConversationAvatar from '../../screen/Chat/components/ConservationAvatar';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Empty } from 'antd';
import { fetchListMessages, setCurrentConversation,fetchChannels,
    getLastViewOfMembers,getMembersConversation,
    setTypeOfConversation } from '../../screen/Chat/slices/chatSlice';

ConverMutipleSearch.propTypes = {
    data: PropTypes.array,
};

ConverMutipleSearch.defaultProps = {
    data: [],
};

function ConverMutipleSearch({ data }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();


    const handleClickItem = (value) => {
        dispatch(fetchListMessages({ conversationId: value._id, size: 10 }));
        dispatch(setCurrentConversation(value._id));
        dispatch(getMembersConversation({ conversationId: value._id }));   
        dispatch(setTypeOfConversation(value._id));
        dispatch(fetchChannels({ conversationId: value._id}));
        dispatch(getLastViewOfMembers({ conversationId: value._id }));
        navigate(`/chat`);
    }

    return (
        <div className='list-filter_single-conver'>
            {data.length === 0 && (
                <Empty />
            )}


            {data.map((ele, index) => (
                <div key={index} className="single-conver_item" onClick={() => handleClickItem(ele)}>
                    <ConversationAvatar
                        avatar={ele.avatar}
                        totalMembers={ele.totalMembers}
                        type={ele.type}
                        name={ele}

                    />

                    <div className="single-conver_name">
                        {ele.name}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ConverMutipleSearch;