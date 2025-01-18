import MessageList from '../../components/mainComponents/MessageList';
import Sidebar from '../../components/mainComponents/Sidebar';
import WelcomeScreen from '../../components/mainComponents/WelcomeScreen';
import './MainPage.css';
const MainPage = () => {
    return (
        <div className='mainpage'>
            <Sidebar />
            <MessageList />
            <WelcomeScreen />
        </div>
    )
}

export default MainPage