import { React, useState } from "react"
import { Link } from 'react-router-dom';

const Popul = ()=>{
    const [isShow, makeShow] = useState(false);

    function clicked_yes(){
        makeShow(false);
        <Link to="./signup.jsx">Go to Other File</Link>
    }
    function clicked_yes(){
        makeShow(false);
        <Link to="./signup.jsx">Go to Other File</Link>

    }
    return(
        <div class="notification" id="notification">
        <div class="qu-noti">
        Do you want to stay on this device?</div>
        <div class="answer-noti" id="answer-noti">
            <button type="button" class="noti-btn-ys" id="noti-btn-ys" onClick={clicked_yes}>Yes</button>
            <button type="button" class="noti-btn-no" id="noti-btn-no" onClick={clicked_yes}>No</button>
        </div>
        
        </div>
        )
}
export default Popul;