import React from 'react';
import PropTypes from 'prop-types';
import './style.css';
import PersonalIcon from '../../components/PersonalIcon';
import { Empty } from 'antd';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchListMessages, setCurrentConversation } from '../../slices/chatSlice';

ConverPersonalSearch.propTypes = {
    data: PropTypes.array,
};

ConverPersonalSearch.defaultProps = {
    data: [],
};

function ConverPersonalSearch({ data }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();


    const handleClickItem = (value) => {
        dispatch(fetchListMessages({ conversationId: value._id, size: 10 }));
        dispatch(setCurrentConversation(value._id));
        // navigate(`/chat`);
    }
    return (
        <div className='list-filter_single-conver'>
            {data.length === 0 && (
                <Empty />
            )}
            {data.map((ele, index) => (
                <div key={index} className="single-conver_item" onClick={() => handleClickItem(ele)} >
                    <PersonalIcon
                        avatar={ele.avatar}
                        color={ele.avatarColor}
                        name={ele.name}
                    />

                    <div className="single-conver_name">
                        {ele.name}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ConverPersonalSearch;