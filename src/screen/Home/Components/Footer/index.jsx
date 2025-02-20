import React from 'react'

const Footer = () => {
  return (
    <footer id="contact" className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Liên hệ</h3>
          <p>Email: support@Talko.me</p>
          <p>Điện thoại: 1900 561 558</p>
        </div>
        <div className="footer-section">
          <h3>Theo dõi chúng tôi</h3>
          <div className="social-icons">
            <a href="#">
              <img
                src={require('../../../../assets/images/facebook.png')}
                alt="Facebook"
              />
            </a>
            <a href="#">
              <img
                src={require('../../../../assets/images/twitter.png')}
                alt="Twitter"
              />
            </a>
            <a href="#">
              <img
                src={require('../../../../assets/images/instagram.png')}
                alt="Instagram"
              />
            </a>
          </div>
        </div>
      </div>
      <div className="copyright">© 2025 Talko. Tất cả quyền được bảo lưu.</div>
    </footer>
  )
}

export default Footer

