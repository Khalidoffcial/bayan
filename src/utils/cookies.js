import Cookies from 'js-cookie';

export default function cookie(any) {
    console.log(any)
    if (any === "get") {
        if (Cookies.get('token')){
            return Cookies.get('token');
        }else{
            return localStorage.getItem("Token")
        }
    } else if (any === "remove") {
        return Cookies.remove('token');
    } else if (any.startsWith("ey")) {
        console.log(any)
        Cookies.set('token', any, { expires: 60, secure: true });
    }
}