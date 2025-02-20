import React from 'react'

const AboutWebApp = () => {
  return (
    <section id="about" className="about-webapp">
      <div className='content'>
        <h2>Về Talko</h2>
        <p>
          Talko là ứng dụng nhắn tin đa nền tảng được phát triển bởi Nhóm . Với hơn 10 người dùng, Zalo là
          ứng dụng OTT đang được phát triển.
        </p>
        <div className="download-options">
          <a href="#" className="download-button">
            <img
              src={require('../../../../assets/images/android.png')}
              alt="Android"
            />
            Android
          </a>
          <a href="#" className="download-button">
            <img
              src={require('../../../../assets/images/apple.png')}
              alt="iOS"
            />
            iOS
          </a>
          <a href="#" className="download-button">
            <img
              src={require('../../../../assets/images/screen.png')}
              alt="PC"
            />
            PC
          </a>
        </div>
      </div>

    </section>
  )
}

export default AboutWebApp

