# Bayan Platform Architecture Map

This document maps all features, components, hooks, services, socket events, and REST endpoints in the refactored Bayan application.

---

## 1. Feature Map

| Feature | Primary Components | Custom Hooks | Service Layer | Socket Events | REST Endpoints |
|---|---|---|---|---|---|
| **Auth** | `LoginForm`, `SignupForm`, `GoogleAuthButton` | `useAuthForm` | `auth.service.js` | - | `POST /auth`<br>`POST /signin`<br>`POST /signup`<br>`POST /authGoogle` |
| **Feed** | `Feed`, `FeedList`, `FeedItem`, `PostCard`, `ArticleCard`, `FeedUser`, `FeedActions` | `useFeed` | `feed.service.js` | `GET_FEED` (emit)<br>`FEED_RESULT` (on)<br>`NEW_POST` (on) | - |
| **Article** | `ArticleReading`, `ArticleHeader`, `ArticleBody`, `ArticleActions` | `useArticle` | `article.service.js` | - | `POST /savePosts` (via CommentModal) |
| **Post** | `PostReading`, `PostHeader`, `PostBody`, `PostActions` | `usePost` | `post.service.js` | `ENGAGEMENT` (emit) | `POST /savePosts` (via CommentModal) |
| **Profile** | `Profile`, `ProfileHeader`, `ProfileInfo`, `ProfileStats`, `ProfileTabs`, `ProfileEditModal` | `useProfile` | `profile.service.js` | `MYCONTENT` (emit)<br>`CONTENT_RESULT` (on)<br>`followUser` (emit)<br>`unfollowUser` (emit)<br>`newFollower` (on)<br>`lostFollower` (on)<br>`ENGAGEMENT` (emit) | `POST /getuser`<br>`POST /editProfile`<br>`POST /followingUser`<br>`POST /unfollowingUser` |
| **Writer** | `Writer`, `WriterToolbar`, `WriterEditor`, `WriterImages`, `WriterActions` | `useWriter` | `writer.service.js` | - | `POST /saveIdeas`<br>`POST /saveArticle_novels` |
| **Settings** | `SettingsLayout`, `AppearanceSettings`, `NotificationsSettings`, `LanguageSettings`, `AccountSettings`, `CreatorSettings`, `ReadingFocusSettings`, `PremiumSettings`, `StatisticsSettings` | `useSettings` (Context) | `settings.service.js` | - | `GET /settings`<br>`PUT /settings` |

---

## 2. Shared Components Map

| Component | Path | Responsibility | Dependencies |
|---|---|---|---|
| **`Loader`** | `src/components/ui/Loader.jsx` | Circular animated loading indicator | `framer-motion` |
| **`Modal`** | `src/components/ui/Modal.jsx` | Generic animated modal dialog with backdrop | `framer-motion` |
| **`Toggle`** | `src/components/ui/Toggle.jsx` | Accessible boolean switch | Pure CSS tokens |
| **`Top`** | `src/components/layout/Top.jsx` | Fixed top header with logo & user avatar profile link | `useAuth`, `react-router-dom` |
| **`Sidebar`** | `src/components/layout/Sidebar.jsx` | Fixed navigation drawer with channels (`Posts`, `Articles`, `Novels`, `Exams`) & `Settings` | `react-router-dom` |
| **`Content`** | `src/components/layout/Content.jsx` | Main homepage aggregator container | `QuoteSlider`, `Feed`, `Writer` |
| **`QuoteSlider`** | `src/components/common/QuoteSlider.jsx` | Wisdom quote rotation with dynamic background art | `useQuoteSlider`, `framer-motion` |
| **`InterestsModal`** | `src/components/common/InterestsModal.jsx` | First-time interest selection modal | `useSocket`, `useAuth`, `CATEGORIES` |
| **`CommentModal`** | `src/components/common/CommentModal.jsx` | Pop-up comment writer with image attachments | `useCommentForm`, `framer-motion` |

---

## 3. Services & Infrastructure Map

