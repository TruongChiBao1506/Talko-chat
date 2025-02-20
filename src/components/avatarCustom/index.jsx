import React from 'react';
import PropTypes from 'prop-types';
import { Avatar, Tooltip } from 'antd';
import getSummaryName from '../../utils/nameHelper';

function AvatarCustom({ 
    src = "", 
    name = "", 
    style = {}, 
    color = "#408ec6", 
    size, 
    ...rest 
}) {
    const avatarStyle = { backgroundColor: color, ...style };
    const displayName = name || "Unknown";

    return src ? (
        <Avatar src={src} size={size} {...rest} />
    ) : (
        <Tooltip title={displayName} placement="top">
            <Avatar style={avatarStyle} size={size} {...rest}>
                {getSummaryName(displayName)}
            </Avatar>
        </Tooltip>
    );
}

AvatarCustom.propTypes = {
    src: PropTypes.string,
    name: PropTypes.string,
    style: PropTypes.object,
    size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    color: PropTypes.string,
};

export default AvatarCustom;
