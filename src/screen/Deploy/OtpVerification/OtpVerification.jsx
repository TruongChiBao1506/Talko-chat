import { useEffect, useRef, useState } from 'react';
import './OtpVerification.css';
import Button from '../../../components/buttonComponent/Button';
import { useLocation, useNavigate } from 'react-router-dom';
import authApi from '../../../apis/authApi';
import { message } from 'antd';
import { useDispatch } from 'react-redux';
import { setLoading } from '../authSlice';

export default function OtpVerification() {
  const [OtpCode, setOtpCode] = useState(Array(6).fill(''));
  const inputsRef = useRef([]);
  const length = 6;
  const [timer, setTimer] = useState(60);
  const [isResendEnabled, setIsResendEnabled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const account = location.state?.account || '';
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Xác thực OTP - Talko Chat';
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setIsResendEnabled(true);
    }
  }, [timer]);

  const handleResendCode = async (username) => {
    console.log('Yêu cầu gửi lại mã kích hoạt...');
    const res = await authApi.resetOtp(username);
    if (res) {
      message.success('Mã OTP đã được gửi lại');
    }
    setTimer(60);
    setIsResendEnabled(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(setLoading(true));
    const otpString = OtpCode.join('');
    const regex = /^[0-9]{6}$/;
    if (!regex.test(otpString)) {
      dispatch(setLoading(false));
      message.error('Mã OTP không hợp lệ');
      return;
    }
    console.log('Form submitted: ', otpString);
    await authApi
      .confirmAccount(account, otpString)
      .then(() => {
        dispatch(setLoading(false));
        message.success('Xác thực thành công');
        navigate('/auth/login', { state: { account: account } });
      })
      .catch((err) => {
        dispatch(setLoading(false));
        message.error('Xác thực thất bại');
        return;
      });
  };

  const handleChange = (e, index) => {
    const value = e.target.value; // Sử dụng e.target.value vì đây là thẻ <input> gốc
    if (!/^[0-9]*$/.test(value)) return; // Chỉ cho phép số
    const newOtpCode = [...OtpCode];
    newOtpCode[index] = value.slice(-1); // Lấy ký tự cuối cùng
    setOtpCode(newOtpCode);
    if (value && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1].focus(); // Chuyển focus sang ô tiếp theo
    }
    if (value.length === 0 && index > 0) {
      inputsRef.current[index - 1].focus(); // Chuyển focus về ô trước đó
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !OtpCode[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e, index) => {
    const pasteData = e.clipboardData.getData('text').slice(0, length);
    if (!/^[0-9]*$/.test(pasteData)) return;
    const newOtpCode = pasteData.split('').concat(Array(length - pasteData.length).fill(''));
    setOtpCode(newOtpCode);
    inputsRef.current[length - 1].focus();
  };

  return (
    <div className="recovery-container">
      <div className="recovery-card">
        <div className="recovery-header">
          <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" style={{ width: '100px', height: '100px' }} />
          <h1>Khôi phục mật khẩu Talko</h1>
        </div>

        <form onSubmit={handleSubmit} className="recovery-form">
          <div className="activation-section">
            <p>Mã OTP đã gửi đến {account}</p>
            <div className="otp-inputs">
              {OtpCode.map((value, index) => (
                <input
                  key={index}
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  ref={(el) => (inputsRef.current[index] = el)}
                  className="otp-input"
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>
          <Button className="button-primary" type="submit" children="Xác nhận" />
          <p className="timer-text">
            Bạn sẽ nhận được mã OTP trong {timer} giây
          </p>
          {isResendEnabled && (
            <Button
              className="button-secondary"
              onClick={() => handleResendCode(account)}
              children="Gửi lại mã"
            />
          )}
        </form>
      </div>
    </div>
  );
}