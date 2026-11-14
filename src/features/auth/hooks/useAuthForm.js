import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  verifyAuthToken,
  signInWithCredentials,
  signUpUser,
  signInWithGoogle,
  getGoogleFirebaseUser,
  authErrorCode,
} from "../services/auth.service";
import cookie from "../../../utils/cookies";

/**
 * Arabic error messages — one map keyed by the backend's stable `code`
 * (see the API contract in mainServer.js). Network/timeout failures NEVER
 * claim "wrong credentials".
 */
const AUTH_ERRORS_AR = {
  VALIDATION_ERROR: "تحقق من صحة البيانات المدخلة.",
  EMAIL_TAKEN: "هذا البريد الإلكتروني مسجل مسبقًا.",
  USERNAME_TAKEN: "اسم المستخدم محجوز مسبقًا، اختر اسمًا آخر.",
  INVALID_CREDENTIALS: "بيانات الدخول غير صحيحة. حاول مجددًا.",
  INVALID_GOOGLE_TOKEN: "فشل التحقق من حساب جوجل. حاول مجددًا.",
  GOOGLE_NOT_REGISTERED: "حساب جوجل غير مسجل بعد. أنشئ حسابًا أولًا.",
  GOOGLE_AUTH_UNAVAILABLE: "خدمة جوجل غير متاحة حاليًا. حاول لاحقًا.",
  RATE_LIMITED: "محاولات كثيرة جدًا. انتظر قليلًا ثم أعد المحاولة.",
  SERVICE_UNAVAILABLE: "الخادم مشغول حاليًا. حاول بعد لحظات — لم يتم إنشاء الحساب.",
  INTERNAL: "حدث خطأ غير متوقع. حاول مجددًا.",
  NETWORK: "تعذر الاتصال بالخادم. تحقق من اتصالك ثم أعد المحاولة.",
  TIMEOUT: "استغرق الطلب وقتًا طويلًا. أعد المحاولة.",
};
const msgFor = (err) => {
  if (err?.code === "ECONNABORTED") return AUTH_ERRORS_AR.TIMEOUT;
  if (!err?.response) return AUTH_ERRORS_AR.NETWORK;
  return AUTH_ERRORS_AR[authErrorCode(err)] || AUTH_ERRORS_AR.INTERNAL;
};

/** Persist the session with ONE canonical token key. */
function storeSession(token, userData, rememberMe) {
  localStorage.setItem("me", JSON.stringify(userData));
  cookie(token); // canonical: cookie + localStorage["token"] + legacy cleanup
  if (!rememberMe) {
    // sessionStorage survives refresh/new tab but not browser close.
    try { sessionStorage.setItem("token", token); } catch { /* ignore */ }
  }
}

export const useAuthForm = (type = "login") => {
  const navigate = useNavigate();

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailGoogle, setEmailGoogle] = useState("");
  const [uidGoogle, setUidGoogle] = useState("");

  // Validation errors
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-auth check if already logged in (never blocks the form; a failure
  // here is NOT an error the user needs to see).
  useEffect(() => {
    let cancelled = false;
    verifyAuthToken()
      .then((data) => {
        if (!cancelled && data?.userData) {
          localStorage.setItem("me", JSON.stringify(data.userData));
          navigate("/");
        }
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogin = useCallback(async () => {
    if (loading) return; // prevent double submit
    if (!username || !password) {
      setErrorMsg("أدخل اسم المستخدم وكلمة المرور.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await signInWithCredentials(username, password);
      if (!data?.accessToken) throw new Error("No token in response");
      storeSession(data.accessToken, data.userData, rememberMe);
      navigate("/");
    } catch (err) {
      console.error("Login error:", authErrorCode(err) || err.message);
      setErrorMsg(msgFor(err));
    } finally {
      setLoading(false);
    }
  }, [username, password, rememberMe, navigate, loading]);

  const handleSignup = useCallback(async () => {
    if (loading) return; // prevent double submit
    const uppercaseRegex = /[A-Z]/;

    if (!fullName || !fullName.trim()) {
      setErrorMsg("أدخل اسمك الكامل.");
      return;
    }
    if (!emailGoogle) {
      setErrorMsg("سجّل عبر جوجل أولًا لتأكيد بريدك الإلكتروني، ثم أكمل إنشاء الحساب.");
      return;
    }
    if (!password || password.length < 8 || !uppercaseRegex.test(password)) {
      setShowPasswordError(true);
      setErrorMsg("كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفًا كبيرًا واحدًا على الأقل.");
      return;
    }
    setShowPasswordError(false);

    if (password !== confirmPassword) {
      setShowConfirmError(true);
      setErrorMsg("كلمتا المرور غير متطابقتين.");
      return;
    }
    setShowConfirmError(false);

    // Normalize: trim + strip leading "@" — the SERVER normalizes/case-folds
    // the uniqueness key; the client only tidies obvious noise.
    const finalUsername = username.trim().replace(/^@+/, "");

    if (!finalUsername || finalUsername.length < 3) {
      setErrorMsg("اسم المستخدم يجب أن يكون 3 أحرف على الأقل (حروف إنجليزية أو عربية، أرقام، نقطة أو شرطة سفلية).");
      return;
    }

    const payload = {
      fullName,
      username: finalUsername,
      password,
      email: emailGoogle,
      uid: uidGoogle,
    };

    setLoading(true);
    setErrorMsg("");
    try {
      const response = await signUpUser(payload);
      const token = response.token || response.accessToken;
      if (!token) throw new Error("No token in response");
      storeSession(token, response.userData, rememberMe);
      navigate("/");
    } catch (err) {
      console.error("Signup error:", authErrorCode(err) || err.message);
      setErrorMsg(msgFor(err));
      // Don't clear the form — the user can fix the specific problem
      // (e.g. USERNAME_TAKEN) and resubmit.
    } finally {
      setLoading(false);
    }
  }, [fullName, username, password, confirmPassword, emailGoogle, uidGoogle, rememberMe, navigate, loading]);

  const handleGoogleAuth = useCallback(async () => {
    if (loading) return; // prevent double submit
    setLoading(true);
    setErrorMsg("");
    try {
      if (type === "signup") {
        const { user, idToken } = await getGoogleFirebaseUser();
        if (user) {
          setEmailGoogle(user.email || "");
          setUidGoogle(user.uid || "");
          if (!fullName && user.displayName) {
            setFullName(user.displayName);
          }
        }
      } else {
        const { apiData } = await signInWithGoogle();
        if (apiData?.accessToken) {
          storeSession(apiData.accessToken, apiData.userData, rememberMe);
          navigate("/");
        }
      }
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") {
        return;
      }
      console.error("Google Auth error:", authErrorCode(err) || err.message);
      setErrorMsg(msgFor(err));
    } finally {
      setLoading(false);
    }
  }, [type, fullName, rememberMe, navigate, loading]);

  return {
    fullName,
    setFullName,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    rememberMe,
    setRememberMe,
    showPasswordError,
    showConfirmError,
    errorMsg,
    loading,
    handleLogin,
    handleSignup,
    handleGoogleAuth,
  };
};

export default useAuthForm;
