import React from 'react';
import './WelcomeScreen.css';
import Button from '../buttonComponent/Button';

function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1>Chào mừng đến với<br />Talko Web!</h1>
        <p>
          Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân,
          bạn bè được tối ưu hoá cho máy tính của bạn.
        </p>
        {/* <button className="start-button">Bắt đầu khám phá</button> */}
        <Button className="button-primary" type="button" children="Bắt đầu khám phá" style={{width: '50%', borderRadius: '50px', padding :'12px 24px', transition:'background-color 0.3s'}}/>
      </div>
      <div className="feature-icons">
        {[1, 2, 3].map((i) => (
          <div key={i} className="feature-icon">
            <img
              src={`/placeholder.svg?height=40&width=40&text=F${i}`}
              alt={`Feature ${i}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default WelcomeScreen;

