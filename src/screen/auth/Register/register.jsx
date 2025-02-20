import { Link, useNavigate } from 'react-router-dom'
import './register.css'
import { useEffect, useState } from 'react'
import Input from '../../../components/inputComponent/Input';
import Button from '../../../components/buttonComponent/Button';
import authApi from '../../../apis/authApi';
import { useDispatch } from "react-redux";
import {setLoading} from '../authSlice';

export default function RegisterPage() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Đăng ký - Talko Chat";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!name || !account || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password.length < 8 || password.length > 50) {
      setError('Mật khẩu phải có độ dài từ 8 đến 50 ký tự');
      return;
    }
    if (!regexPassword.test(password)) {
      setError('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }
    await authApi.fetchUser(account)
      .then(
        (res) => {
          console.log('Email hoặc số điện thoại đã được đăng ký');
          setError('Số điện thoại đã tồn tại');
          return;
        }
      )
      .catch(async () => {
        console.log('Số điện thoại chưa được đăng ký');
        dispatch(setLoading(true));
        const res = await authApi.registry(name, account, password);
        if (res) {
          console.log('Đăng ký thành công');
          dispatch(setLoading(false));
          navigate('/auth/register/otp-verification', { state: { account: account } });
        }
        else {
          console.log('Đăng ký thất bại');
          dispatch(setLoading(false));
          navigate('/auth/register');
        }
      })
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <img src={require('../../../assets/images/Talko_Logo.png')} alt='Talko Logo' style={{ width: "100px", height: "100px" }} />
        <p className="subtitle">
          Đăng ký tài khoản Talko để kết nối với bạn bè
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Họ và tên</label>
            <Input type="text" placeholder="Nhập họ và tên của bạn" value={name} onChange={(value)=>setName(value)} />
          </div>

          <div className="form-group">
            <label>Tài khoản</label>
            <Input type="text" placeholder="Email hoặc số điện thoại" value={account} onChange={(value)=>setAccount(value)} />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <Input type="password" placeholder="Nhập mật khẩu" value={password} onChange={(value)=>setPassword(value)} />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <Input type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(value)=>setConfirmPassword(value)} />
          </div>
          {error && <p className="error-text" style={{ color: "red" }}>{error}</p>}
          <div className="terms">
            <p>
              Bằng cách nhấn vào Đăng ký, bạn đồng ý với{' '}
              <Link to="/auth/terms-of-use" className="terms-link">Điều khoản sử dụng</Link> của Talko
            </p>
          </div>

          <Button className="button-primary" type="submit" children="Đăng ký" />
        </form>

        <p className="login-prompt">
          Bạn đã có tài khoản?  <Link to="/auth/login">Đăng nhập ngay!</Link>
        </p>
      </div>
    </div>
  )
}

