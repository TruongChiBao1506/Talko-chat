import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Row, Col, Divider } from "antd";
import conversationApi from '../../apis/conversationApi';
import NavbarContainer from "./containers/NavbarContainer";
import SearchContainer from "./containers/SearchContainer";
import WelcomeScreen from "../../components/mainComponents/WelcomeScreen";
import FilterContainer from '../Chat/components/FilterContainer';
import ConversationContainer from "./containers/ConversationContainer";
import { useDispatch, useSelector } from "react-redux";
import { fetchListClassify, fetchListColor, fetchListFriends } from './slices/chatSlice';
import {fetchUserProfile} from '../../redux/globalSlice';
import './style.css';

Chat.propTypes = {
    socket: PropTypes.object,
    idNewMessage: PropTypes.string,
};

function Chat({ socket = {}, idNewMessage = '' }) {
    const {
        conversations,
        currentConversation,
        isLoading,
        currentChannel,
        channels,
    } = useSelector((state) => state.chat)
    const { isJoinChatLayout, isJoinFriendLayout, user } = useSelector(
        (state) => state.global);
    const [valueClassify, setValueClassify] = useState("0");
    const [valueInput, setValueInput] = useState('');
    const [visibleFilter, setVisbleFilter] = useState(false);
    const [singleConverFilter, setSingleConverFilter] = useState([]);
    const [mutipleConverFilter, setMutipleConverFilter] = useState([]);
    const [isOpenInfo, setIsOpenInfo] = useState(true);
    const dispatch = useDispatch();
    const refCurrentConversation = useRef();
    const refConversations = useRef();
    const refCurrentChannel = useRef();

    useEffect(() => {
        dispatch(
            fetchListFriends({
                name: '',
            })
        );
        dispatch(fetchUserProfile());
        dispatch(fetchListClassify());
        dispatch(fetchListColor());
    }, []);
    
    
    //

    //Get Clientwidth

    useEffect(() => {
        refCurrentConversation.current = currentConversation;
    }, [currentConversation]);

    useEffect(() => {
        refConversations.current = conversations;
    }, [conversations]);

    useEffect(() => {
        refCurrentChannel.current = currentChannel;
    }, [currentChannel]);
    const handleOnFilterClassfiy = (value) => {
        setValueClassify(value);
    };
    const handleOnSubmitSearch = async () => {
        console.log('valueInput', valueInput);
        
        try {
            const single = await conversationApi.fetchListConversations(
                valueInput,
                1
            );
            setSingleConverFilter(single);
            const mutiple = await conversationApi.fetchListConversations(
                valueInput,
                2
            );
            setMutipleConverFilter(mutiple);
        } catch (error) { }
    };
    const handleOnVisibleFilter = (value) => {
        if (value.trim().length > 0) {
            setVisbleFilter(true);
        } else {
            setVisbleFilter(false);
        }
    };
    const handleOnSearchChange = (value) => {
        setValueInput(value);
        handleOnVisibleFilter(value);
    };
    return (
        <div id="main-chat-wrapper">
            <Row gutter={[0, 0]}>
                <Col
                    span={8}
                    xs={{ span: 19 }}
                    sm={{ span: 19 }}
                    md={{ span: 10 }}
                    lg={{ span: 9 }}
                    xl={{ span: 7 }}
                >
                    <div className="main-conversation">
                        <div className="main-conversation_search-bar">
                            <SearchContainer
                                valueClassify={valueClassify}
                                onFilterClasify={handleOnFilterClassfiy}
                                valueText={valueInput}
                                onSubmitSearch={handleOnSubmitSearch}
                                onSearchChange={handleOnSearchChange} />

                        </div>

                        {visibleFilter ? (
                            <FilterContainer dataMutiple={mutipleConverFilter} dataSingle={singleConverFilter}/>
                        ) : (
                            <>
                                <Divider style={{ margin: "0px 0px" }} />
                                <div className="main-conversation_list-conversation">
                                    <ConversationContainer valueClassify={valueClassify}/>
                                </div>

                            </>)}
                    </div>
                </Col>
                <Col
                    span={17}
                    xs={{ span: 0 }}
                    sm={{ span: 0 }}
                    md={{ span: 12 }}
                    lg={{ span: 14 }}
                    xl={{ span: 17 }}
                >
                    <div className="welcome-screen">
                        <WelcomeScreen />
                    </div>

                </Col>
            </Row>
        </div>
    )
};
export default Chat;