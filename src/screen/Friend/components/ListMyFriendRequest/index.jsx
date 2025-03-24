import React from 'react';
import PropTypes from 'prop-types';
import FriendCard from '../FriendCard';
import friendApi from '../../../../apis/friendApi';
import { fetchListMyRequestFriend } from '../../friendSlice';
import { useDispatch } from 'react-redux';
import './style.css';

ListMyFriendRequest.propTypes = {
    data: PropTypes.array,
};

function ListMyFriendRequest({ data }) {

    const dispatch = useDispatch();
    const handleRemoveMyRequest = async (value) => {
        await friendApi.deleteSentRequestFriend(value._id);
        dispatch(fetchListMyRequestFriend());
    }


    return (
        <div className='list-my-friend-request'>

            {(data && data.length > 0) &&
                data.map((ele, index) => (
                    <FriendCard
                        key={index}
                        isMyRequest={true}
                        data={ele}
                        onCancel={handleRemoveMyRequest}
                    />

                ))
            }


        </div>
    );
}

export default ListMyFriendRequest;