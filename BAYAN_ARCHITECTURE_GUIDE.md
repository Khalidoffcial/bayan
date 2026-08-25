# 🕊️ Bayan Platform — Master Architecture Guide & Developer Handbook

> **Welcome to the Bayan Platform Architecture Handbook.**  
> This comprehensive guide is written for software engineers, architects, and technical contributors working on the **Bayan** social knowledge platform. It provides an exhaustive, practical breakdown of the application's actual architecture, design patterns, data flows, communication protocols, and step-by-step instructions for extending or modifying the codebase safely.

---

# Table of Contents

1. [Complete Project Map & Directory Responsibilities](#1-complete-project-map--directory-responsibilities)
2. [Architectural Philosophy & Layered Separation](#2-architectural-philosophy--layered-separation)
3. [Deep-Dive: Feature Modules (`src/features/`)](#3-deep-dive-feature-modules-srcfeatures)
4. [How to Add a New Feature (Step-by-Step Tutorial)](#4-how-to-add-a-new-feature-step-by-step-tutorial)
5. [How to Safely Modify an Existing Feature](#5-how-to-safely-modify-an-existing-feature)
6. [Real-World Data Flows Across Bayan](#6-real-world-data-flows-across-bayan)
7. [Real-Time Architecture (Socket.io Protocol)](#7-real-time-architecture-socketio-protocol)
8. [Dual Firebase Architecture & Isolation Rules](#8-dual-firebase-architecture--isolation-rules)
9. [HTTP & REST API Architecture](#9-http--rest-api-architecture)
10. [Authentication & Session Architecture](#10-authentication--session-architecture)
11. [State Management Hierarchy](#11-state-management-hierarchy)
12. [React Contexts & Provider Hierarchy](#12-react-contexts--provider-hierarchy)
13. [Client-Side Routing & Code-Splitting](#13-client-side-routing--code-splitting)
14. [Design System & CSS Architecture](#14-design-system--css-architecture)
15. [Static Assets & Image Optimization](#15-static-assets--image-optimization)
16. [Testing Architecture & Test Writing Guide](#16-testing-architecture--test-writing-guide)
17. [Package Dependencies Breakdown](#17-package-dependencies-breakdown)
18. ["Where Do I Put This?" Decision Matrix](#18-where-do-i-put-this-decision-matrix)
19. ["DO NOT TOUCH THIS" (Architecture-Sensitive Guardrails)](#19-do-not-touch-this-architecture-sensitive-guardrails)
20. [Common Mistakes When Developing in Bayan](#20-common-mistakes-when-developing-in-bayan)
21. [Real Code References Directory](#21-real-code-references-directory)
22. [Beginner-Friendly Conceptual Analogies](#22-beginner-friendly-conceptual-analogies)
23. [Complete Walkthrough: Building a "Notifications" Feature](#23-complete-walkthrough-building-a-notifications-feature)
24. [Complete Walkthrough: Adding a Feature to "Posts"](#24-complete-walkthrough-adding-a-feature-to-posts)
25. [Master High-Level Architecture Diagram](#25-master-high-level-architecture-diagram)
26. [Developer Quick Reference Cheat Sheet](#26-developer-quick-reference-cheat-sheet)

---

# 1. Complete Project Map & Directory Responsibilities

The current repository is strictly organized using **Feature-Based Architecture (FBA)** with clear boundary separation:

```text
bayan_refactored/
├── public/                     # Public HTML entry, static icons, manifest
├── src/
│   ├── assets/                 # Raw static assets
│   │   ├── data/               # Static JSON data files (e.g., wisdoms1.json)
│   │   ├── icons/              # SVG/PNG application icons
│   │   └── images/             # Optimized WebP background artwork & brand assets
│   ├── components/             # Reusable shared components
│   │   ├── common/             # Compound domain-agnostic UI widgets (QuoteSlider, CommentModal, InterestsModal)
│   │   ├── layout/             # Platform skeleton layout (Top header, Sidebar, Content wrapper)
│   │   └── ui/                 # Atomic UI primitives (Loader, Modal, Toggle)
│   ├── constants/              # Centralized immutable configuration constants
│   │   ├── apiEndpoints.js     # API URLs & backend endpoints dictionary
│   │   ├── categories.js       # Content taxonomy categories & series presets
│   │   └── settingsConfig.js   # Theme definitions, font scales, notification keys
│   ├── contexts/               # React Context Providers for global cross-cutting state
│   │   └── SettingsContext.jsx # Theme, typography scale, direction, user preferences
│   ├── features/               # Self-contained domain modules
│   │   ├── article/            # Long-form article reading, SEO tags, PDF export
│   │   ├── auth/               # User authentication, credential forms, Google OAuth
│   │   ├── feed/               # Real-time infinite scroll feed, post/article cards
│   │   ├── post/               # Single post detail view, social cards, live engagement
│   │   ├── profile/            # User profile, statistics, avatar cropping, user tabs
│   │   ├── settings/           # 8 preference panels, settings layout, save status bar
│   │   └── writer/             # Multi-format authoring modal, CKEditor, image queue
│   ├── hooks/                  # Global shared custom hooks (useAuth, useSocket, useQuoteSlider, useCommentForm)
│   ├── pages/                  # Thin route page containers (Home, Settings, Auth, Profile, Feed, Article, Post)
│   ├── routes/                 # Centralized client router (AppRoutes.jsx)
│   ├── services/               # Core infrastructure, API client & Firebase singletons
│   ├── styles/                 # Global design system (variables, globals, typography, animations, utilities)
│   ├── utils/                  # Pure helper functions (cookies, eventBus, helpers)
│   ├── __mocks__/              # Test environment mocks (axios)
│   ├── App.css                 # Root application layout styles
│   ├── App.js                  # Root router wrapper
│   ├── App.test.js             # Root smoke test
│   ├── index.css               # Cascade entry importing design system styles
│   ├── index.js                # React DOM root entry point
│   ├── reportWebVitals.js      # Web vitals telemetry
│   └── setupTests.js           # Jest DOM setup & CKEditor test mocks
├── package.json                # Lean production dependencies & scripts
├── ARCHITECTURE.md             # High-level architecture specification
├── DEPENDENCY_GRAPH.md         # Component dependency graphs & data flows
├── MAP.md                      # Feature component, event & endpoint map
├── PROJECT_STRUCTURE.md        # Complete file system inventory
└── REFACTOR_LOG.md             # Historical refactoring log
```

### Directory Breakdown & Rules

| Directory Path | Primary Responsibility | What Belongs Here | What Does NOT Belong Here | Who Imports From It | What It Depends On |
|---|---|---|---|---|---|
| **`src/features/`** | Autonomous domain units | Feature components, hooks, services, styles, and unit tests | Global layout wrappers, cross-domain generic buttons | `src/pages/`, `src/routes/` | `src/components/`, `src/services/`, `src/hooks/`, `src/styles/` |
| **`src/pages/`** | Thin page route entry points | Ultra-thin wrappers mounting feature components for a route | Business logic, state management, complex JSX | `src/routes/AppRoutes.jsx` | `src/features/` |
| **`src/components/ui/`** | Atomic, domain-agnostic UI | Pure presentational primitives (`Loader`, `Modal`, `Toggle`) | Feature-specific business rules, API requests | All features, layouts, pages | Pure styling / `framer-motion` |
| **`src/components/layout/`** | Application structural chrome | Top navigation bar, Channel sidebar, Content aggregator | Individual card components, settings panels | `src/pages/Home.jsx`, feature views | `src/hooks/useAuth.js`, `react-router-dom` |
| **`src/components/common/`** | Compound reusable widgets | Reusable multi-feature dialogs (`CommentModal`, `InterestsModal`, `QuoteSlider`) | Single-use domain code | Pages, Feed, Profile, Article, Post | `src/hooks/`, `src/services/` |
| **`src/hooks/`** | Shared cross-cutting custom hooks | Hooks consumed by multiple features (`useAuth`, `useSocket`, `useCommentForm`) | Hooks used only in one feature (e.g. `useProfile`) | Features, Layout, Pages | `src/services/`, React core |
| **`src/services/`** | Core infrastructure & singleton clients | API client, Firebase Auth/Storage singletons, global storage service | React hooks, JSX components | Features, Hooks, Contexts | External APIs, Firebase SDKs |
| **`src/contexts/`** | Global application context | React Context Providers (`SettingsContext`) | Feature-local state, ephemeral form inputs | Root `src/index.js`, feature consumers | `src/services/` |
| **`src/constants/`** | Immutable global constants | API endpoints, category taxonomies, settings options | Dynamic application state, functions | Entire application | None |
| **`src/styles/`** | Global design system | CSS variables, typography imports, animations, global resets | Feature-specific component CSS classes | `src/index.css` | None |
| **`src/utils/`** | Pure stateless utility functions | Cookie helpers, event bus, string direction detection | React hooks, JSX elements, API calls | Features, Hooks, Services | `js-cookie` |

---

# 2. Architectural Philosophy & Layered Separation

Bayan is architected using a strict **Unidirectional Layered Flow**:

```text
┌────────────────────────────────────────────────────────┐
│  1. Browser / Router Layer (src/routes/AppRoutes.jsx)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Matches URL
                           ▼
┌────────────────────────────────────────────────────────┐
│  2. Page Layer (src/pages/*.jsx)                       │
└──────────────────────────┬─────────────────────────────┘
                           │ Mounts Root Feature Container
                           ▼
┌────────────────────────────────────────────────────────┐
│  3. Feature Component Layer (src/features/*/components)│
└──────────────────────────┬─────────────────────────────┘
                           │ Consumes Feature State & Handlers
                           ▼
┌────────────────────────────────────────────────────────┐
│  4. Custom Hook Layer (src/features/*/hooks & hooks/)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Executes Business Operations
                           ▼
┌────────────────────────────────────────────────────────┐
│  5. Service Layer (src/features/*/services & services/)│
└──────────────────────────┬─────────────────────────────┘
                           │ Dispatches HTTP / Sockets / Firebase
                           ▼
┌────────────────────────────────────────────────────────┐
│  6. Backend Infrastructure (REST API / Socket / Bucket)│
└────────────────────────────────────────────────────────┘
```

### Why Do These Layers Exist?
1. **Separation of Concerns**: UI rendering is decoupled from state management, and state management is decoupled from network transport.
2. **Testability**: Services can be tested with pure JS mocks; hooks can be tested in isolation; components can be tested with shallow rendering.
3. **Refactoring Safety**: If the backend changes from REST to GraphQL or if Firebase Storage is replaced with S3, **only the Service layer changes**. The components and hooks remain 100% untouched.

### What Happens If Logic is Put in the Wrong Layer?
- ❌ **Putting API calls inside a JSX Component**: Causes duplicate network requests, impossible-to-test components, and tight coupling between UI and transport.
- ❌ **Putting Business Logic in a Page**: Breaks the reusable modularity of features and makes pages bulky.
- ❌ **Putting Feature Logic in `src/hooks/`**: Pollutes the global namespace with code only relevant to one domain.

# 3. Deep-Dive: Feature Modules (`src/features/`)

Bayan divides its core business domains into 7 distinct feature modules in `src/features/`:

```text
src/features/
├── article/
├── auth/
├── feed/
├── post/
├── profile/
├── settings/
└── writer/
```

---

## 3.1 `features/auth/`
* **Purpose**: Manages user login, new account registration, password complexity validation, and Firebase Google OAuth popup integration.
* **Directory Structure**:
  ```text
  features/auth/
  ├── components/
  │   ├── GoogleAuthButton.jsx   # Google sign-in button with brand icon
  │   ├── LoginForm.jsx          # Login form, credentials state, remember-me
  │   └── SignupForm.jsx         # Registration form, uppercase regex validation
  ├── hooks/
  │   └── useAuthForm.js         # Form inputs, error handling, token persistence
  ├── services/
  │   └── auth.service.js        # REST calls (/auth, /signin, /signup) + Firebase popup
  ├── styles/
  │   ├── login.module.css       # Scoped login styles
  │   └── signup.css             # Background overlay & form box styles
  ├── auth.test.js               # Unit tests for LoginForm, SignupForm, GoogleAuthButton
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Interacts with Firebase Auth (`chatweb-2e06a`) and backend `/authGoogle` or `/signin`, writing JWT tokens to `js-cookie` and user metadata to `localStorage.setItem("me")`.

---

## 3.2 `features/feed/`
* **Purpose**: Orchestrates the real-time social timeline, channel feeds (Posts, Articles, Novels, Exams), and engagement triggers (likes, comments, sharing).
* **Directory Structure**:
  ```text
  features/feed/
  ├── components/
  │   ├── ArticleCard.jsx        # Article preview card with title & description
  │   ├── Feed.jsx               # Main feed manager with infinite scroll & modal triggers
  │   ├── FeedActions.jsx        # Like, comment, and share interactive buttons
  │   ├── FeedItem.jsx           # Animated motion wrapper delegating to Post/Article Card
  │   ├── FeedList.jsx           # Mapped list of feed items
  │   ├── FeedUser.jsx           # User avatar, name, handle, and profile link
  │   └── PostCard.jsx           # Rich HTML post card with image preview & date
  ├── hooks/
  │   └── useFeed.js             # Cursor pagination, seenIds duplicate filtering, socket streaming
  ├── services/
  │   └── feed.service.js        # Socket.io event emitters (GET_FEED, ENGAGEMENT)
  ├── styles/
  │   └── feed.css               # Feed layout, card borders, responsive breakpoints
  ├── feed.test.js               # Unit tests for FeedUser, FeedActions, ArticleCard
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Connects to Socket.io via `useSocket.js`, requests paginated streams (`GET_FEED`), listens for real-time additions (`NEW_POST`), and prevents duplicate items using a memory `Set` (`seenIds`).

---

## 3.3 `features/article/`
* **Purpose**: Renders full-page long-form articles with dynamic text direction, SEO meta tags, and PDF document generation.
* **Directory Structure**:
  ```text
  features/article/
  ├── components/
  │   ├── ArticleActions.jsx     # Like, comment, share, and PDF export buttons
  │   ├── ArticleBody.jsx        # Main image banner & HTML body content
  │   ├── ArticleHeader.jsx      # Helmet SEO metadata + Article title/description
  │   └── ArticleReading.jsx     # Composite reader view with back navigation
  ├── hooks/
  │   └── useArticle.js          # Article state, like count tracking, PDF download handler
  ├── services/
  │   └── article.service.js     # html2pdf.js integration and Web Share API
  ├── styles/
  │   └── article.css            # Reader container, typography sizing, responsive rules
  ├── article.test.js            # Unit tests for ArticleHeader, Body, Actions, Reading
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Reads article payloads from React Router navigation state or ID, sets OpenGraph meta tags via `react-helmet-async`, and converts article DOM elements into formatted PDFs.

## 3.4 `features/post/`
* **Purpose**: Displays single-post detail views with live engagement (like/unlike socket broadcasts), comments, and social image cards.
* **Directory Structure**:
  ```text
  features/post/
  ├── components/
  │   ├── PostActions.jsx        # Like, comment, and share buttons
  │   ├── PostBody.jsx           # Formatted post text and attached image
  │   ├── PostHeader.jsx         # User avatar, author names, Twitter/OG meta tags
  │   └── PostReading.jsx        # Composite post view with CommentModal
  ├── hooks/
  │   └── usePost.js             # Post state, Socket.io connection, live like triggers
  ├── services/
  │   └── post.service.js        # Web Share API wrapper
  ├── styles/
  │   └── post.css               # Post reader layout, typography, borders
  ├── post.test.js               # Unit tests for PostHeader, Body, Actions, Reading
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Manages real-time engagement via Socket.io `ENGAGEMENT` event and passes current user ID to `CommentModal`.

---

## 3.5 `features/profile/`
* **Purpose**: User profile management, live follower tracking, tabbed content history, inline bio/name editing, and profile picture avatar cropping via Firebase Storage.
* **Directory Structure**:
  ```text
  features/profile/
  ├── components/
  │   ├── Profile.jsx            # Composite profile manager
  │   ├── ProfileEditModal.jsx   # Interactive canvas image cropper (react-easy-crop)
  │   ├── ProfileHeader.jsx      # Avatar, edit icon, dropdown options
  │   ├── ProfileInfo.jsx        # Editable name/bio inputs and follow/unfollow buttons
  │   ├── ProfileStats.jsx       # Followers and Following count display
  │   └── ProfileTabs.jsx        # Posts, Articles, and Novels tab switcher
  ├── hooks/
  │   └── useProfile.js          # Profile state, crop logic, follow/unfollow handlers
  ├── services/
  │   └── profile.service.js     # REST API (/getuser, /editProfile, /followingUser) + Firebase avatar upload
  ├── styles/
  │   └── profile.css            # Profile container, avatar border, crop modal
  ├── profile.test.js            # Unit tests for Header, Info, Stats, Tabs
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Interacts with Firebase Storage (`tiaralamal`) at `ImagesProfile/image${userId}.jpg` to store avatar blobs, and listens to Socket.io `newFollower` / `lostFollower` events for real-time stat updates.

---

## 3.6 `features/settings/`
* **Purpose**: Comprehensive application preferences and user experience customization across 8 preference panels.
* **Directory Structure**:
  ```text
  features/settings/
  ├── components/
  │   ├── AccountSettings.jsx    # Password change and security controls
  │   ├── AppearanceSettings.jsx # Color theme, font size, font family, live preview
  │   ├── CreatorSettings.jsx    # Comments, analytics, bio, creator preferences
  │   ├── LanguageSettings.jsx   # Language selection (EN/AR), content language filters
  │   ├── NotificationsSettings.jsx # Activity toggles, Quiet Hours time inputs
  │   ├── PremiumSettings.jsx    # Subscription plans & feature comparisons
  │   ├── ReadingFocusSettings.jsx  # Focus mode, hide likes, daily reading goals
  │   ├── SettingsLayout.jsx     # Navigation sidebar, active panel renderer, save bar
  │   └── StatisticsSettings.jsx # Weekly/monthly growth bar charts & streak metrics
  ├── styles/
  │   └── settings.css           # Settings layout, option cards, font cards, save bar
  ├── settings.test.js           # Unit tests for Appearance, Language, Notifications
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Consumes `SettingsContext.jsx`, triggering live CSS variables and DOM attributes (`data-theme`, `dir`, `data-font-size`), while persisting updates via `settings.service.js`.

---

## 3.7 `features/writer/`
* **Purpose**: Content creation studio supporting Posts, long-form Articles, and serialized Novels.
* **Directory Structure**:
  ```text
  features/writer/
  ├── components/
  │   ├── Writer.jsx             # Trigger floating button, backdrop, and authoring modal
  │   ├── WriterActions.jsx      # Cancel and Publish buttons with loading states
  │   ├── WriterEditor.jsx       # CKEditor 5 classic build + Title/Description/Series inputs
  │   ├── WriterImages.jsx       # Multi-image upload queue, remove buttons, full preview
  │   └── WriterToolbar.jsx      # Post / Article / Novels format selector
  ├── hooks/
  │   └── useWriter.js           # Form fields, series creation, image previews, submission
  ├── services/
  │   └── writer.service.js      # REST API (/saveArticle_novels, /saveIdeas) & image upload
  ├── styles/
  │   └── writer.css             # Modal styling, CKEditor theme overrides, upload cards
  ├── writer.test.js             # Unit tests for Toolbar, Actions, Images
  └── index.js                   # Barrel export
  ```
* **Key Responsibility**: Manages CKEditor rich text data, uploads attached image arrays to Firebase Storage via `storage.service.js`, and posts structured payloads to `/saveIdeas` or `/saveArticle_novels`.

# 4. How to Add a New Feature (Step-by-Step Tutorial)

This section provides an exact, reproducible blueprint for creating a new feature in Bayan according to the established architecture.

---

### Example: Adding a "Notifications" Feature

Suppose you need to add a full **Notifications** feature that displays activity alerts, allows marking notifications as read, and receives real-time alerts.

#### Step 1: Create the Feature Directory Structure
Create a dedicated directory under `src/features/notifications/`:
```text
src/features/notifications/
├── components/
│   ├── NotificationItem.jsx    # Single notification card (avatar, text, timestamp)
│   └── NotificationList.jsx    # List container with empty & loading states
├── hooks/
│   └── useNotifications.js     # State, socket listener, mark-as-read handler
├── services/
│   └── notifications.service.js # REST API / Socket triggers
├── styles/
│   └── notifications.css       # Scoped BEM styles
├── notifications.test.js       # Unit tests
└── index.js                    # Barrel export
```

#### Step 2: Register API Endpoints in Constants
Add any necessary REST endpoints to `src/constants/apiEndpoints.js`:
```javascript
// src/constants/apiEndpoints.js
export const API_ENDPOINTS = {
  // ... existing endpoints
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  MARK_NOTIFICATION_READ: `${API_BASE_URL}/notifications/read`,
};
```

#### Step 3: Implement the Service Layer
Create `src/features/notifications/services/notifications.service.js` using the centralized `api.service.js`:
```javascript
// src/features/notifications/services/notifications.service.js
import { api } from "../../../services/api.service";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";

export const fetchNotificationsApi = async () => {
  const response = await api.get(API_ENDPOINTS.NOTIFICATIONS);
  return response.data;
};

export const markNotificationReadApi = async (notificationId) => {
  const response = await api.post(API_ENDPOINTS.MARK_NOTIFICATION_READ, { id: notificationId });
  return response.data;
};
```

#### Step 4: Implement the Custom Hook
Create `src/features/notifications/hooks/useNotifications.js` to manage state, loading, errors, and real-time socket events:
```javascript
// src/features/notifications/hooks/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import useSocket from "../../../hooks/useSocket";
import useAuth from "../../../hooks/useAuth";
import { fetchNotificationsApi, markNotificationReadApi } from "../services/notifications.service";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const socketRef = useSocket();

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchNotificationsApi();
      setNotifications(data || []);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id, loadNotifications]);

  // Real-time socket updates
  useEffect(() => {
    const socket = socketRef.current;
    const handleNewNotification = (item) => {
      setNotifications((prev) => [item, ...prev]);
    };

    socket?.on("NEW_NOTIFICATION", handleNewNotification);
    return () => socket?.off("NEW_NOTIFICATION", handleNewNotification);
  }, [socketRef]);

  const markAsRead = async (id) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  return { notifications, loading, markAsRead, refresh: loadNotifications };
};

export default useNotifications;
```

#### Step 5: Implement Feature Components & Scoped CSS
Create the presentational components in `src/features/notifications/components/`:
```jsx
// src/features/notifications/components/NotificationList.jsx
import React from "react";
import useNotifications from "../hooks/useNotifications";
import Loader from "../../../components/ui/Loader";
import "../styles/notifications.css";

export const NotificationList = () => {
  const { notifications, loading, markAsRead } = useNotifications();

  if (loading) return <Loader />;
  if (!notifications.length) return <p className="notifications-empty">No notifications yet.</p>;

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>
      <ul className="notifications-list">
        {notifications.map((item) => (
          <li
            key={item.id}
            className={`notification-item ${item.read ? "read" : "unread"}`}
            onClick={() => markAsRead(item.id)}
          >
            <span>{item.message}</span>
            <span className="notification-date">{item.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default React.memo(NotificationList);
```

#### Step 6: Create the Page Wrapper in `src/pages/`
Create a thin page container in `src/pages/NotificationsPage.jsx`:
```jsx
// src/pages/NotificationsPage.jsx
import React from "react";
import Top from "../components/layout/Top";
import Sidebar from "../components/layout/Sidebar";
import NotificationList from "../features/notifications/components/NotificationList";

export const NotificationsPage = () => {
  return (
    <div className="notifications-page-layout">
      <Top />
      <Sidebar />
      <main className="notifications-page-content">
        <NotificationList />
      </main>
    </div>
  );
};

export default React.memo(NotificationsPage);
```

#### Step 7: Register the Route in `src/routes/AppRoutes.jsx`
```jsx
// src/routes/AppRoutes.jsx
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));

// Inside <Routes>:
<Route path="/notifications" element={<NotificationsPage />} />
```

#### Step 8: Write Focused Unit Tests
Create `src/features/notifications/notifications.test.js`:
```jsx
// src/features/notifications/notifications.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import { NotificationList } from "./index";

test("renders notification list empty state", () => {
  render(<NotificationList />);
  // Test assertions...
});
```

---

# 5. How to Safely Modify an Existing Feature

When modifying existing code, always follow the **Layer Checklist**:

```text
Step 1: Locate the Route & Page Container
Step 2: Locate the Feature Component in src/features/<feature>/components/
Step 3: Check if changes require new business logic -> Modify src/features/<feature>/hooks/
Step 4: Check if changes require new network endpoints -> Modify src/features/<feature>/services/ & constants/
Step 5: Run tests (npm test) and verify zero regressions
```

### Example A: "I want to add a Bookmark button to Posts"
1. **Component**: Open `src/features/feed/components/FeedActions.jsx` (and `src/features/post/components/PostActions.jsx`).
2. **Prop Interface**: Add `onBookmark` and `bookmarked` boolean props.
3. **Hook**: Open `src/features/feed/components/Feed.jsx` / `useFeed.js` and add the `handleBookmark` handler.
4. **Service**: If persisting to backend, add `bookmarkPostApi` in `src/features/feed/services/feed.service.js`.
5. **DO NOT**: Put direct `axios.post` calls inside `FeedActions.jsx`.

### Example B: "I want to add a new field (e.g., 'estimatedReadTime') to a Post"
Follow the complete end-to-end flow:
```text
Backend Database (stores estimatedReadTime)
  ↓
REST/Socket Payload ({ id, content, estimatedReadTime, ... })
  ↓
Service Layer (src/features/feed/services/feed.service.js receives payload)
  ↓
Hook Layer (useFeed.js receives item in FEED_RESULT and stores in feed state)
  ↓
Component Layer (src/features/feed/components/PostCard.jsx renders <span className="read-time">{item.estimatedReadTime} min read</span>)
  ↓
Styles (src/features/feed/styles/feed.css styles .read-time)
```

# 6. Real-World Data Flows Across Bayan

Understanding how data moves through Bayan ensures you never introduce broken state assumptions.

---

### 6.1 Authentication Flow
```text
User Submits LoginForm / SignupForm
  ↓
useAuthForm hook catches event
  ├── If Credentials: calls auth.service.js -> signInWithCredentials() -> POST /signin
  └── If Google: calls auth.service.js -> signInWithPopup(auth, googleProvider) -> POST /authGoogle
  ↓
Backend validates and returns { accessToken, userData: { id, name, username, imgProfile, ... } }
  ↓
Token Stored:
  ├── If Remember Me checked: cookie(accessToken) (expires in 60 days)
  └── Else: localStorage.setItem("token", accessToken)
  ↓
User Profile Stored:
  localStorage.setItem("me", JSON.stringify(userData))
  ↓
useAuth Hook Broadcasts:
  Components consuming useAuth() automatically receive reactive { user }
  ↓
api.service.js Interceptor:
  Automatically attaches Authorization: Bearer <token> to every future HTTP request
```

---

### 6.2 Real-time Feed Flow
```text
Feed.jsx mounts
  ↓
Initializes useFeed(typeArticle || "posts", user.id)
  ↓
useFeed calls requestFeed() via Socket.io:
  socket.emit("GET_FEED", { userId, type: "posts", cursor: 0, limit: 10 })
  ↓
Socket Server responds with FEED_RESULT:
  { items: [...], nextCursor: 10 }
  ↓
useFeed updates feed state, deduplicating IDs via seenIds Set
  ↓
User scrolls to bottom (window.innerHeight + scrollTop >= scrollHeight - 200)
  ↓
useFeed triggers fetchFeed(cursor) -> requests next page from socket
  ↓
Incoming live posts via NEW_POST socket event:
  Prepended directly to the top of the feed list
```

---

### 6.3 Content Creation Flow (Writer)
```text
User clicks floating Writer trigger
  ↓
Writer.jsx opens animated modal (Framer Motion)
  ↓
useWriter tracks active type ("post", "article", "novels") and CKEditor instance
  ↓
User attaches images:
  File previews generated with URL.createObjectURL(file)
  ↓
User clicks Publish:
  1. uploadWriterImages(images) calls storage.service.js
  2. storage.service.js uploads files in parallel to Firebase Storage (images/<uniqueId>)
  3. Firebase returns download URLs
  4. writer.service.js posts payload to /saveIdeas or /saveArticle_novels
  ↓
Modal closes, input fields reset, object URLs revoked via URL.revokeObjectURL
```

---

### 6.4 User Profile & Avatar Cropping Flow
```text
ProfilePage mounts -> Profile.jsx initializes useProfile()
  ↓
Profile data fetched via profile.service.js -> POST /getuser
  ↓
Follower counts update in real-time via newFollower / lostFollower socket events
  ↓
User uploads new profile picture:
  1. FileReader loads image Data URL
  2. ProfileEditModal opens react-easy-crop canvas
  3. On Save: Canvas draws cropped pixels to JPEG blob
  4. profile.service.js -> uploadProfileImageBlob uploads to Firebase Storage:
     ImagesProfile/image<userId>.jpg
  5. URL returned from Firebase Storage
  6. POST /editProfile updates user record in backend database
  7. localStorage.setItem("me") updated with new avatar URL
```

---

# 7. Real-Time Architecture (Socket.io Protocol)

All real-time communication in Bayan is powered by Socket.io client connecting to `REACT_APP_SERVER_API`. The connection is managed as a clean lifecycle singleton via `src/hooks/useSocket.js`.

### The 12 Immutable Socket.io Events

| Event Name | Direction | Sender | Receiver | Purpose | Payload Structure |
|---|---|---|---|---|---|
| **`GET_FEED`** | Client → Server | `features/feed/services/feed.service.js` | Socket Server | Request paginated feed stream | `{ userId: string, type: string, cursor: number, limit: number }` |
| **`FEED_RESULT`** | Server → Client | Socket Server | `features/feed/hooks/useFeed.js` | Returns paginated items | `{ items: Array<FeedItem>, nextCursor: number \| null }` |
| **`NEW_POST`** | Server → Client | Socket Server | `features/feed/hooks/useFeed.js` | Broadcasts newly published post | `FeedItem Object` |
| **`MYCONTENT`** | Client → Server | `features/profile/hooks/useProfile.js` | Socket Server | Request user's published content by tab | `{ idUser: string, type: "Posts" \| "Articles" \| "Novels" }` |
| **`CONTENT_RESULT`** | Server → Client | Socket Server | `features/profile/hooks/useProfile.js` | Returns user's content history | `Array<ContentItem>` |
| **`followUser`** | Client → Server | `features/profile/hooks/useProfile.js` | Socket Server | Real-time follow notification | `{ idUser: string, idFollowedUser: string }` |
| **`unfollowUser`** | Client → Server | `features/profile/hooks/useProfile.js` | Socket Server | Real-time unfollow notification | `{ idUser: string, idFollowedUser: string }` |
| **`newFollower`** | Server → Client | Socket Server | `features/profile/hooks/useProfile.js` | Increments follower count by +1 | `Trigger signal` |
| **`lostFollower`** | Server → Client | Socket Server | `features/profile/hooks/useProfile.js` | Decrements follower count by -1 | `Trigger signal` |
| **`ENGAGEMENT`** | Client → Server | `feed`, `post`, `profile` | Socket Server | Broadcasts like / unlike action | `{ contentId: string, userId: string, type: "like" \| "unlike" }` |
| **`setInterests`** | Client → Server | `components/common/InterestsModal.jsx` | Socket Server | Submits user interest tags | `(userId: string, selected: { articles: string[], novels: string[] })` |
| **`result`** | Server → Client | Socket Server | `components/common/InterestsModal.jsx` | Confirms interests saved | `{ status: "ok" }` |

> ⚠️ **CRITICAL RULE**: Never rename these event names or alter their payload shapes without coordinating a simultaneous backend release.

---

# 8. Dual Firebase Architecture & Isolation Rules

Bayan intentionally communicates with **two distinct Firebase projects**. This architecture was designed to separate authentication services from high-throughput media storage buckets.

```text
               Bayan Application
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  Firebase Auth App           Firebase Storage App
 (chatweb-2e06a)             (tiaralamal - storageApp)
         │                           │
  src/services/               src/services/
  firebaseAuth.service.js     firebaseStorage.service.js
         │                           │
  ├── getAuth()               ├── getStorage()
  ├── GoogleAuthProvider()    └── getDatabase()
  └── Used for: User Login,   └── Used for: Content Images,
      Sign up, Google OAuth       Profile Avatars
```

### 1. Firebase Auth Service (`src/services/firebaseAuth.service.js`)
- **Project ID**: `chatweb-2e06a`
- **Responsibilities**: Initializes the default Firebase App instance, exports `auth`, `googleProvider`, and `db`.
- **Used by**: `src/features/auth/services/auth.service.js`.

### 2. Firebase Storage Service (`src/services/firebaseStorage.service.js`)
- **Project ID**: `tiaralamal`
- **Responsibilities**: Initializes a named secondary Firebase App (`"storageApp"`), exports `storage`, `database`, and `auth`.
- **Used by**: `src/services/storage.service.js` and `src/features/profile/services/profile.service.js`.

> ⚠️ **CRITICAL RULE**: **NEVER MERGE THESE TWO FILES**. They authenticate against two completely different Google Cloud / Firebase tenants. Merging them will break image uploads or invalidate user authentication tokens.

# 9. HTTP & REST API Architecture

### 9.1 The Centralized API Client (`src/services/api.service.js`)
All HTTP communication passes through an Axios singleton configured with automatic authentication interceptors:

```javascript
// src/services/api.service.js
import axios from "axios";
import cookie from "../utils/cookies";
import { API_BASE_URL } from "../constants/apiEndpoints";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Automatic JWT Token Injection
apiClient.interceptors.request.use((config) => {
  const token = cookie("get") || localStorage.getItem("token") || localStorage.getItem("Token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
};
```

### 9.2 API Endpoints Directory (`src/constants/apiEndpoints.js`)
Endpoints are centralized in one single configuration file:
- `API_BASE_URL`: Resolves `process.env.REACT_APP_SERVER_API` with production fallback.
- `API_ENDPOINTS.AUTH`: `${API_BASE_URL}/auth`
- `API_ENDPOINTS.SIGNIN`: `${API_BASE_URL}/signin`
- `API_ENDPOINTS.SIGNUP`: `${API_BASE_URL}/signup`
- `API_ENDPOINTS.AUTH_GOOGLE`: `${API_BASE_URL}/authGoogle`
- `API_ENDPOINTS.GET_USER`: `${API_BASE_URL}/getuser`
- `API_ENDPOINTS.EDIT_PROFILE`: `${API_BASE_URL}/editProfile`
- `API_ENDPOINTS.FOLLOW_USER`: `${API_BASE_URL}/followingUser`
- `API_ENDPOINTS.UNFOLLOW_USER`: `${API_BASE_URL}/unfollowingUser`
- `API_ENDPOINTS.SAVE_POSTS`: `${API_BASE_URL}/savePosts`
- `API_ENDPOINTS.SAVE_ARTICLE_NOVELS`: `${API_BASE_URL}/saveArticle_novels`
- `API_ENDPOINTS.SAVE_IDEAS`: `${API_BASE_URL}/saveIdeas`
- `API_ENDPOINTS.SETTINGS`: `${API_BASE_URL}/settings`

---

# 10. Authentication & Session Architecture

### How to Access the Logged-In User in Any Component:
Always consume the `useAuth()` hook from `src/hooks/useAuth.js`:

```jsx
// ✅ CORRECT WAY
import useAuth from "../../../hooks/useAuth";

const MyComponent = () => {
  const { user, updateLocalUser } = useAuth();
  
  if (!user) return <p>Please log in</p>;
  return <h1>Welcome, {user.name} ({user.id})</h1>;
};
```

```jsx
// ❌ INCORRECT (Anti-pattern from old codebase)
const user = JSON.parse(localStorage.getItem("me"));
```

### Token Storage Strategy:
- **Temporary Session**: When "Remember Me" is unchecked, token is written to `localStorage.setItem("token", accessToken)`.
- **Persistent Session**: When "Remember Me" is checked, token is written to secure cookie via `cookie(accessToken)` expiring in 60 days.
- **Auto-Auth Validation**: When `HomePage.jsx` mounts, it verifies the token against `/auth` and updates `localStorage.getItem("me")`.

---

# 11. State Management Hierarchy

Bayan purposely avoids external global stores (like Redux or MobX), relying on a lightweight, performant native React state hierarchy:

| State Layer | Technology | Typical Data | When to Use | When NOT to Use |
|---|---|---|---|---|
| **Local Component State** | `useState`, `useReducer` | Form inputs, modal open/close, active tabs, UI toggles | Ephemeral UI interactions | Data needed across distant routes |
| **Global Theme/UI Context** | `SettingsContext.jsx` | Theme (`light`/`dark`), Font Size, Direction (`rtl`/`ltr`), Preferences | Settings that affect the entire DOM | High-frequency rapidly mutating data |
| **Auth State** | `useAuth.js` + `localStorage` | Current user profile, user ID, avatar URL, session token | Checking permissions, showing profile pic in Top header | Storing entire feed lists |
| **Real-time Server State** | `useSocket.js` + Socket.io | Active feed timeline, live likes, live follower counts | Streams, chat messages, live notifications | Static content |
| **Persistent Cookie State** | `js-cookie` (`src/utils/cookies.js`) | JWT Auth token with 60-day expiry | Long-term session persistence | Ephemeral UI flags |

---

# 12. React Contexts & Provider Hierarchy

The application context hierarchy mounts in `src/index.js` and wraps all routes:

```text
ReactDOM.createRoot()
  ↓
<React.StrictMode>
  ↓
  <SettingsProvider>              (src/contexts/SettingsContext.jsx)
    ↓
    <HelmetProvider>              (react-helmet-async for SEO meta tags)
      ↓
      <App />                     (src/App.js)
        ↓
        <BrowserRouter>           (react-router-dom)
          ↓
          <Suspense fallback={<Loader />}>
            ↓
            <AppRoutes />         (src/routes/AppRoutes.jsx)
              ↓
              <PageWrapper />     (src/pages/*.jsx)
                ↓
                <FeatureComponent /> (src/features/*)
```

### `SettingsContext.jsx` Features:
1. Loads settings from backend on mount (`GET /settings`).
2. Syncs attributes to `document.documentElement`:
   - `data-theme`: `light` or `dark`
   - `data-font-size`: `small`, `medium`, or `large`
   - `dir`: `rtl` (when Arabic) or `ltr` (when English)
   - `--font-primary`: CSS custom property for active font family.
3. Automatically triggers debounced saving on preference changes.

# 13. Client-Side Routing & Code-Splitting

Routing is centralized in `src/routes/AppRoutes.jsx`. Every route utilizes `React.lazy()` for automatic code-splitting:

| Route Path | Page Container | Feature Component | Description | Auth Required? |
|---|---|---|---|:---:|
| `/` | `src/pages/Home.jsx` | `QuoteSlider`, `Feed`, `Writer` | Main discovery timeline & creator trigger | Yes (Token verified) |
| `/signin` | `src/pages/LoginPage.jsx` | `src/features/auth/components/LoginForm.jsx` | User login & Google OAuth | No (Public) |
| `/signup` | `src/pages/SignupPage.jsx` | `src/features/auth/components/SignupForm.jsx` | Registration & verification | No (Public) |
| `/settings` | `src/pages/Settings.jsx` | `src/features/settings/components/SettingsLayout.jsx` | 8 preferences panels | Yes |
| `/p/:idOtherUser` | `src/pages/ProfilePage.jsx` | `src/features/profile/components/Profile.jsx` | User profile, stats & content tabs | Optional |
| `/:typeArticle` | `src/pages/FeedPage.jsx` | `src/features/feed/components/Feed.jsx` | Channel feeds (`posts`, `articles`, `novels`, `exams`) | Optional |
| `/r/:articleId` | `src/pages/ArticlePage.jsx` | `src/features/article/components/ArticleReading.jsx` | Full article reader + PDF export | Optional |
| `/rp/:postId` | `src/pages/PostPage.jsx` | `src/features/post/components/PostReading.jsx` | Single post viewer + live likes | Optional |

---

# 14. Design System & CSS Architecture

Styles are organized using **Cascading Design Tokens and Scoped BEM**:

```text
src/styles/
├── variables.css     # Design tokens: CSS variables for colors, radii, shadows, font scales
├── typography.css    # Webfont imports (@import Cairo, Inter, Poppins, Zain) & heading scales
├── globals.css       # Native element resets, box-sizing, RTL/LTR layout rules
├── animations.css    # Unified keyframe animations (spin, fadeIn, popupSlide, pulse)
└── utilities.css     # Helper classes (flex, flex-col, items-center, justify-between)
```

### 14.1 Design Tokens (`src/styles/variables.css`)
```css
:root {
  --blue: #0097d9;
  --teal: #27ade2;
  --purple: #7F77DD;
  --gold: #f59e0b;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --font-primary: "Inter", sans-serif;
  --sidebar-w: 260px;
  --header-height: 50px;
}

/* Dynamic Themes */
[data-theme="light"] {
  --bg: #F6F5F2;
  --text: #1A1B22;
  --card-bg: rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] {
  --bg: #0C0D10;
  --text: #E8E9F0;
  --card-bg: rgba(255, 255, 255, 0.03);
}
```

### 14.2 RTL / LTR Directional System
Arabic layout (`dir="rtl"`) and English layout (`dir="ltr"`) automatically adjust flex orientations and borders:
```css
html[dir="rtl"] .settings-layout { flex-direction: row; }
html[dir="ltr"] .settings-layout { flex-direction: row-reverse; }
```

---

# 15. Static Assets & Image Optimization

Assets are partitioned by type:
- **`src/assets/data/`**: Static JSON databases (`wisdoms1.json` quote collection).
- **`src/assets/icons/`**: Navigation and channel icons (`all.png`, `post.png`, `article.png`, `novel.png`, `exam.png`, `setting.png`, `logo.jpeg`).
- **`src/assets/images/`**: High-performance **WebP background artwork** (`4.webp` through `13.webp`) optimized to 82% quality and max $1920\times 1080$ resolution for the `QuoteSlider` component.

### Rules for Adding New Assets:
1. Always convert photographic backgrounds to `.webp` before adding to `src/assets/images/`.
2. Do not store binary database files (e.g. SQLite `.db` files) inside `src/assets/`.
3. Import images via ES module imports (`import img from '../assets/images/name.webp'`) so webpack bundles and hashes them correctly.

---

# 16. Testing Architecture & Test Writing Guide

Bayan uses **Jest** and **React Testing Library** with full feature test coverage.

### Available Test Suites:
- `src/App.test.js`: Root application mounting and context providers.
- `src/features/auth/auth.test.js`: Login, signup, and Google auth button.
- `src/features/feed/feed.test.js`: Feed cards, actions, and user info.
- `src/features/article/article.test.js`: Article reader, header, body, and actions.
- `src/features/post/post.test.js`: Post reader, body, user info, and actions.
- `src/features/profile/profile.test.js`: Profile header, editable bio, stats, and tabs.
- `src/features/writer/writer.test.js`: Writer toolbar, actions, and upload cards.
- `src/features/settings/settings.test.js`: Appearance, language, and notification panels.

### Template for Writing a New Feature Test:
```jsx
// src/features/my-feature/my-feature.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyFeatureComponent } from './index';

describe('My Feature Component', () => {
  test('renders expected content and triggers click handlers', () => {
    const handleAction = jest.fn();
    render(
      <BrowserRouter>
        <MyFeatureComponent onAction={handleAction} />
      </BrowserRouter>
    );

    expect(screen.getByText(/my feature/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleAction).toHaveBeenCalled();
  });
});
```

# 17. Package Dependencies Breakdown

Bayan maintains a lean, optimized dependency graph in `package.json`:

| Category | Package | Version | Purpose & Usage | Preferred Alternative (Do NOT add duplicates) |
|---|---|---|---|---|
| **Core** | `react`, `react-dom` | `^18.3.1` | UI Library & Virtual DOM | - |
| **Routing** | `react-router-dom` | `^6.27.0` | Client-side routing & navigation | Do NOT add other routers |
| **Animation** | `framer-motion` | `^10.18.0` | Declarative transitions, modals, quote slider | Do NOT add `gsap` or `lottie` |
| **Editor** | `@ckeditor/ckeditor5-react`<br>`@ckeditor/ckeditor5-build-classic` | `^9.3.1`<br>`^43.2.0` | Rich text article & novel editing | Do NOT add `quill` or `tinymce` |
| **Icons** | `react-icons` | `^5.5.0` | Feather, FontAwesome, Material icons | Do NOT add `@fortawesome/*` |
| **Image Cropping** | `react-easy-crop` | `^5.5.0` | Interactive canvas profile image cropper | Do NOT add other croppers |
| **SEO Meta** | `react-helmet-async` | `^2.0.5` | Dynamic OpenGraph & Twitter tags | Do NOT add `react-helmet` (deprecated) |
| **Networking** | `axios`<br>`socket.io-client` | `^1.9.0`<br>`^4.8.1` | REST HTTP client & Real-time WebSockets | Do NOT use raw fetch without interceptors |
| **Auth & Cloud** | `firebase` | `^12.12.1` | Dual Firebase Auth & Storage buckets | - |
| **Cookies** | `js-cookie` | `^3.0.5` | Secure JWT token persistence | - |
| **Testing** | `@testing-library/react`<br>`@testing-library/jest-dom` | `^13.4.0`<br>`^5.17.0` | Unit & integration component testing | - |

---

# 18. "Where Do I Put This?" Decision Matrix

Use this decision table whenever you are unsure where a new file belongs:

| What do you want to create? | Exact Destination Directory | Example File Path |
|---|---|---|
| **A new URL Route Container** | `src/pages/` | `src/pages/ExplorePage.jsx` |
| **A new self-contained Domain Module** | `src/features/<feature-name>/` | `src/features/explore/` |
| **Feature-specific UI Component** | `src/features/<feature-name>/components/` | `src/features/explore/components/ExploreList.jsx` |
| **Feature-specific Business Logic** | `src/features/<feature-name>/hooks/` | `src/features/explore/hooks/useExplore.js` |
| **Feature-specific API / Transport calls** | `src/features/<feature-name>/services/` | `src/features/explore/services/explore.service.js` |
| **Feature-specific Styles** | `src/features/<feature-name>/styles/` | `src/features/explore/styles/explore.css` |
| **A reusable UI primitive (Button, Tag, Badge)** | `src/components/ui/` | `src/components/ui/Badge.jsx` |
| **A shared multi-feature modal or carousel** | `src/components/common/` | `src/components/common/ShareModal.jsx` |
| **App shell layout (Navbar, Footer, Drawer)** | `src/components/layout/` | `src/components/layout/Navbar.jsx` |
| **A hook used across 3 or more features** | `src/hooks/` | `src/hooks/useDebounce.js` |
| **A global singleton service (Analytics, Logger)**| `src/services/` | `src/services/analytics.service.js` |
| **New API endpoint definition** | `src/constants/apiEndpoints.js` | Add key to `API_ENDPOINTS` |
| **Global Design System token or reset** | `src/styles/` | `src/styles/variables.css` |
| **Pure mathematical or string utility** | `src/utils/` | `src/utils/dateFormatter.js` |
| **Static photographic background** | `src/assets/images/` | Convert to `.webp` first! |

---

# 19. "DO NOT TOUCH THIS" (Architecture-Sensitive Guardrails)

Do NOT modify or combine the following critical contracts:

1. 🛑 **Dual Firebase Configuration**:
   - `src/services/firebaseAuth.service.js` (`chatweb-2e06a`) and `src/services/firebaseStorage.service.js` (`tiaralamal`) must remain separate Firebase instances.
2. 🛑 **The 12 Socket.io Event Contracts**:
   - `GET_FEED`, `FEED_RESULT`, `NEW_POST`, `MYCONTENT`, `CONTENT_RESULT`, `followUser`, `unfollowUser`, `newFollower`, `lostFollower`, `ENGAGEMENT`, `setInterests`, `result`.
3. 🛑 **API Interceptor Token Format**:
   - `apiClient.interceptors.request` relies on checking `cookie("get")` or `localStorage.getItem("token")` to inject `Authorization: Bearer <token>`.
4. 🛑 **DOM Theme Attribute Injections**:
   - `SettingsContext.jsx` injects `data-theme`, `dir`, and `data-font-size` into `document.documentElement`. Changing attribute names breaks global CSS variables in `variables.css`.

---

# 20. Common Mistakes When Developing in Bayan

### ❌ Anti-Pattern 1: Hardcoding Network Endpoints
```jsx
// ❌ BAD: Hardcoded development IP
axios.post("http://192.168.1.9:4000/savePosts", data);

// ✅ GOOD: Use centralized constants
import { api } from "../../../services/api.service";
import { API_ENDPOINTS } from "../../../constants/apiEndpoints";
api.post(API_ENDPOINTS.SAVE_POSTS, data);
```

### ❌ Anti-Pattern 2: Manually Parsing `localStorage.getItem("me")`
```jsx
// ❌ BAD: Fragile manual JSON parsing in components
const userId = JSON.parse(localStorage.getItem("me"))?.id;

// ✅ GOOD: Use reactive useAuth hook
import useAuth from "../../../hooks/useAuth";
const { user } = useAuth();
const userId = user?.id;
```

### ❌ Anti-Pattern 3: Writing Business Logic Directly in JSX Components
```jsx
// ❌ BAD: Placing socket listeners, state filters, and API calls in JSX file
const MyComponent = () => {
  useEffect(() => {
    socket.on("EVENT", () => { ... });
  }, []);
};

// ✅ GOOD: Extract to custom hook in features/<feature>/hooks/
const MyComponent = () => {
  const { data, loading } = useMyFeature();
};
```

# 21. Real Code References Directory

Use these verified file paths from the repository as exact templates when creating or modifying code:

- **Authentication Service**: `src/features/auth/services/auth.service.js`
- **Authentication Hook**: `src/features/auth/hooks/useAuthForm.js`
- **Socket Streaming Hook**: `src/features/feed/hooks/useFeed.js`
- **Socket Emitter Service**: `src/features/feed/services/feed.service.js`
- **Canvas Image Crop Hook**: `src/features/profile/hooks/useProfile.js`
- **Firebase Image Upload Service**: `src/services/storage.service.js`
- **Global Settings Context**: `src/contexts/SettingsContext.jsx`
- **Central API Client**: `src/services/api.service.js`
- **Application Routing**: `src/routes/AppRoutes.jsx`
- **Design Tokens**: `src/styles/variables.css`
- **Global Theme Cascades**: `src/index.css`
- **Axios Test Mock**: `src/__mocks__/axios.js`

---

# 22. Beginner-Friendly Conceptual Analogies

To understand Bayan intuitively, think of the architecture as a **modern digital publishing house**:

### 1. `routes/` = The Front Reception Desk
> *الريسبشن اللي بيستقبل الزائر ويوجهه للمكتب الصح حسب الرابط (URL).*  
> When the user navigates to `/r/123`, `AppRoutes.jsx` reads the URL and directs the browser to `ArticlePage`.

### 2. `pages/` = The Room Doors
> *الباب الخارجي للغرفة. مجرد مدخل خفيف جداً يجمع الواجهة بدون تعقيد.*  
> Pages are thin boundaries that mount the feature components without containing internal business logic.

### 3. `features/` = The Specialized Departments
> *الأقسام المستقلة (قسم المقالات، قسم البروفايل، قسم المنشورات).*  
> Every feature module has its own presentation team (`components/`), thinking team (`hooks/`), and transport messengers (`services/`).

### 4. `services/` = The Dispatch & Courier Office
> *المكتب المسؤول عن الاتصال بالعالم الخارجي (السيرفر، قواعد البيانات، الفايربيس).*  
> Components and hooks never talk directly to HTTP or Firebase; they send requests through the service layer.

---

# 23. Complete Walkthrough: Building a "Notifications" Feature

Here is the exact step-by-step checklist when creating a new feature from scratch:

```text
1. Create directory src/features/notifications/
2. Create src/features/notifications/services/notifications.service.js
   └─ Uses api from src/services/api.service.js
3. Create src/features/notifications/hooks/useNotifications.js
   └─ Uses useAuth() and useSocket() for real-time alerts
4. Create src/features/notifications/styles/notifications.css
   └─ Uses CSS tokens from src/styles/variables.css
5. Create src/features/notifications/components/NotificationList.jsx
   └─ Consumes useNotifications() and renders UI
6. Create barrel export src/features/notifications/index.js
7. Create page wrapper src/pages/NotificationsPage.jsx
8. Add route to src/routes/AppRoutes.jsx:
   └─ const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
   └─ <Route path="/notifications" element={<NotificationsPage />} />
9. Create test src/features/notifications/notifications.test.js
10. Run tests: npm test -- --watchAll=false
```

---

# 24. Complete Walkthrough: Adding a Feature to "Posts"

Follow this workflow when modifying an existing feature (e.g. adding a "Save / Bookmark" button to Posts):

1. **Locate the Feature**: `src/features/post/` and `src/features/feed/`.
2. **Update the Action Component**: Open `src/features/feed/components/FeedActions.jsx` and add the bookmark button icon.
3. **Update the Service**: Open `src/features/feed/services/feed.service.js` and add `bookmarkPostApi(postId)`.
4. **Update the State/Hook**: In `src/features/feed/hooks/useFeed.js`, add `handleBookmark(postId)` handler calling the service.
5. **Update Unit Tests**: Open `src/features/feed/feed.test.js`, add a test asserting that clicking the Bookmark button triggers `handleBookmark`.
6. **Verify with Linter & Test Suite**: Run `npx eslint src` and `npm test -- --watchAll=false`.

---

# 25. Master High-Level Architecture Diagram

```text
                             Bayan Platform Root (src/index.js)
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             SettingsProvider Context                    HelmetProvider (SEO)
           (src/contexts/SettingsContext)                          │
                       │                                           ▼
                       └───────────────────────────────► App Component (src/App.js)
                                                                   │
                                                                   ▼
                                                       BrowserRouter Router
                                                                   │
                                                                   ▼
                                                       Suspense (Loader fallback)
                                                                   │
                                                                   ▼
                                                      AppRoutes (src/routes/AppRoutes)
                                                                   │
              ┌───────────────────────────┬────────────────────────┴───────────────────────────┐
              ▼                           ▼                                                     ▼
        HomePage.jsx               SettingsPage.jsx                                      ProfilePage.jsx
       (src/pages/Home)         (src/pages/Settings)                                  (src/pages/ProfilePage)
              │                           │                                                     │
              ▼                           ▼                                                     ▼
         Content.jsx               SettingsLayout                                            Profile
   (src/components/layout)    (src/features/settings)                                 (src/features/profile)
              │                           │                                                     │
       ┌──────┴──────┐                    │                                              ┌──────┴──────┐
       ▼             ▼                    ▼                                              ▼             ▼
  QuoteSlider       Feed           SettingsPanels                                  useProfile()    ProfileTabs
 (components/     (features/    (Appearance, Account,                              (features/     (components)
   common)          feed)         Notifications...)                                 profile)           │
       │             │                    │                                              │             ▼
       ▼             ▼                    ▼                                              │          FeedList
 useQuoteSlider   useFeed()       useSettings Context                                    │       (features/feed)
                     │                    │                                              │
                     └─────────────┬──────┴──────────────────────────────────────────────┘
                                   │
                                   ▼
                   Services & Transport Layer (src/services/)
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
     API Client              Firebase Auth           Firebase Storage
 (services/api.service)   (services/firebaseAuth)  (services/firebaseStorage)
          │                        │                        │
          ▼                        ▼                        ▼
   Node/Express REST           Firebase Cloud          Firebase Storage
     Backend Server         (chatweb-2e06a)           (tiaralamal)
```

---

# 26. Developer Quick Reference Cheat Sheet

```text
┌──────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Question / Task                              │ Exact Location / Action                         │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Need to create a new page for a URL?         │ Create thin wrapper in src/pages/               │
│ Need to register a new route?                │ Add lazy Route in src/routes/AppRoutes.jsx      │
│ Need to create a new feature?                │ Create self-contained folder in src/features/   │
│ Need to add UI components for a feature?     │ Put in src/features/<feature>/components/       │
│ Need to add state/effects for a feature?     │ Put in src/features/<feature>/hooks/            │
│ Need to make a REST request?                 │ Use api from src/services/api.service.js        │
│ Need to define a new API URL?                │ Add key to src/constants/apiEndpoints.js        │
│ Need to get the current logged-in user?      │ Use const { user } = useAuth() from src/hooks/  │
│ Need to upload images to Firebase?           │ Use uploadImages from src/services/storage      │
│ Need a real-time socket connection?          │ Use useSocket() from src/hooks/useSocket.js     │
│ Need a generic loading spinner?              │ Use <Loader /> from src/components/ui/Loader    │
│ Need an animated popup dialog?               │ Use <Modal /> from src/components/ui/Modal      │
│ Need an iOS-style toggle switch?             │ Use <Toggle /> from src/components/ui/Toggle    │
│ Need to add global CSS variables?            │ Edit src/styles/variables.css                   │
│ Need to write unit tests for a feature?      │ Create <feature>.test.js inside the feature dir │
│ Need to verify test suite and linting?       │ Run npm test -- --watchAll=false && eslint src  │
└──────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

> **End of Guide.**  
> *Bayan Platform — Built with clean architecture, high maintainability, and zero unnecessary complexity.*
