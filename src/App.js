import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from './homepage.jsx';
import ArticleBox from './compontants/articleBox.jsx';
import AdminArticle from './compontants/adminArticle.jsx';
import Signup from './login_chat/signup.jsx';
import Login from './login_chat/signin.jsx';
import Profile from './compontants/profile.jsx';
import Articlereading from './compontants/articlereading.jsx';
import Postreading from './compontants/postreading.jsx';
// eslint-disable-next-line
function App() {
    return (

        <
        BrowserRouter >
        <
        Routes >
        <
        Route exact path = '/'
        element = { < HomePage / > }
        /> <
        Route path = '/a/666'
        element = { < AdminArticle / > }
        /> <
        Route path = '/signup'
        element = { < Signup / > }
        /> <
        Route path = '/signin'
        element = { < Login / > }
        /> <
        Route path = '/p/:idOtherUser'
        element = { < Profile / > }
        /> <
        Route path = ':typeArticle'
        element = { < ArticleBox / > }
        /> <
        Route path = '/r/:articleId'
        Component = { Articlereading }
        /> <
        Route path = '/rp/:postId'
        Component = { Postreading }
        /> < /
        Routes >

        <
        /BrowserRouter>)
    }

    export default App;