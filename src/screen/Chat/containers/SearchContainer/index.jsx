import { AlignLeftOutlined, AppstoreAddOutlined, SearchOutlined, UserAddOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { Input, message, Radio } from 'antd';
import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Scrollbars from 'react-custom-scrollbars-2';
import ModalAddFriend from '../../../../modals/ModalAddFriend';
import ModalCreateGroup from '../../../../modals/ModalCreateGroup';
import './style.css';
SearchContainer.propTypes = {
    onVisibleFilter: PropTypes.func,
    onSearchChange: PropTypes.func,
    valueText: PropTypes.string,
    onSubmitSearch: PropTypes.func,
    isFriendPage: PropTypes.bool,
    onFilterClasify: PropTypes.func,
    valueClassify: PropTypes.string.isRequired,
};
function SearchContainer ({ valueText='', onSearchChange=null, onSubmitSearch=null, isFriendPage=false, onFilterClasify=null, valueClassify }) {
    const [visibleModalAddFriend, setVisibleModalAddFriend] = useState(false);
    const [visibleModalCreateGroup, setVisibleModalCreateGroup] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [visibleModalClassify, setVisibleModalClassify] = useState(false);
    const [userIsFind, setUserIsFind] = useState({});
    const refDebounce = useRef(null);

    const handleOpenModalClassify = () => {
        setVisibleModalClassify(true);
    }
    const handleCloseModalClassify = () => {
        setVisibleModalClassify(false);
    }
    const handleOnChange = (e) => {
        const value = e.target.value;
        console.log('value', value);
        if(onFilterClasify){
            onFilterClasify(value);
        }
        
    }

    const handleOpenModalAddFriend = ()=>{
        setVisibleModalAddFriend(true);
    }
    const handCloseModalAddFriend = ()=>{
        setVisibleModalAddFriend(false);
    }
    const handleFindUser = (value) => {
        try{
            const user = value;
            console.log('user', user);
            setUserIsFind(user);
            setVisibleModalAddFriend(false);
        }catch(err){
            message.error('Không tìm thấy người dùng');
        }
       

    }
    const handOnSearchUser = (value) => {
        handleFindUser(value);
    }
    const handOnEnter = (value) => {
        handleFindUser(value);
    };
    const handleOpenModalCreateGroup = ()=>{
        setVisibleModalCreateGroup(true);
    }

    const handleCloseModalCreateGroup = ()=>{
        setVisibleModalCreateGroup(false);
    }

    const handleInputChange = (e) => {
        const value = e.target.value;
        if(onSearchChange){
            onSearchChange(value);
        }
        if(refDebounce.current){
            clearTimeout(refDebounce.current);
        }
        refDebounce.current = setTimeout(() => {
            if(onSubmitSearch){
                onSubmitSearch(value);
            }
        }, 400);
    }

    return (
        <div id='search-wrapper'>
            <div className="search-main">
                <div className="search-top">
                    <div className="search-top_input-search">
                        <Input
                        placeholder='Tìm kiếm'
                        prefix = {<SearchOutlined/>}
                        onChange={handleInputChange}
                        value={valueText}
                        allowClear/>
                    </div>
                    <div className="search-top_add-friend" onClick={handleOpenModalAddFriend}>
                        <UserAddOutlined/>
                    </div>
                    <div className="search-top_create-group" onClick={handleOpenModalCreateGroup}>
                        <UsergroupAddOutlined color='#5c7795'/>
                    </div>
                </div>
                {!isFriendPage &&(
                    <>
                        {!(valueText.length > 0) && (
                            <div className="search-bottom">
                                <div className='classify-title'>
                                    <div>
                                        <AlignLeftOutlined style={{marginRight:'10px'}}/>  
                                        <span>Phân loại</span>
                                    </div>
                                    <div className='add-classify' onClick={handleOpenModalClassify}>
                                        <AppstoreAddOutlined />
                                    </div>
                                </div>
                                <div className='classify-element'>
                                    <Scrollbars
                                    autoHide = {true}
                                    autoHideTimeout={1000}
                                    autoHideDuration={200}
                                    style={{height: '42px', width: '100%'}}>
                                        <Radio.Group size='small'>
                                            <Radio value={'0'}>Tất cả</Radio>
                                        </Radio.Group>

                                    </Scrollbars>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <ModalAddFriend 
            isVisible={visibleModalAddFriend}
            onCancel={handCloseModalAddFriend}
            onSearch={handOnSearchUser}
            onEnter={handOnEnter}/>

            <ModalCreateGroup 
            isVisible={visibleModalCreateGroup}
            onCancel={handleCloseModalCreateGroup}
            onOk={handleCloseModalCreateGroup}
            loading={confirmLoading}/>
        </div>
    )
};
export default SearchContainer;