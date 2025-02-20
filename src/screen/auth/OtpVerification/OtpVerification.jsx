import { useEffect, useState } from 'react'
import './OtpVerification.css'
import Button from '../../../components/buttonComponent/Button';
import Input from '../../../components/inputComponent/Input';
import { useLocation, useNavigate } from 'react-router-dom';
import authApi from '../../../apis/authApi';
import {message} from 'antd';
import { useDispatch } from "react-redux";
import {setLoading} from '../authSlice';

export default function OtpVerification() {
    const [OtpCode, setOtpCode] = useState('')
    const [timer, setTimer] = useState(60);
    const [isResendEnabled, setIsResendEnabled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const account = location.state?.account || '';
    const dispatch = useDispatch();
    useEffect(() => {
        document.title = 'Xác thực OTP - Talko Chat'
    }, [])
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
            return () => clearInterval(interval)
        } else {
            setIsResendEnabled(true);
        }
    }, [timer]);
    const handleResendCode = async (username) => {
        console.log('Yêu cầu gửi lại mã kích hoạt...');
        const res = await authApi.resetOtp(username);
        if(res){
            message.success('mã Otp đã được gửi lại');
        }
        setTimer(60);
        setIsResendEnabled(false);
    }
    const handleSubmit = async (e) => {
        e.preventDefault()
        // Handle form submission
        dispatch(setLoading(true));
        const regex = /^[0-9]{6}$/g;
        if(!regex.test(OtpCode)){
            dispatch(setLoading(false));
            message.error('Mã OTP không hợp lệ');
            return;
        }
        console.log('Form submitted: ', OtpCode);
        await authApi.confirmAccount(account, OtpCode)
        .then(()=>{
            dispatch(setLoading(false));
            message.success('Xác thực thành công');
            navigate('/auth/login',{state:{account:account}}); // Redirect to login page
            
        })
        .catch((err)=>{
            dispatch(setLoading(false));
            message.error('Xác thực thất bại');
            return;
        })

    }

    return (
        <div className="recovery-container">
            <div className="recovery-card">
                <div className="recovery-header">
                    <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" style={{ width: "100px", height: "100px" }} />
                    <h1>Khôi phục mật khẩu Talko</h1>
                </div>

                <form onSubmit={handleSubmit} className="recovery-form">
                    <div className="activation-section">
                        <p>Mã OTP đã gửi đến {account}</p>
                        <Input type='number'
                            placeholder='Nhập mã kích hoạt'
                            value={OtpCode} onChange={(value) => setOtpCode(value)} style={{ textAlign: "center" }} />
                        {isResendEnabled && <a href='#' className="resend-link" onClick={(e)=>{
                            e.preventDefault();
                            handleResendCode(account)}}>
                            Nhận lại mã Otp
                        </a>}
                    </div>
                    <Button className="button-primary" type="submit" children="Xác nhận" />

                    <p className="timer-text">
                        Bạn sẽ nhận được mã OTP trong {timer} giây
                    </p>
                </form>
            </div>
        </div>
    )
}