| Service | File Path | Exports | Backend / External System |
|---|---|---|---|
| **API Client** | `src/services/api.service.js` | `api.get`, `api.post`, `api.put`, `api.delete`, `default (apiClient)` | REST Server via `API_BASE_URL` with JWT Interceptor |
| **Firebase Auth** | `src/services/firebaseAuth.service.js` | `db`, `storage`, `auth`, `googleProvider` | Firebase Project `chatweb-2e06a` |
| **Firebase Storage** | `src/services/firebaseStorage.service.js` | `database`, `storage`, `auth` | Firebase Project `tiaralamal` |
| **Storage Service** | `src/services/storage.service.js` | `uploadImages` | Firebase Storage bucket (`images/`) |
| **Settings Service** | `src/services/settings.service.js` | `fetchUserSettings`, `updateUserSettings` | `GET /settings`, `PUT /settings` |
| **Profile Service** | `src/features/profile/services/profile.service.js` | `fetchUserProfile`, `updateUserProfileField`, `followUserApi`, `unfollowUserApi`, `uploadProfileImageBlob`, `getUser`, `updateProfile`, `followUser`, `unfollowUser` | REST API (`/getuser`, `/editProfile`, `/followingUser`, `/unfollowingUser`) & Firebase Storage (`ImagesProfile/`) |
| **Auth Service** | `src/features/auth/services/auth.service.js` | `verifyAuthToken`, `signInWithCredentials`, `signUpUser`, `signInWithGoogle` | REST API (`/auth`, `/signin`, `/signup`, `/authGoogle`) & Firebase Auth |
| **Feed Service** | `src/features/feed/services/feed.service.js` | `requestFeed`, `emitPostEngagement` | Socket.io Server |
| **Article Service** | `src/features/article/services/article.service.js` | `exportArticleToPDF`, `shareArticle` | `html2pdf.js`, Web Share API |
| **Post Service** | `src/features/post/services/post.service.js` | `sharePost` | Web Share API |
| **Writer Service** | `src/features/writer/services/writer.service.js` | `saveArticleOrNovel`, `saveIdeaPost`, `uploadWriterImages` | REST API (`/saveArticle_novels`, `/saveIdeas`) & Firebase Storage |

---

## 4. Socket.io Event Map

```
Client                                                  Socket Server
  ?                                                          ?
  ???????? GET_FEED { userId, type, cursor, limit } ????????>?
  ?<?????? FEED_RESULT { items, nextCursor } ?????????????????
  ?<?????? NEW_POST { post } ?????????????????????????????????
  ?                                                          ?
  ???????? MYCONTENT { idUser, type } ??????????????????????>?
  ?<?????? CONTENT_RESULT [ items ] ??????????????????????????
  ?                                                          ?
  ???????? followUser { idUser, idFollowedUser } ???????????>?
  ?<?????? newFollower ???????????????????????????????????????
  ?                                                          ?
  ???????? unfollowUser { idUser, idFollowedUser } ?????????>?
  ?<?????? lostFollower ??????????????????????????????????????
  ?                                                          ?
  ???????? ENGAGEMENT { contentId, userId, type } ??????????>?
  ?                                                          ?
  ???????? setInterests (userId, selectedInterests) ????????>?
  ?<?????? result { status: "ok" } ???????????????????????????
```

---

## 5. Routes Map

| Route Path | Page / Feature Component | Code-Split Chunk | Description |
|---|---|---|---|
| `/` | `src/pages/Home.jsx` | `HomePage` | Home feed aggregator with QuoteSlider, Feed, and Writer |
| `/signin` | `src/features/auth/components/LoginForm.jsx` | `LoginForm` | User sign-in with username/password or Google |
| `/signup` | `src/features/auth/components/SignupForm.jsx` | `SignupForm` | User registration with validation & Google connect |
| `/settings` | `src/pages/Settings.jsx` | `SettingsPage` | User preferences and appearance settings |
| `/p/:idOtherUser` | `src/features/profile/components/Profile.jsx` | `Profile` | User profile page, statistics, tabs, avatar upload |
| `/:typeArticle` | `src/features/feed/components/Feed.jsx` | `Feed` | Categorized channel feeds (`posts`, `articles`, `novels`, `exams`) |
| `/r/:articleId` | `src/features/article/components/ArticleReading.jsx` | `ArticleReading` | Full-page long-form article reader with PDF export |
| `/rp/:postId` | `src/features/post/components/PostReading.jsx` | `PostReading` | Single post viewer with live socket likes & comments |
