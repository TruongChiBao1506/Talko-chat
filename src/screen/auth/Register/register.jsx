import { Link } from 'react-router-dom'
import './register.css'
import { useEffect, useState } from 'react'
import Input from '../../../components/inputComponent/Input';
import Button from '../../../components/buttonComponent/Button';

export default function RegisterPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  useEffect(() => {
      document.title = "Đăng ký - Talko Chat";
    }, []);
  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle registration logic here
    console.log('Registration attempt with:', { phoneNumber, password, confirmPassword, name })
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <img src={require('../../../assets/images/Talko_Logo.png')} alt='Talko Logo' style={{width:"100px", height:"100px"}}/>
        <p className="subtitle">
          Đăng ký tài khoản Talko để kết nối với bạn bè
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Họ và tên</label>
            <Input type="text" placeholder="Nhập họ và tên của bạn" value={name} onChange={setName} />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <Input type="tel" placeholder="94344xxxx" value={phoneNumber} onChange={setPhoneNumber} />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <Input type="password" placeholder="Nhập mật khẩu" value={password} onChange={setPassword} />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <Input type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={setConfirmPassword} />
          </div>

          <div className="terms">
            <p>
              Bằng cách nhấn vào Đăng ký, bạn đồng ý với{' '}
              <a href="/" className="terms-link">Điều khoản sử dụng</a> của Talko
            </p>
          </div>

          <Button className="button-primary" type="submit" children="Đăng ký"/>
        </form>

        <p className="login-prompt">
          Bạn đã có tài khoản?  <Link to="/">Đăng nhập ngay!</Link>
        </p>
      </div>
    </div>
  )
}

