import Channel from "screen/Chat/components/Channel";
import AnotherSetting from "screen/Chat/components/AnotherSetting";
import ArchiveFile from "screen/Chat/components/ArchiveFile";
import ArchiveMedia from "screen/Chat/components/ArchiveMedia";
import InfoFriendSearch from "screen/Chat/components/InfoFriendSearch";
import InfoMediaSearch from "screen/Chat/components/InfoMediaSearch";
import InfoMember from "screen/Chat/components/InfoMember";
import InfoNameAndThumbnail from "screen/Chat/components/InfoNameAndThumbnail";
import InfoTitle from "screen/Chat/components/InfoTitle";
import { fetchAllMedia } from "screen/Chat/slice/mediaSlice";
import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import UserCard from "components/UserCard";
import "./style.scss";
import userApi from "api/userApi";

InfoContainer.propTypes = {
  socket: PropTypes.object,
  onViewChannel: PropTypes.func,
  onOpenInfoBlock: PropTypes.func,
};

InfoContainer.defaultProps = {
  socket: {},
  onViewChannel: null,
  onOpenInfoBlock: null,
};

function InfoContainer({ socket, onViewChannel, onOpenInfoBlock }) {
  const [isFind, setFind] = useState({ tapane: 0, view: 0 });
  const {
    memberInConversation,
    type,
    currentConversation,
    conversations,
    channels,
  } = useSelector((state) => state.chat);
  const { media } = useSelector((state) => state.media);
  const [isVisible, setIsVisible] = useState(false);
  const [userChose, setUserChose] = useState(null);
  const dispatch = useDispatch();

  const handleChoseUser = async (value) => {
    const user = await userApi.fetchUser(value.username);
    setUserChose(user);
    setIsVisible(true);
  };

  const handleViewMemberClick = (value) => {
    setFind({ view: value, tabpane: 0 });
  };

  const handleViewMediaClick = (value, tabpane) => {
    setFind({ view: value, tabpane });
  };

  const handleOnBack = (value) => {
    setFind({ view: value, tabpane: 0 });
  };

  useEffect(() => {
    if (currentConversation)
      dispatch(fetchAllMedia({ conversationId: currentConversation }));
  }, [currentConversation]);

  return (
    <div id="main-info">
      {(() => {
        if (isFind.view === 0) {
          return (
            <>
              <div className="info_title-wrapper">
                <InfoTitle
                  onBack={handleOnBack}
                  text={
                    conversations.find((ele) => ele._id === currentConversation)
                      .type
                      ? "Thông tin nhóm"
                      : " Thông tin hội thoại"
                  }
                />
              </div>
              <Scrollbars
                autoHide={true}
                autoHideTimeout={1000}
                autoHideDuration={200}
                style={{
                  width: "100%",
                  height: "calc(100vh - 68px)",
                }}
              >
                <div className="body-info">
                  <div className="info_name-and-thumbnail-wrapper">
                    <InfoNameAndThumbnail
                      conversation={conversations.find(
                        (ele) => ele._id === currentConversation
                      )}
                    />
                  </div>

                  {type && (
                    <>
                      <div className="info_member-wrapper">
                        <InfoMember
                          viewMemberClick={handleViewMemberClick}
                          quantity={memberInConversation.length}
                        />
                      </div>

                      <div className="info_member-wrapper">
                        <Channel
                          onViewChannel={onViewChannel}
                          data={channels}
                        />
                      </div>
                    </>
                  )}

                  <div className="info_archive-media-wrapper">
                    <ArchiveMedia
                      viewMediaClick={handleViewMediaClick}
                      name="Ảnh"
                      items={media.images}
                    />
                  </div>

                  <div className="info_archive-media-wrapper">
                    <ArchiveMedia
                      viewMediaClick={handleViewMediaClick}
                      name="Video"
                      items={media.videos}
                    />
                  </div>

                  <div className="info_archive-file-wrapper">
                    <ArchiveFile
                      viewMediaClick={handleViewMediaClick}
                      items={media.files}
                    />
                  </div>

                  {conversations.find((ele) => ele._id === currentConversation)
                    .type && (
                    <div className="info_another-setting-wrapper">
                      <AnotherSetting socket={socket} />
                    </div>
                  )}
                </div>
              </Scrollbars>
            </>
          );
        } else if (isFind.view === 2) {
          return (
            <InfoMediaSearch onBack={handleOnBack} tabpane={isFind.tabpane} />
          );
        } else {
          return (
            <InfoFriendSearch
              onBack={handleOnBack}
              members={memberInConversation}
              onChoseUser={handleChoseUser}
            />
          );
        }
      })()}

      {userChose && (
        <UserCard
          isVisible={isVisible}
          onCancel={() => setIsVisible(false)}
          user={userChose}
        />
      )}
    </div>
  );
}

export default InfoContainer;
