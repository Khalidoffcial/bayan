import React, { useEffect, useState, useRef } from 'react';
import { useLocation,useParams, useNavigate } from "react-router-dom";
import { database } from './firebase';
import { ref, onValue } from "firebase/database";
import Top from './top';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase.js';
import 'react-quill/dist/quill.snow.css';
import SocialShare from "./SocialShare.jsx";
import { Helmet } from 'react-helmet-async'; // ✅ استيراد Helmet
import PropellerAd from './adsense.jsx';


const Articlereading = () => {
  const { articleId } = useParams();
  const [DataArticle, SetdataArticle] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const navigate = useNavigate();
  const articleRef = useRef(null);
   const location = useLocation();


  // useEffect(() => {
  //   if (!articleId) return;

  //   const artcleref = ref(database, `articles/article${articleId}`);
  //   onValue(artcleref, (snapshot) => {
  //     const data = snapshot.val();
  //     if (data) SetdataArticle(data);
  //   });

  //   const fetchImageUrl = async (artid) => {
  //     try {
  //       const imgRef = storageRef(storage, `images/image${artid}`);
  //       const url = await getDownloadURL(imgRef);
  //       setImageUrl(url);
  //     } catch (error) {
  //       console.error('Error fetching image URL:', error);
  //     }
  //   };

  //   fetchImageUrl(articleId);
  // }, [articleId]);


useEffect(()=>{
    SetdataArticle(location.state?.DataArticle);

},[])




  const handleback = () => navigate(-1);

  const downloadAsPDF = () => {
    if (window.html2pdf) {
      const element = articleRef.current;
      const opt = {
        margin: 0.5,
        filename: `${DataArticle.title || 'article'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().from(element).set(opt).save();
    } else {
      alert("يرجى التأكد من تحميل مكتبة html2pdf.js");
    }
  };

  return (
    <>
      {/* ✅ تحسينات SEO */}
      <Helmet>
        <title>{DataArticle.title || 'مقالة'}</title>
        <meta name="description" content={DataArticle.descrip || 'وصف المقالة'} />
        <meta name="keywords" content="مقالة, حكم, أقوال, إسلام, علم, فكر, مقال عربي" />
        <meta property="og:title" content={DataArticle.title} />
        <meta property="og:description" content={DataArticle.descrip} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={DataArticle.title} />
        <meta name="twitter:description" content={DataArticle.descrip} />
        <meta name="twitter:image" content={imageUrl} />
      </Helmet>

      <Top />
      {/* <PropellerAd /> */}
      <div className="w"></div>
      <button className="back" onClick={handleback}>
        <h1>رجوع</h1>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="article_information" ref={articleRef}>
        <div className="img_article">
          {imageUrl && <img src={imageUrl} alt={DataArticle.title} />}
        </div>
        <div className='title'>{DataArticle.title}</div>

        {/* <InfolinksAd /> 👈 إعلان Infolinks هنا */}

        <div className='descrip'>{DataArticle.descrip}</div>
        <div className='his'>{DataArticle.date}</div>
        <div className="content_Article" dangerouslySetInnerHTML={{ __html: DataArticle.content }} />
      </div>

      <div className="actions" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <SocialShare
          title={DataArticle.title}
          text={DataArticle.descrip}
          url={window.location.href}
          platforms={['facebook', 'twitter', 'whatsapp', 'linkedin', 'telegram']}
        />

        <button onClick={downloadAsPDF} className="btn-download-pdf" style={{ backgroundColor: "#1a202c", color: "white", padding: "8px 16px", borderRadius: "5px", cursor: "pointer" }}>
          تحميل كـ PDF
        </button>
      </div>
    </>
  );
};

export default Articlereading;
