# Bayan Platform Architecture

This document describes the modern **Feature-Based Architecture (FBA)** of the Bayan social knowledge platform.

---

## 1. Architectural Philosophy

Bayan follows a **Feature-Driven, Layered React Architecture**. Code is organized by domain features rather than technical layers alone, maximizing cohesion within features while keeping cross-cutting utilities, shared UI components, and global contexts well-isolated.

```
┌──────────────────────────────────────────────────────────┐
│                     Pages Layer                          │
│          (src/pages/Home.jsx, Settings.jsx)              │
├──────────────────────────────────────────────────────────┤
│                    Routing Layer                         │
│             (src/routes/AppRoutes.jsx)                   │
├──────────────────────────────────────────────────────────┤
│                   Features Layer                         │
│  src/features/                                           │
│  ├── auth/      (LoginForm, SignupForm, GoogleAuth)      │
│  ├── feed/      (Feed, FeedList, FeedItem, Cards)        │
│  ├── article/   (ArticleReading, Header, Body, Actions)  │
│  ├── post/      (PostReading, Header, Body, Actions)     │
│  ├── profile/   (Profile, Header, Info, Stats, Tabs)     │
│  ├── settings/  (SettingsLayout, 8 preference panels)    │
│  └── writer/    (Writer, Toolbar, Editor, Images)        │
├──────────────────────────────────────────────────────────┤
│             Shared Components & Layout Layer             │
│  src/components/                                         │
│  ├── ui/        (Loader, Modal, Toggle)                  │
│  ├── layout/    (Top, Sidebar, Content)                  │
│  └── common/    (QuoteSlider, InterestsModal, Comment)   │
├──────────────────────────────────────────────────────────┤
│           Custom Hooks & Contexts Layer                  │
│  src/hooks/     (useAuth, useCommentForm, useQuoteSlider)│
│  src/contexts/  (SettingsContext)                        │
├──────────────────────────────────────────────────────────┤
│             Services & Infrastructure Layer              │
│  src/services/  (api, firebaseAuth, firebaseStorage)     │
│  src/utils/     (cookies, eventBus, helpers)             │
│  src/constants/ (apiEndpoints, categories, config)       │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Layer Definitions & Responsibilities

### 2.1 Feature Modules (`src/features/`)
Each feature module encapsulates its own UI components, business logic hooks, API/socket services, and scoped stylesheets:

- **`features/auth`**: User authentication, JWT storage, credential forms with password constraints, and Firebase Google popup OAuth.
- **`features/feed`**: Real-time content streaming, infinite scroll cursor pagination, card renderers (`PostCard`, `ArticleCard`), user headers, and engagement buttons (`FeedActions`).
- **`features/article`**: Long-form article presentation, dynamic RTL/LTR text direction detection, Helmet SEO tags, and PDF document generation via `html2pdf.js`.
- **`features/post`**: Short-form post detail view, social metadata, real-time like/unlike Socket.io engagement, and image viewers.
- **`features/profile`**: User profile views, profile picture upload & canvas crop (`react-easy-crop` + Firebase Storage), bio/name inline editing, follower count synchronization, and user content tabs.
- **`features/settings`**: Application preference management including 8 distinct preference panels (Theme, Font Size, Font Family, Direction/Language, Notifications, Quiet Hours, Creator Tools, Reading Goals, and Statistics).
- **`features/writer`**: Multi-format publishing interface supporting Posts, Articles, and Novels with CKEditor classic integration, multi-image upload queue, and dynamic series creation.

### 2.2 Shared Components (`src/components/`)
- **`components/ui/`**: Core reusable UI primitives (`Loader.jsx`, `Modal.jsx`, `Toggle.jsx`).
- **`components/layout/`**: Application scaffolding (`Top.jsx` navigation bar, `Sidebar.jsx` fixed channel sidebar, `Content.jsx` main layout wrapper).
- **`components/common/`**: Domain-agnostic compound widgets (`QuoteSlider.jsx` wisdom rotation, `InterestsModal.jsx` category selector, `CommentModal.jsx` comment composition dialog).

### 2.3 Contexts (`src/contexts/`)
- **`SettingsContext.jsx`**: Global application settings context managing theme (`light` / `dark`), font size (`small` / `medium` / `large`), font family (`Inter`, `Poppins`, `Cairo`), language (`en` / `ar`), notifications, reading goals, and creator options. Automatically synchronizes DOM attributes (`data-theme`, `data-font-size`, `dir`, `--font-primary`) on the root HTML element.

### 2.4 Infrastructure & Services (`src/services/`)
- **`api.service.js`**: Centralized Axios client with automatic Bearer token injection from `js-cookie` / `localStorage`.
- **`firebaseAuth.service.js`**: Primary Firebase App instance (`chatweb-2e06a`) managing Firebase Authentication and Google Auth Provider.
- **`firebaseStorage.service.js`**: Secondary Firebase App instance (`tiaralamal`) managing Firebase Storage buckets for image assets.
- **`storage.service.js`**: Multi-image parallel upload service converting File objects into Firebase Storage download URLs.
- **`settings.service.js`**: REST service for querying and updating user settings.
- **`profile.service.js`**: Feature service for profile queries, updates, follow/unfollow, and avatar storage.

---

## 3. Real-Time Socket.io Architecture

Real-time capabilities are powered by **Socket.io Client** connecting to `REACT_APP_SERVER_API`. Connection lifecycles are managed by `useSocket.js` and feature hooks:

| Socket Event | Direction | Payload | Responsible Module |
|---|---|---|---|
| `GET_FEED` | Client → Server | `{ userId, type, cursor, limit }` | `features/feed/services/feed.service.js` |
| `FEED_RESULT` | Server → Client | `{ items, nextCursor }` | `features/feed/hooks/useFeed.js` |
| `NEW_POST` | Server → Client | Post object | `features/feed/hooks/useFeed.js` |
| `MYCONTENT` | Client → Server | `{ idUser, type }` | `features/profile/hooks/useProfile.js` |
| `CONTENT_RESULT` | Server → Client | Array of content items | `features/profile/hooks/useProfile.js` |
| `ENGAGEMENT` | Client → Server | `{ contentId, userId, type }` | `features/feed/`, `features/post/`, `features/profile/` |
| `followUser` | Client → Server | `{ idUser, idFollowedUser }` | `features/profile/hooks/useProfile.js` |
| `unfollowUser` | Client → Server | `{ idUser, idFollowedUser }` | `features/profile/hooks/useProfile.js` |
| `newFollower` | Server → Client | Notification trigger | `features/profile/hooks/useProfile.js` |
| `lostFollower` | Server → Client | Notification trigger | `features/profile/hooks/useProfile.js` |
| `setInterests` | Client → Server | `(userId, selectedInterests)` | `components/common/InterestsModal.jsx` |
| `result` | Server → Client | `{ status: "ok" }` | `components/common/InterestsModal.jsx` |

---

## 4. Dual Firebase Architecture

To preserve 100% backend compatibility, the application maintains two distinct Firebase configurations:

1. **Firebase Project `chatweb-2e06a`** (`src/services/firebaseAuth.service.js`):
   - Handles user authentication via `getAuth(app)`.
   - Handles `GoogleAuthProvider` for Google Popup sign-in.
   - Primary default app instance.

2. **Firebase Project `tiaralamal`** (`src/services/firebaseStorage.service.js`):
   - Named secondary app instance (`storageApp`).
   - Handles `getStorage(storageApp)` for content image uploads (`images/`) and profile picture avatars (`ImagesProfile/image${userId}.jpg`).

---

## 5. CSS Architecture & Design System

Styles are structured using a modular, token-based design system:

```
src/styles/
├── variables.css   # CSS Custom Properties (Colors, Radii, Shadows, Themes, Font Scales)
├── typography.css  # Webfont Imports (Inter, Poppins, Cairo, Zain) & Type Hierarchy
├── globals.css     # CSS Resets, Native Box Sizing, LTR/RTL Direction rules
├── animations.css  # Keyframe animations (spin, fadeIn, popupSlide, pulse)
└── utilities.css   # Helper classes (flexbox, alignment, spacing)
```

- **Theme Switching**: Supports `data-theme="light"` and `data-theme="dark"` through CSS custom properties.
- **Bi-Directional Layout**: Full native support for Arabic RTL (`dir="rtl"`) and English LTR (`dir="ltr"`).
- **Component Scoping**: Each feature maintains a dedicated style file with BEM naming conventions.

---

## 6. Routing & Code Splitting

Client-side routing is centralized in `src/routes/AppRoutes.jsx` using `react-router-dom` v6:

- Routes are code-split using `React.lazy()` to reduce initial load time:
  - `/` → `HomePage`
  - `/signin` → `LoginForm`
  - `/signup` → `SignupForm`
  - `/settings` → `SettingsPage`
  - `/p/:idOtherUser` → `Profile`
  - `/:typeArticle` → `Feed`
  - `/r/:articleId` → `ArticleReading`
  - `/rp/:postId` → `PostReading`
- All lazy routes are wrapped in a central `<Suspense />` boundary rendering `<Loader />`.

