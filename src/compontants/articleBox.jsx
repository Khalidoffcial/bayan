import { useEffect, useState, useRef } from "react";
import "./PostModal.css"; // عشان نحط شوية تنسيقات بسيطة
import Top from "./top.jsx";
import SocialShare from "./SocialShare.jsx";
import InterestsPopup from "./interstetsModels.jsx";
import ArticleDAO from './Dao.js';
import Sidebar from './sidebar.jsx';
import { Link, Navigate } from 'react-router-dom';
import { storage } from './firebase';
import { ref as storageRef, getDownloadURL, listAll } from 'firebase/storage';
import { useParams, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import CircularLoader from "./loader.jsx";
import { motion, AnimatePresence } from "framer-motion";
import PropellerAd from './adsense.jsx';
import PushBannerAd from './PushBannerAd.jsx';
import InterstitialAd from './InterstitialAd.jsx';
import VignetteAd from './VignetteAd.jsx';
import default_img from "../icons/user_10374408.png";
import "./timeline.css";
import { on, off } from './eventBus';
import { io } from "socket.io-client";

const socket = io("http://localhost:9000");



const ArticleBox = () => {
    const { typeArticle } = useParams();
    const [DataPosts, SetdataPosts] = useState([]);
  const [DataArticles, SetdataArticles] = useState([]);
  const [DataNovels, SetdataNovels] = useState([]);
  const [DataWillShow, SetdataWillShow] = useState([]);
  // const [filteredArticles, set_filteredArticles] = useState(DataWillShow);
  const [imageUrls, setImageUrls] = useState({});
  const [isback, setBack] = useState(false);
  const [filter, SetFilter] = useState('');
  // const [like, setLike] = useState(false);
    const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const seenIds = useRef(new Set()); // نخزن كل الـ IDs اللي وصلتنا

  const location = useLocation();
  const isHome = location.pathname === "/";  // أو "/home"
  const dynamicClass = isHome ? "home" : "other";
  const navigate = useNavigate();

  const handleValue = (data) => SetFilter(data);
  useEffect(() => {
    on('sendValue', handleValue);

    return () => {
      off('sendValue', handleValue); // نظافة
    };
  }, []);

  function handleDelete(e){
    e.preventDefault();
    off('sendValue', handleValue); // نظافة
    setBack(false);
  }

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    // النصف الأخير من الصفحة
    const halfPoint = scrollHeight * 0.5;

    if (scrollTop + clientHeight >= halfPoint) {

  if (!loading) { // نتأكد إننا مش بنكرر التحميل
          setLoading(true);

          let idUser = localStorage.getItem("me");
          const userId = JSON.parse(idUser).id;

          if (location.pathname === "/posts") {
            socket.emit("POSTS", userId);
          } else if (location.pathname === "/novels") {
            socket.emit("NOVELS", userId);
          } else if (location.pathname === "/articles") {
            socket.emit("ARTICLES", userId);
          } else {
            socket.emit("CSOI", userId);
          }

          // لما يخلص التحميل من السيرفر، رجّع الحالة false
          setTimeout(() => setLoading(false), 1000);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  

  useEffect(() => { 
    let idUser = localStorage.getItem("me");
    if(localStorage.getItem("me") && localStorage.getItem("userInterests")){
      if(location.pathname==="/posts"){
        socket.emit("POSTS", JSON.parse(idUser).id);
      }else if(location.pathname==="/novels"){
        socket.emit("NOVELS", JSON.parse(idUser).id);
      }else if(location.pathname==="/articles"){
        socket.emit("ARTICLES", JSON.parse(idUser).id);
      }else{
        socket.emit("CSOI", JSON.parse(idUser).id);
      }
    }
  },[localStorage.getItem("me"),localStorage.getItem("userInterests")])


  useEffect(() => {
    // نسمع المقالات الجديدة
    socket.on("SCSOI", (data) => {
      const filtered = data.filter((item) => !seenIds.current.has(item.id));
      
      // خزّن الـ IDs الجديدة
      filtered.forEach((item) => seenIds.current.add(item.id));
      
      SetdataWillShow((prev) => [...prev, ...filtered]);
    });
    
  }, []);
  




const capitalizeFirstLetter = (word) => {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

  //   const clickLike = async (content,mode) => {
  //     if(mode==="like"){
  //       setLike(true);
  //       // content.like = content.like + 1;
  //       // socket.emit("like", content);
  //     }else if(mode ==="dislike"){
  //         setLike(false);
  //       // content.like = content.like + 1;
  //       // socket.emit("like", content);
  //     }
  //  }

  const handleClickItem = (DataArticle) => {
    navigate(`/r/${DataArticle.id}`, { state: { DataArticle } });
  };


   const renderCard = (item) => {
    const isPost = item.type === "post";
    const isNovel = item.type === "novel";
    const isArticle = item.type === "article";

    const CardContent = (
 <div className="box" key={item.id}>
                <div className="TopBox">
                  {item.img ? (
                    <img
                      src={item.img[0]}
                      alt={item.title}
                      style={{ width: '100%', maxWidth: '500px' }}
                      className="img_content"
                    />
                  ) : (
                    null
                  )}
                  </div>
                <div className='BottomBox'>
                    <Link to={`/p/${item.userData.Id_user}`} className='hyperlinkBox'>
                    <div className="account" >
                        <div className="profile-pic-wrapper-posts">
                          <img
                            src={item.userData.imgProfile ||  default_img}
                            alt="profile"
                            className="profile-pic-posts"
                          />
                          </div>
                          <div className="names">
                          <h2 className="nameacc">{item.userData.F_user}</h2>
                          <p className="usernameacc">{item.userData.S_user }</p>
                          </div>
                    </div>
                </Link>
              {isPost && (
                    <div className="content_Post" onClick={() => setSelectedPost(item)}>
                      <h1>{item.content}</h1>
                      <p className='history'>{item.date}</p>
                    </div>
              )}

              {(isArticle || isNovel ) && (
                    <div className="content" onClick={()=>{handleClickItem(item)}}>
                       <h1>{item.title}</h1>
                       <p className="descrip">{item.descrip}</p>
                       <p className='history'>{item.date}</p>
                    </div>
              )}
              

                {/* <div className='buttonAction'>
                    <div className="rightAction">
                      <div className="timeReading"></div>
                          <div className="likes">
                            {like?(
                             <div className="dislike"  key={item.id} onClick={() => clickLike(item, "dislike")}>
                               <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon"><path d="M10.9153 1.83987L11.2942 1.88772L11.4749 1.91507C13.2633 2.24201 14.4107 4.01717 13.9749 5.78225L13.9261 5.95901L13.3987 7.6719C13.7708 7.67575 14.0961 7.68389 14.3792 7.70608C14.8737 7.74486 15.3109 7.82759 15.7015 8.03323L15.8528 8.11819C16.5966 8.56353 17.1278 9.29625 17.3167 10.1475L17.347 10.3096C17.403 10.69 17.3647 11.0832 17.2835 11.5098C17.2375 11.7517 17.1735 12.0212 17.096 12.3233L16.8255 13.3321L16.4456 14.7276C16.2076 15.6001 16.0438 16.2356 15.7366 16.7305L15.595 16.9346C15.2989 17.318 14.9197 17.628 14.4866 17.8408L14.2982 17.9258C13.6885 18.1774 12.9785 18.1651 11.9446 18.1651H7.33331C6.64422 18.1651 6.08726 18.1657 5.63702 18.1289C5.23638 18.0962 4.87565 18.031 4.53936 17.8867L4.39679 17.8203C3.87576 17.5549 3.43916 17.151 3.13507 16.6553L3.013 16.4366C2.82119 16.0599 2.74182 15.6541 2.7044 15.1963C2.66762 14.7461 2.66827 14.1891 2.66827 13.5V11.667C2.66827 10.9349 2.66214 10.4375 2.77569 10.0137L2.83722 9.81253C3.17599 8.81768 3.99001 8.05084 5.01397 7.77639L5.17706 7.73928C5.56592 7.66435 6.02595 7.66799 6.66632 7.66799C6.9429 7.66799 7.19894 7.52038 7.33624 7.2803L10.2562 2.16995L10.3118 2.08792C10.4544 1.90739 10.6824 1.81092 10.9153 1.83987ZM7.33136 14.167C7.33136 14.9841 7.33714 15.2627 7.39386 15.4746L7.42999 15.5918C7.62644 16.1686 8.09802 16.6134 8.69171 16.7725L8.87042 16.8067C9.07652 16.8323 9.38687 16.835 10.0003 16.835H11.9446C13.099 16.835 13.4838 16.8228 13.7903 16.6963L13.8997 16.6465C14.1508 16.5231 14.3716 16.3444 14.5433 16.1221L14.6155 16.0166C14.7769 15.7552 14.8968 15.3517 15.1624 14.378L15.5433 12.9824L15.8079 11.9922C15.8804 11.7102 15.9368 11.4711 15.9769 11.2608C16.0364 10.948 16.0517 10.7375 16.0394 10.5791L16.0179 10.4356C15.9156 9.97497 15.641 9.57381 15.2542 9.31253L15.0814 9.20999C14.9253 9.12785 14.6982 9.06544 14.2747 9.03225C13.8477 8.99881 13.2923 8.99807 12.5003 8.99807C12.2893 8.99807 12.0905 8.89822 11.9651 8.72854C11.8398 8.55879 11.8025 8.33942 11.8646 8.13772L12.6556 5.56741L12.7054 5.36331C12.8941 4.35953 12.216 3.37956 11.1878 3.2178L8.49054 7.93948C8.23033 8.39484 7.81431 8.72848 7.33136 8.88967V14.167ZM3.99835 13.5C3.99835 14.2111 3.99924 14.7044 4.03058 15.0879C4.06128 15.4636 4.11804 15.675 4.19854 15.833L4.26886 15.959C4.44517 16.2466 4.69805 16.4808 5.0003 16.6348L5.13019 16.6905C5.27397 16.7419 5.46337 16.7797 5.74542 16.8028C5.97772 16.8217 6.25037 16.828 6.58722 16.8311C6.41249 16.585 6.27075 16.3136 6.1712 16.0215L6.10968 15.8194C5.99614 15.3956 6.00128 14.899 6.00128 14.167V9.00296C5.79386 9.0067 5.65011 9.01339 5.53741 9.02737L5.3587 9.06057C4.76502 9.21965 4.29247 9.66448 4.09601 10.2412L4.06085 10.3584C4.00404 10.5705 3.99835 10.8493 3.99835 11.667V13.5Z" fill="blue" /></svg>
                             </div>
                            ):(<div className="like"  key={item.id} onClick={() => clickLike(item, "like")}> <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon"><path d="M10.9153 1.83987L11.2942 1.88772L11.4749 1.91507C13.2633 2.24201 14.4107 4.01717 13.9749 5.78225L13.9261 5.95901L13.3987 7.6719C13.7708 7.67575 14.0961 7.68389 14.3792 7.70608C14.8737 7.74486 15.3109 7.82759 15.7015 8.03323L15.8528 8.11819C16.5966 8.56353 17.1278 9.29625 17.3167 10.1475L17.347 10.3096C17.403 10.69 17.3647 11.0832 17.2835 11.5098C17.2375 11.7517 17.1735 12.0212 17.096 12.3233L16.8255 13.3321L16.4456 14.7276C16.2076 15.6001 16.0438 16.2356 15.7366 16.7305L15.595 16.9346C15.2989 17.318 14.9197 17.628 14.4866 17.8408L14.2982 17.9258C13.6885 18.1774 12.9785 18.1651 11.9446 18.1651H7.33331C6.64422 18.1651 6.08726 18.1657 5.63702 18.1289C5.23638 18.0962 4.87565 18.031 4.53936 17.8867L4.39679 17.8203C3.87576 17.5549 3.43916 17.151 3.13507 16.6553L3.013 16.4366C2.82119 16.0599 2.74182 15.6541 2.7044 15.1963C2.66762 14.7461 2.66827 14.1891 2.66827 13.5V11.667C2.66827 10.9349 2.66214 10.4375 2.77569 10.0137L2.83722 9.81253C3.17599 8.81768 3.99001 8.05084 5.01397 7.77639L5.17706 7.73928C5.56592 7.66435 6.02595 7.66799 6.66632 7.66799C6.9429 7.66799 7.19894 7.52038 7.33624 7.2803L10.2562 2.16995L10.3118 2.08792C10.4544 1.90739 10.6824 1.81092 10.9153 1.83987ZM7.33136 14.167C7.33136 14.9841 7.33714 15.2627 7.39386 15.4746L7.42999 15.5918C7.62644 16.1686 8.09802 16.6134 8.69171 16.7725L8.87042 16.8067C9.07652 16.8323 9.38687 16.835 10.0003 16.835H11.9446C13.099 16.835 13.4838 16.8228 13.7903 16.6963L13.8997 16.6465C14.1508 16.5231 14.3716 16.3444 14.5433 16.1221L14.6155 16.0166C14.7769 15.7552 14.8968 15.3517 15.1624 14.378L15.5433 12.9824L15.8079 11.9922C15.8804 11.7102 15.9368 11.4711 15.9769 11.2608C16.0364 10.948 16.0517 10.7375 16.0394 10.5791L16.0179 10.4356C15.9156 9.97497 15.641 9.57381 15.2542 9.31253L15.0814 9.20999C14.9253 9.12785 14.6982 9.06544 14.2747 9.03225C13.8477 8.99881 13.2923 8.99807 12.5003 8.99807C12.2893 8.99807 12.0905 8.89822 11.9651 8.72854C11.8398 8.55879 11.8025 8.33942 11.8646 8.13772L12.6556 5.56741L12.7054 5.36331C12.8941 4.35953 12.216 3.37956 11.1878 3.2178L8.49054 7.93948C8.23033 8.39484 7.81431 8.72848 7.33136 8.88967V14.167ZM3.99835 13.5C3.99835 14.2111 3.99924 14.7044 4.03058 15.0879C4.06128 15.4636 4.11804 15.675 4.19854 15.833L4.26886 15.959C4.44517 16.2466 4.69805 16.4808 5.0003 16.6348L5.13019 16.6905C5.27397 16.7419 5.46337 16.7797 5.74542 16.8028C5.97772 16.8217 6.25037 16.828 6.58722 16.8311C6.41249 16.585 6.27075 16.3136 6.1712 16.0215L6.10968 15.8194C5.99614 15.3956 6.00128 14.899 6.00128 14.167V9.00296C5.79386 9.0067 5.65011 9.01339 5.53741 9.02737L5.3587 9.06057C4.76502 9.21965 4.29247 9.66448 4.09601 10.2412L4.06085 10.3584C4.00404 10.5705 3.99835 10.8493 3.99835 11.667V13.5Z" fill="black" /></svg>

                            </div>
                            )}
                      </div>
                      <div className="comments"></div>
                    </div>
                    <div className="leftAction">
                      <div className="saves"></div>
                      <div className="dots"></div>
                    </div>
                </div>*/}
                </div> 
              </div>
    );

    if (isPost) return CardContent;
    if (isNovel) return CardContent;
    if (isArticle) return CardContent;
    return null;
  };

  
  return (
    <>
    {/* <PropellerAd /> */}
    {/* <InterstitialAd /> */}
    <PushBannerAd />
    <VignetteAd />
    
    <Top></Top>
    <Sidebar></Sidebar>
    <InterestsPopup></InterestsPopup>
    
      <div className={`service_${dynamicClass}`}>
        {isback?(
          <button className="back" onClick={handleDelete}>
              <h1>رجوع</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
            </button>):(null)}
        <div className="timeline" dir='rtl'>
          {(DataWillShow.length  )? (
            DataWillShow.map((item) => (renderCard(item)))) : (<CircularLoader />
          )}
                {/* loader */}
      {/* {loading && <CircularLoader />} */}
          

           <AnimatePresence>
        {selectedPost && (
          <motion.div
            className="overlay"
            onClick={() => setSelectedPost(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              onClick={(e) => e.stopPropagation()} // يمنع غلق المودال لما تضغط جوه
              initial={{ scale: 0.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 15, stiffness: 150 }}
            >
              <button className="close-btn" onClick={() => setSelectedPost(null)}>
                ×
              </button>
              <Link to={`/p/${selectedPost.userData.Id_user}`} className='hyperlinkBox'>
                    <div className="account" >
                        <div className="profile-pic-wrapper-posts">
                          <img
                            src={selectedPost.userData.imgProfile ||  default_img}
                            alt="profile"
                            className="profile-pic-posts"
                          />
                          </div>
                          <div className="names">
                          <h2 className="nameacc">{selectedPost.userData.F_user}</h2>
                          <p className="usernameacc">{selectedPost.userData.S_user }</p>
                          </div>
                    </div>
                </Link>

              {selectedPost.img?(
                <img
                      src={selectedPost.img[0]}
                      alt={selectedPost.title}
                      style={{ width: '100%', maxWidth: '500px' }}
                      className="img_content_PostModel"
                    />
              ):(null)}
              <h2>{selectedPost.content}</h2>
              <p className="modal-date">{selectedPost.date}</p>
              <p className="modal-text">
                        <SocialShare
          title={selectedPost.content}
          text={selectedPost.content}
          url={window.location.href}
          platforms={['facebook', 'twitter', 'whatsapp', 'linkedin', 'telegram']}
        />
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        </div>
      </div>
    </>
  );
};

export default ArticleBox;
