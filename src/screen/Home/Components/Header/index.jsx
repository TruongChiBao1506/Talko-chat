import React from 'react'
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom'

const Header = () => {
  const { user, isLogin } = useSelector((state) => state.global);
  console.log(user);
  console.log(isLogin);
  return (
    <header className="header">
      <div className="logo">
        <img src={require('../../../../assets/images/Talko_Logo.png')}
          alt="Talko Logo"
          style={{ width: "80px", height: "80px" }} />
      </div>
      <nav className="main-nav">
        <ul>
          <li>
            <a href="#features">Tính năng</a>
          </li>
          <li>
            <a href="#about">Về ứng dụng</a>
          </li>
          <li>
            <a href="#developer">Nhà phát triển</a>
          </li>
          <li>
            <a href="#contact">Liên hệ</a>
          </li>
          {isLogin ? (
            <li>
              <p>{user?.name}</p>
            </li>
          ) : (
          <>
            <li>
              <Link className='login' to="/auth/login">Đăng nhập</Link>
            </li>
            <li>
              <Link className='register' to="/auth/register">Đăng ký</Link>
            </li>
          </>
          )}

        </ul>
      </nav>
    </header>
  )
}

export default Header

