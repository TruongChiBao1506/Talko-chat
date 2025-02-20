import { useEffect, useState } from 'react'
import './PasswordRecovery.css'
import Button from '../../../components/buttonComponent/Button';
import Input from '../../../components/inputComponent/Input';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setLoading } from '../authSlice';
import { message } from 'antd';
import authApi from '../../../apis/authApi';

export default function PasswordRecovery() {
    const [activationCode, setActivationCode] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [timer, setTimer] = useState(60);
    const [isResendEnabled, setIsResendEnabled] = useState(false);
    const location = useLocation();
    const account = location.state?.account || '';
    const dispatch = useDispatch();
    const navigate = useNavigate();
    useEffect(() => {
        document.title = 'Khôi phục mật khẩu - Talko Chat'
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
        await authApi.resetOtp(username)
            .then(() => {
                message.success('mã Otp đã được gửi lại');
                setTimer(60);
                setIsResendEnabled(false);
            })
    }
    const handleSubmit = async (username, otp, password) => {
        // Handle form submission
        dispatch(setLoading(true));
        console.log('Form submitted')
        if(password !== confirmPassword){
            dispatch(setLoading(false));
            message.error('Mật khẩu không khớp');
            return;
        }
        else{
            await authApi.confirmPassword(username, otp, password)
            .then(()=>{
                dispatch(setLoading(false));
                message.success('Khôi phục mật khẩu thành công');
                navigate('/auth/login',{state:{account:username}}); // Redirect to login page
            })
            .catch((err)=>{
                dispatch(setLoading(false));
                message.error('Khôi phục mật khẩu thất bại');
            })
        }
        
    }

    return (
        <div className="recovery-container">
            <div className="recovery-card">
                <div className="recovery-header">
                    <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" style={{ width: "100px", height: "100px" }} />
                    <h1>Khôi phục mật khẩu Talko</h1>
                </div>

                <form onSubmit={(e)=>{e.preventDefault(); handleSubmit(account, activationCode, password)}} className="recovery-form">
                    <div className="activation-section">
                        <p>Mã kích hoạt đã được gửi đến số điện thoại:</p>
                        <Input type='number'
                            placeholder='Nhập mã kích hoạt'
                            value={activationCode} onChange={(value) => setActivationCode(value)} style={{ textAlign: "center" }} />
                        {isResendEnabled && <a href="#" className="resend-link" onClick={(e) => {
                            e.preventDefault();
                            handleResendCode(account);
                        }}>
                            Nhận lại mã kích hoạt
                        </a>}

                    </div>

                    <div className="password-section">
                        <div className="password-input-container">
                            <Input type='password'
                                placeholder='Nhập mật khẩu mới'
                                value={password} onChange={(value) => setPassword(value)} />
                        </div>
                        <div className="password-input-container">
                            <Input type='password'
                                placeholder='Nhập lại mật khẩu mới'
                                value={confirmPassword} onChange={(value) => setConfirmPassword(value)} />
                        </div>
                    </div>

                    <Button className="button-primary" type="submit" children="Xác nhận" />

                    <p className="timer-text">
                        Bạn sẽ nhận được mã kích hoạt trong {timer} giây
                    </p>
                </form>
            </div>
        </div>
    )
}

