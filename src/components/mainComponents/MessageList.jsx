import React from 'react';
import './MessageList.css';
import SearchContainer from '../../screen/Chat/containers/SearchContainer';
function MessageList() {
  return (
    <div className="message-list">
      <SearchContainer valueClassify='0'/>
      <div className="message-items">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="message-item">
            <div className="message-avatar">
              <img src={`/placeholder.svg?height=48&width=48&text=U${i}`} alt={`User ${i}`} />
            </div>
            <div className="message-content">
              <h3>User {i}</h3>
              <p>Tin nhắn mới nhất...</p>
            </div>
            <div className="message-time">{i * 5} phút</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MessageList;

