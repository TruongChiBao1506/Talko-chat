import React, { useEffect } from "react"

import "./home.css"
import Header from "./Components/Header"
import Features from "./Components/Features"
import AboutWebApp from "./Components/AboutWebApp"
import Developer from "./Components/Developer"
import Footer from "./Components/Footer"
import { useDispatch, useSelector } from "react-redux"
import { fakeApiCall } from './homeSlice';
import { Spin } from 'antd';
import {LoadingOutlined } from '@ant-design/icons'

const Home = () => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.home);
  useEffect(() => {
      document.title = "Talko Chat";
    }, []);
  useEffect(() => {
    dispatch(fakeApiCall());
  }, [dispatch]);
  return (
    <Spin indicator={<LoadingOutlined style={{fontSize : 68}} spin/>} spinning={isLoading}>
      <div className="zalo-homepage">
        <Header />
        <main>
          <Features />
          <AboutWebApp />
          <Developer />
        </main>
        <Footer />
      </div>
    </Spin>

  )
}

export default Home;

