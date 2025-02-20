import { Spin } from 'antd';

import {Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './Login/Login';
import RegisterPage from './Register/register';
import PasswordRecovery from './PasswordRecovery/PasswordRecovery';
import ForgotPassword from './ForgotPassword/ForgotPassword';
import OtpVerification from './OtpVerification/OtpVerification';
import TermsOfUse from './TermsOfUse/TermsOfUse';
import { LoadingOutlined } from '@ant-design/icons';
const Auth = () => {
    const { isLoading } = useSelector(state => state.auth);
    return (
        <Spin indicator={<LoadingOutlined style={{fontSize : 38}}/>} spinning={isLoading}>
            <Routes>
                <Route path='login' element={<Login />} />
                <Route path='register' element={<RegisterPage />} />
                <Route path='forgotpassword' element={<ForgotPassword />} />
                <Route path='password-recovery' element={<PasswordRecovery />} />
                <Route path='register/otp-verification' element={<OtpVerification />} />
                <Route path='terms-of-use' element={<TermsOfUse />} />
            </Routes>
        </Spin>
    );
}
export default Auth;