import React from 'react'

const Features = () => {
  return (
    <section id="features" className="features">
      <h2>Tính năng nổi bật</h2>
      <div className="feature-list">
        <div className="feature-item">
          <img
            src={require('../../../../assets/images/message.png')}
            alt="Nhắn tin"
          />
          <h3>Nhắn tin</h3>
          <p>Gửi tin nhắn văn bản, hình ảnh, video một cách nhanh chóng</p>
        </div>
        <div className="feature-item">
          <img
            src={require('../../../../assets/images/phone.png')}
            alt="Gọi điện"
          />
          <h3>Gọi điện</h3>
          <p>Cuộc gọi âm thanh và video chất lượng cao</p>
        </div>
        <div className="feature-item">
          <img
            src={require('../../../../assets/images/group.png')}
            alt="Nhóm"
          />
          <h3>Nhóm</h3>
          <p>Tạo và quản lý các nhóm chat dễ dàng</p>
        </div>
      </div>
    </section>
  )
}

export default Features

