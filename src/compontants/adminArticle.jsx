import React, { useEffect, useRef, useState } from 'react';
import ArticleDAO from "./Dao.js";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { storage } from './firebase.js';
import { Link } from 'react-router-dom';

import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject,listAll } from 'firebase/storage';
  import updata from "./refresh-page-option.png";
  import remove from './remove.png';
// import ArticleBox from './articleBox.jsx';
import { sendToClaude } from './cloudeApi.jsx';

const AdminArticle = () => {
  const refIMG = useRef(null);
  const [Img, setImg] = useState(null);
  const [title, setTitle] = useState('');
  const [descrip, setDescrip] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [ID_selected, SetId] = useState('');
  const [isUpdate, setUpdated] = useState(false);
  const [selectedType, setselectedType] = useState('');
  const [dao] = useState(new ArticleDAO());
  const [DataArticle, SetdataArticle] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  
  const [News, setNews] = useState([]);



  const handleValueImg = (e) => {
    setImg(e.target.files[0]);
    console.log(e.target.files[0]);
    
  };

  const handleValueTitle = (e) => setTitle(e.target.value);
  const handleValueDescrip = (e) => setDescrip(e.target.value);
  const handleValueDate = (e) => setDate(e.target.value);
  const handleChange = (e, editor) => setContent(editor.getData());
  const change_typeArticle = (e) => setselectedType(e.target.value);

  const clearIMG = () => {
    refIMG.current.value = null;
  };

  const handleImageDelete = async (imgID) => {
    const imageRef = storageRef(storage, `images/image${imgID}`);
    if(imageRef){
          try {
      await deleteObject(imageRef);
      console.log('✅ Image deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting image:', error);
    }
    }

  };

  const saveIMG = async (imgid) => {
    if (Img == null) return "";
    const imageRef = storageRef(storage, `images/image${imgid}`);
    await uploadBytes(imageRef, Img);
    const url = await getDownloadURL(imageRef);
    console.log(url);
    return url;
  };

  const generateID = () => Math.floor(1000 + Math.random() * 9000);

  const SaveArticle = async () => {
    if (!title || !descrip || !date || !content || !selectedType ) {
      alert("❗ الرجاء تعبئة جميع الحقول ورفع صورة");
      return;
    }

    const articleId = generateID();
    const imageUrl = await saveIMG(articleId);
    console.log(imageUrl);

    const newArticle = {
      id: articleId,
      title,
      descrip,
      date,
      content,
      img: imageUrl,
      type: selectedType
    };

    await dao.saveArticle(newArticle);
    clearInputs();
  };

  const UpdateِArticleToDatabase = async (e) => {
    if (!title || !descrip || !date || !content || !selectedType || !ID_selected) {
      alert("❗ الرجاء تعبئة جميع الحقول");
      return;
    }

    await handleImageDelete(ID_selected);
    const newImageUrl = await saveIMG(ID_selected);
    console.log(newImageUrl);
    

    const updatedArticle = {
      id: ID_selected,
      title,
      descrip,
      date,
      content,
      img: newImageUrl,
      type: selectedType
    };

    await dao.updateArticle(ID_selected, updatedArticle);
    setUpdated(false);
    clearInputs();
  };

  const clearInputs = () => {
    setTitle("");
    setDescrip("");
    setDate("");
    setContent("");
    setImg(null);
    clearIMG();
    SetId("");
    setselectedType("");
  };

  const handleToUpdate = async (e,id) => {
    e.stopPropagation();
    e.preventDefault();
    setUpdated(true);
    SetId(id);

    const data = await dao.getArticleID(id);
    setTitle(data.title);
    setDescrip(data.descrip);
    setDate(data.date);
    setContent(data.content);
    setselectedType(data.type);
  };

  const handleRemove = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    await dao.deleteArticle(id);
    await handleImageDelete(id);
    SetId("");
  };
  
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
  };
