import { DeleteFilled, ExclamationCircleOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Modal, message } from 'antd';
import PropTypes from 'prop-types';
import React from 'react';
import conversationApi from '../../../../apis/conversationApi';
import {
  fetchChannels,
  fetchListMessages,
  getLastViewOfMembers,
  setCurrentChannel,
  getMembersConversation,
  setTypeOfConversation,
} from '../../slices/chatSlice';
import ConversationSingle from '../../components/ConversationSingle';
import SubMenuClassify from '../../../../components/SubMenuClassify';
import { useDispatch, useSelector } from 'react-redux';
import { fetchListClassify } from '../../slices/chatSlice';
import './style.css';

ConversationContainer.propTypes = {
  valueClassify: PropTypes.string.isRequired,
};

ConversationContainer.defaultProps = {
  valueClassify: '',
};

function ConversationContainer({ valueClassify, onClickConver }) {
  const { classifies } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.global);
  const dispatch = useDispatch();

  const conversations = [
    // {
    //   _id: "1",
    //   name: "Chat with John",
    //   avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9hpzixE9DE1tN4a_GotY0lJ6momghbn34qw&s",
    //   numberUnread: 2,
    //   lastMessage: {
    //     type: "TEXT",
    //     createdAt: "24/02/2025",
    //     content: "Hey, how are you?",
    //     isDeleted: false,
    //     user: {
    //       _id: "67a1e5f176cee437d04f864e",
    //       name: "John Doe"
    //     }
    //   },
    //   totalMembers: 2,
    //   avatarColor: "#FF5733",
    //   members: ["67a1e5f176cee437d04f864e", "67a3268350b61933ace49879"],
    //   leaderId: "67a1e5f176cee437d04f864e",
    //   type: true
    // },
    // {
    //   _id: "2",
    //   name: "Project Group",
    //   avatar: "https://png.pngtree.com/element_our/png_detail/20180904/group-avatar-icon-design-vector-png_75950.jpg",
    //   numberUnread: 5,
    //   lastMessage: {
    //     type: "IMAGE",
    //     createdAt: "24/02/2025",
    //     content: "https://example.com/image.jpg",
    //     isDeleted: false,
    //     user: {
    //       _id: "67a3268350b61933ace49879",
    //       name: "Alice Smith"
    //     }
    //   },
    //   totalMembers: 3,
    //   avatarColor: "#33FF57",
    //   members: ["67a1e5f176cee437d04f864e", "67a3268350b61933ace49879", "67a1e5f176cee437d04f1234"],
    //   leaderId: "67a3268350b61933ace49879",
    //   type: true
    // },
    // {
    //   _id: "3",
    //   name: "Personal Notes",
    //   avatar: "https://static.vecteezy.com/system/resources/thumbnails/043/015/172/small_2x/a-group-of-people-in-a-circle-with-circles-around-them-vector.jpg",
    //   numberUnread: 0,
    //   lastMessage: {
    //     type: "TEXT",
    //     createdAt: "24/02/2025",
    //     content: "Remember to buy groceries.",
    //     isDeleted: true,
    //     user: {
    //       _id: "67a1e5f176cee437d04f864e",
    //       name: "John Doe"
    //     }
    //   },
    //   totalMembers: 1,
    //   avatarColor: "#4287f5",
    //   members: ["67a1e5f176cee437d04f864e"],
    //   leaderId: "67a1e5f176cee437d04f864e",
    //   type: false
    // },
    // {
    //   _id: "4",
    //   name: "Work Tasks",
    //   avatar: "https://via.placeholder.com/150",
    //   numberUnread: 1,
    //   lastMessage: {
    //     type: "TEXT",
    //     createdAt: "24/02/2025",
    //     content: "Finish the report by 5 PM.",
    //     isDeleted: false,
    //     user: {
    //       _id: "67a3268350b61933ace49879",
    //       name: "Alice Smith"
    //     }
    //   },
    //   totalMembers: 1,
    //   avatarColor: "#f5a142",
    //   members: ["67a3268350b61933ace49879"],
    //   leaderId: "67a3268350b61933ace49879",
    //   type: false
    // },
    // {
    //   _id: "5",
    //   name: "Daily Journal",
    //   avatar: "https://via.placeholder.com/150",
    //   numberUnread: 0,
    //   lastMessage: {
    //     type: "IMAGE",
    //     createdAt: "24/02/2025",
    //     content: "https://example.com/journal-entry.jpg",
    //     isDeleted: true,
    //     user: {
    //       _id: "67a1e5f176cee437d04f864e",
    //       name: "John Doe"
    //     }
    //   },
    //   totalMembers: 1,
    //   avatarColor: "#42f54e",
    //   members: ["67a1e5f176cee437d04f864e"],
    //   leaderId: "67a1e5f176cee437d04f864e",
    //   type: false
    // }
  ];

  const tempClassify =
    classifies.find((ele) => ele._id === valueClassify) || 0;

  const checkConverInClassify = (idMember) => {
    if (tempClassify === 0) return true;
    const index = tempClassify.conversationIds.findIndex(
      (ele) => ele === idMember
    );
    return index > -1;
  };

  const handleOnClickItem = (e, id) => {
    if (e.key === '1') {
      confirm(id);
    }
  };
  const deleteConver = async (id) => {
    try {
      await conversationApi.deleteConversation(id);
      message.success('Xóa thành công');
    } catch (error) {
      message.error('Đã có lỗi xảy ra');
    }
  };
  const handleConversationClick = async (conversationId) => {
    // dispatch(setCurrentConversation(conversationId));

    dispatch(setCurrentChannel(''));
    dispatch(getLastViewOfMembers({ conversationId }));
    // dispatch(fetchListMessages({ conversationId, size: 10 }));

    dispatch(getMembersConversation({ conversationId }));
    dispatch(setTypeOfConversation(conversationId));
    dispatch(fetchChannels({ conversationId }));
  };
  function confirm(id) {
    Modal.confirm({
      title: 'Xác nhận',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          Toàn bộ nội dung cuộc trò chuyện sẻ bị xóa, bạn có chắc chắn
          muốn xóa ?
        </span>
      ),
      okText: 'Xóa',
      cancelText: 'Không',
      onOk: () => {
        // deleteConver(id);
        console.log('Xóa cuộc trò chuyện');

      },
    });
  }

  return (
    <div id="conversation-main">
      <ul className="list_conversation">
        {conversations.map((conversation, index) => (
          <li
            key={index}
            className={`conversation-item ${conversation.numberUnread > 0 ? 'arrived-message' : ''}`}
          >
            <Dropdown
              menu={{
                items: [
                  {
                    label: <SubMenuClassify data={classifies} />,
                    key: 'classify',
                  },
                  ...(user?._id === conversation.leaderId
                    ? [
                      {
                        label: 'Xoá hội thoại',
                        key: '1',
                        icon: <DeleteFilled />,
                        danger: true,
                      },
                    ]
                    : []),
                ],
                onClick: (e) => handleOnClickItem(e, conversation._id),
              }}
              trigger={['contextMenu']}
            >
              <div>
                <ConversationSingle
                  conversation={conversation}
                  onClick={
                    // handleConversationClick(conversation._id)
                    () => console.log('Đã click vào cuộc trò chuyện này')
                  }
                />
              </div>
            </Dropdown>
          </li>
        ))}
      </ul>
    </div>
  );


}

export default ConversationContainer;
