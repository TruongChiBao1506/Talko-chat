import MessageList from '../../components/mainComponents/MessageList';
// import Sidebar from '../../components/mainComponents/Sidebar';
import WelcomeScreen from '../../components/mainComponents/WelcomeScreen';
import NavbarContainer from '../Chat/containers/NavbarContainer';
import './MainPage.css';
const MainPage = () => {
    return (
        <div className='mainpage'>
            {/* <Sidebar /> */}
            <NavbarContainer />
            <MessageList />
            <WelcomeScreen />
        </div>
    )
}

export default MainPage