// news 
 const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchNews = async () => {
  //     try {
  //       const response = await fetch(
  //         'https://api.worldnewsapi.com/search-news?text=مصر&language=ar&number=10&api-key=37cefb30cbc438fa767fb2fdd446ab5'
  //       );
  //       const data = await response.json();
  //       console.log("البيانات:", data);
  //       if (data.news && data.news.length > 0) {
  //         setNews(data.news);
  //       } else {
  //         console.warn("لا يوجد أخبار مسترجعة.");
  //       }
  //     } catch (error) {
  //       console.error("حدث خطأ أثناء جلب الأخبار:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchNews();
  // }, []);






  // Get article 
    useEffect(() => {
      const dao = new ArticleDAO();
      dao.getArticle().then((data) => {
        if (data) {
          const articlesArray = Object.values(data);
          SetdataArticle(articlesArray);
        }
      });
      const fetchImages = async () => {
        try {
          const imagesRef = storageRef(storage, 'images');
          const response = await listAll(imagesRef);
  
          if (response && response.items) {
            const urlsPromises = response.items.map(async (item) => {
              const url = await getDownloadURL(item);
              const id = item.name.split('.')[0]; // استخراج معرف المقالة من اسم الصورة
              return { id, url };
            });
  
            const urlsArray = await Promise.all(urlsPromises);
            const urlsObject = urlsArray.reduce((acc, { id, url }) => {
              acc[id] = url;
              return acc;
            }, {});
  
            setImageUrls(urlsObject);
          }
        } catch (error) {
          console.error('Error fetching images:', error);
        }
      };
  
      fetchImages();
    }, []);
  
  // useEffect(()=>{
  //   setImmediate(async () => {
  //     const result = await sendToClaude("اكتبلي مقال عن الذكاء العاطفي في الحياة اليومية");
  //     console.log(result);
  //   },1000);
  // },[])
  
  return (
    <>
      <div className='editor'>
        <div className="address_edit">إداره المقالات</div>
        <input type="file" className='Add_img' onChange={handleValueImg} accept='image/*' ref={refIMG} />
        <textarea className='add_title' placeholder='عنوان المقاله' onChange={handleValueTitle} value={title} />
        <textarea className='add_descrip' placeholder='وصف المقاله' onChange={handleValueDescrip} value={descrip} />
        <input type="date" className='Add_date' onChange={handleValueDate} value={date} />
        <select
          id="articleType"
          value={selectedType}
          onChange={change_typeArticle}
          className="border rounded px-3 py-2 w-full"
        >
          <option value="">-- اختر --</option>
          <option value="tech">مقالات</option>
          <option value="stories">روايات</option>
          <option value="news">أخبار</option>
          <option value="howto">كيفية</option>
          <option value="tech">تقنيه</option>
          <option value="science">علوم</option>
          <option value="business">اعمال</option>
        </select>

        <div className="add_content">
          <CKEditor
            editor={ClassicEditor}
            data={content}
            onChange={handleChange}
            config={editorConfiguration}
          />
        </div>

        {isUpdate ? (
          <div onClick={()=>{UpdateِArticleToDatabase()}} className="btn_save">تحديث</div>
        ) : (
          <div onClick={()=>{SaveArticle()}} className="btn_save">حفظ</div>
        )}
      </div>
{/* 
      <ArticleBox
        Prop_handleRemove={handleRemove}
        Prop_handleToUpdate={handleToUpdate}
      /> */}

    {DataArticle.length ? (
            DataArticle.map((item) => (
              <Link to={`/Articles/${item.id}`} className='hyperlinkBox'>
              <div className="box" key={item.id}>
                <div className="TopBox">
                  {imageUrls[`image${item.id}`] ? (
                    <img
                      src={imageUrls[`image${item.id}`]}
                      alt={item.title}
                      style={{ width: '100%', maxWidth: '500px' }}
                    />
                  ) : (
                    <p>No image available</p>
                  )}
                </div>
                <div className='BottomBox'>
                  
                    <h1>{item.title}</h1>
                    <h4 className='description'>{item.descrip}</h4>
                    <p className='history'>{item.date}</p>
                  

                    <div className='button_mange'>
                      
                        <div className="updateArticle" onClick={(e) => { handleToUpdate(e,item.id); }}>
                          <img src={updata} alt="تحديث" />
                        </div>

                        <div className="removeArticle" onClick={(e) => { handleRemove(e,item.id); }}>
                          <img src={remove} alt="حذف" />
                        </div>

                    </div>
                  )
                </div>
              </div>
              </Link>
            ))
          ) : (
            <div className='parentDontfound'>
              <div className='dontfound'>لا توجد نتائج</div>
            </div>
          )}
    </>
  );
};

export default AdminArticle;
