import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

JoinFromLink.propTypes = {

};

function JoinFromLink(props) {
    const { conversationId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (conversationId) {
            navigate('/chat', {
                state: { conversationId },
                replace: true 
            });
        } else {
            // Nếu không có conversationId, về trang chủ
            navigate('/home', { replace: true });
        }
    }, [conversationId, navigate]);

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column'
        }}>
            <Spin 
                indicator={<LoadingOutlined style={{ fontSize: 24 }} />} 
                tip="Đang chuyển hướng..."
            />
            <div style={{ marginTop: 16 }}>
                Conversation ID: {conversationId}
            </div>
        </div>
    );
}

export default JoinFromLink;