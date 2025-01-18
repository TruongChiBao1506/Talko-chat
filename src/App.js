import './App.css';
import Login from './screen/auth/Login/Login';
import Register from './screen/auth/Register/register';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ForgotPassword from './screen/auth/ForgotPassword/ForgotPassword';
import PasswordRecovery from './screen/auth/PasswordRecovery/PasswordRecovery';
import MainPage from './screen/mainScreen/MainPage';
function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Login/>}/>
        <Route path='/register' element={<Register/>}/>
        <Route path='/forgotpassword' element={<ForgotPassword/>}/>
        <Route path='/main' element={<MainPage/>}/>
        <Route path='/password-recovery' element={<PasswordRecovery/>}/>
      </Routes>
    </Router>
  );
}


export default App;
