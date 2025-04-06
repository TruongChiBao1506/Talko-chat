import React from 'react';
import './style.css';


function OverlayImage(props) {
    return (
        <div className="overlay-item">
            {props.children}
        </div>
    );
}

export default OverlayImage;