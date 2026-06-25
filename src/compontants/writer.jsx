import React, { useState,useEffect } from "react";
import "./writer.css";
import { storage } from './firebase.js';
import cookie from "../databases/cookies_DAO.js";
import axios from "axios";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject,listAll } from 'firebase/storage';
import { motion, AnimatePresence } from "framer-motion";
import { FaImage, FaTimes } from "react-icons/fa";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const Writer = () => {
  const [active, setActive] = useState(false);
  const [type, setType] = useState("post");
  const [content, setContent] = useState("");
  const [images_Preview, setImages_Preview] = useState([]);
  const [images, setImages] = useState([]);
  const [showImage, setShowImage] = useState(false);//images
  const [imageToFullscreen, setImageToFullscreen] = useState(null);
    const [title, setTitle] = useState("");
  const [descrip, setDescription] = useState("");
  const [series, setSeries] = useState("");
  const [customSeries, setCustomSeries] = useState("");
  const [seriesList, setseriesList] = useState(["ذكاء اصطناعي", "قصص نجاح", "تطوير الذات", "رحلة مبرمج"]);
  const [DataUser, SetDataUser] = useState('');


  useEffect(() => {
  SetDataUser(JSON.parse(localStorage.getItem("me")))
},[])

  const editorConfiguration = {
    toolbar: [
      'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', '|',
      'link', 'bulletedList', 'numberedList', 'blockQuote',
      'imageUpload', 'insertTable', 'mediaEmbed', '|',
      'undo', 'redo', 'alignment', 'direction'
    ],
    language: 'ar',
    alignment: {
      options: ['left', 'right', 'center', 'justify']
    },
    image: {
      toolbar: ['imageTextAlternative', 'imageStyle:full', 'imageStyle:side'],
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
    },
        placeholder: `Write your topic here...`,

  };






  
const handleImageChange = (e) => {
  const files = Array.from(e.target.files);

  // نضيف الملفات الأصلية
  setImages((prev) => [...prev, ...files]);

  // نعمل URLs للعرض فقط
  const newPreviews = files.map((file) => URL.createObjectURL(file));
  setImages_Preview((prev) => [...prev, ...newPreviews]);
};


  const handleClose = () => {
    setActive(false);
    setContent("");
    setTitle("");
    setDescription("");
    setSeries("");
    setCustomSeries("");
    setImages_Preview([]);
  };



    // هحفظ صور جديد
    // eslint-disable-next-line no-dupe-class-members
const saveImages = async () =>{

        if (!images || images.length === 0) return [];
  try {
    // نرفع الصور كلها مرة واحدة وننتظر اكتمالها
    const uploadPromises = images.map(async (img, index) => {
      const uniqueId = `${Date.now()}_${index}_${img.name}`; // اسم فريد
      const imgRef = storageRef(storage, `images/${uniqueId}`);

      await uploadBytes(imgRef, img); // رفع الصورة
      const url = await getDownloadURL(imgRef); // الحصول على الرابط
      return url;
    });

    // ننتظر كل الوعود (promises)
    const urls = await Promise.all(uploadPromises);
    return urls;
    

  } catch (error) {
    console.error("❌ Error uploading images:", error);
    return [];
  }
    }





    const generateID = () => Math.floor(1000 + Math.random() * 9000);

  const SavePost = async () => {
    if (!content ) {
      alert("❗ الرجاء تعبئة جميع الحقول  ");
      return;
    }

    const PostId = generateID();
  const uploadedImages = await saveImages(); // 🟢 كده تمام
 axios
        .post(
          "bayan-production-9dd3.up.railway.app/saveIdeas",
          { 
            autherID:DataUser.id,
            id: PostId,
            img:uploadedImages,
      content,
      type
    },
          {
            headers: {
              Authorization: "Bearer " + cookie("get"),
            },
          }
        )
        .then((res) => {
          if (res.status === 200) {
          }
        })
        .catch(() => {});



    // await dao.savePost(newPost);
  };



  const SaveArticle_novels = async () => {
    if (!title || !descrip || !content || !type ) {
      alert("❗ الرجاء تعبئة جميع الحقول ورفع صورة");
      return;
    }
  const uploadedImages = await saveImages(); // 🟢 كده تمام

    const articleId = generateID();
    const newArticle={        
      autherID:DataUser.id,
      id: articleId,
      title,
      descrip,
      img:uploadedImages,
      content,
      series,
      type
    };
    axios
        .post(
          "bayan-production-9dd3.up.railway.app/saveArticle_novels",newArticle,
          {
            headers: {
              Authorization: "Bearer " + cookie("get"),
            },
          }
        )
        .then((res) => {
          if (res.status === 200) {
          }
        })
        .catch(() => {});




  };





  const handleSubmit = () => {
    handleClose();
    if(type === "article" ||type === "novels"){
      SaveArticle_novels();
    }else if(type === "post"){
      SavePost();
    }
  };

  return (
    <>
      {/* الزر الرئيسي */}


      <motion.div
      className="WriterBox"
      onClick={() => setActive(true)}
      >
        <h5>Share your thoughts — write a post, article, or novels...</h5>
      </motion.div>
      

      {/* النافذة المنبثقة */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="WriterModal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="WriterHeader">
              <h3>Write something new</h3>
              <button onClick={handleClose} className="closeBtn">✖</button>
            </div>





 {/* Upload Section */}
 <div className="upload-container">

      {/* Image Cards Preview */}
      <div className="image-gallery">
        <AnimatePresence>
          {images_Preview.map((img, i) => (
            <motion.div
              key={img}
              className="image-card"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <button
                className="remove-btn"
                onClick={() =>
                  setImages_Preview((prev) => prev.filter((imgSrc) => imgSrc !== img))
                }
              >
                <FaTimes />
              </button>
              <img
                src={img}
                alt={`preview-${i}`}
                onClick={() => {
                  setShowImage(true);
                  setImageToFullscreen(img);
                }}
              />
            </motion.div>
          ))}

                {/* Upload Card */}
      <label htmlFor="upload-image" className="upload-card">
        <FaImage size={40} />
        <p>Upload Image(s)</p>
        <input
          id="upload-image"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          hidden
        />
      </label>
        </AnimatePresence>
      </div>

      {/* Fullscreen Preview */}
      {showImage && (
        <motion.div
          className="image-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setShowImage(false)}
        >
          <motion.img
            src={imageToFullscreen}
            alt="Full view"
            className="fullscreen-image"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </div>



            <div className="TypeSelector">
              <button
                className={type === "post" ? "active" : ""}
                onClick={() => setType("post")}
              >
                Post
              </button>
              <button
                className={type === "article" ? "active" : ""}
                onClick={() => setType("article")}
              >
                Article
              </button>
              <button
                className={type === "novels" ? "active" : ""}
                onClick={() => setType("novels")}
              >
                novels
              </button>
            </div>





 {/* لو المقالة أو القصة */}
            {(type === "article" || type === "novels") ?(
              <>
                <input
                  type="text"
                  className="sm_WriterInput"
                  placeholder="Address..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <textarea
                  className="sm_WriterInput"
                  placeholder="Discribtion..."
                  value={descrip}
                  onChange={(e) => setDescription(e.target.value)}
                />


                <div className="series-section">
                  <select
                    className="sm_WriterInput"
                    value={seriesList.includes(customSeries) ? customSeries : series}
                    onChange={(e) => setSeries(e.target.value)}
                  >
                    <option value="">Select series</option>
                    {seriesList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    
                    ))}
                   <option value="new">New series </option>
                  </select>


                  {/* <select
  className="sm_WriterInput"
  multiple // ✅ السماح باختيار أكثر من عنصر
  value={category} // category هنا لازم تكون Array
  onChange={(e) => {
    // تحويل الاختيارات إلى مصفوفة
    const selectedValues = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setcategory(selectedValues);
  }}
>
  <option value="">Select type</option>
  {categoryList.map((s, i) => (
    <option key={i} value={s}>
      {s}
    </option>
  ))}
</select> */}



                    {series === "new" && (
                        <>
                            <input
                      type="text"
                      className="sm_WriterInput"
                      placeholder="Enter new series title"
                      value={customSeries}
                      onChange={(e) => setCustomSeries(e.target.value)}
                    />
                    <button onClick={()=>{customSeries && (
                      setseriesList((prev)=>[...prev,customSeries]));
                       setCustomSeries("")
                      }}>
                        ✓
                    </button>
                         </>
                    
                  )}

                </div>


           
          <CKEditor
            editor={ClassicEditor}
            config={editorConfiguration}

            className="WriterInput"
              value={content}
              onChange={(e, editor) => setContent(editor.getData())}
          />
              </>
            ):(

              <textarea
              className="WriterInput"
              placeholder={`Write your ${type} here...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            )}














            <div className="WriterActions">
              <button className="cancelBtn" onClick={handleClose}>
                Cancel
              </button>
              <button className="submitBtn" onClick={handleSubmit}>
                Publish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الخلفية المعتمة */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="Backdrop"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Writer;