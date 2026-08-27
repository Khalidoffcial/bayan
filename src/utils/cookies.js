import Cookies from 'js-cookie';

export default function cookie(any) {
  if (any === "get") {
    return (
      Cookies.get('token') ||
      localStorage.getItem("token") ||
      localStorage.getItem("Token") ||
      null
    );
  } else if (any === "remove") {
    Cookies.remove('token');
    localStorage.removeItem("token");
    localStorage.removeItem("Token");
  } else if (typeof any === "string" && (any.startsWith("ey") || any.length > 10)) {
    Cookies.set('token', any, {
      expires: 60,
      secure: typeof window !== "undefined" && window.location.protocol === "https:",
      sameSite: "Lax",
    });
  }
}