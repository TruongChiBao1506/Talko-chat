import React from 'react';
import './Sidebar.css';
import Button from '../buttonComponent/Button';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-avatar">
        <img src="/placeholder.svg?height=32&width=32" alt="User" />
      </div>
      <nav className="sidebar-nav">
        <Button className="button-sideBar" type="button" children={<i className="icon-message-circle"></i>}/>
        <Button className="button-sideBar" type="button" children={<i className="icon-users"></i>}/>
        <Button className="button-sideBar" type="button" children={<i className="icon-bell"></i>}/>
        <Button className="button-sideBar" type="button" children={<i className="icon-check-square"></i>}/>
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-button">
          <i className="icon-cloud"></i>
        </button>
        <button className="sidebar-button">
          <i className="icon-star"></i>
        </button>
        <button className="sidebar-button">
          <i className="icon-settings"></i>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;

