# ??? Bayan Space

<div align="center">

### *A place for knowledge, creativity, meaningful conversations, and real human growth.*

**Website:** https://bayan-space.vercel.app

> **Escape the noise. Build your mind. Connect with creators.**

---

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Architecture](https://img.shields.io/badge/Architecture-Feature--Based-blue)
![Firebase](https://img.shields.io/badge/Firebase-v12-FFCA28?logo=firebase)
![Socket.io](https://img.shields.io/badge/Socket.io-v4-010101?logo=socket.io)
![Status](https://img.shields.io/badge/Status-Refactored%20%26%20Verified-success)

</div>

---

## ?? About Bayan Space

**Bayan Space** is an alternative to today's internet, where attention is constantly stolen by endless scrolling, fake lifestyles, misleading content, and superficial engagement.

Our goal is simple:

> **Create a place where knowledge matters more than popularity, ideas matter more than algorithms, and real growth matters more than virtual attention.**

---

## ?? Main Platform Features

- **?? Posts**: Share valuable ideas, discussions, and insights in a distraction-free feed.
- **?? Articles**: Publish and read formatted, long-form articles with PDF export support.
- **?? Novels**: Organize and publish serialized novel chapters and creative literature.
- **?? Spaces & Channels**: Filter content across Posts, Articles, Novels, and Exams.
- **?? User Profiles**: Manage profile details, avatar cropping with canvas tools, follow/unfollow creators, and view user publication history.
- **?? Multi-Format Writer**: Compose posts, articles, and novels with CKEditor classic integration and multi-image uploads.
- **?? Advanced Settings**: Personalize themes (light/dark), typography font families (`Inter`, `Poppins`, `Cairo`), font sizes, reading goals, notification quiet hours, and creator options with instant DOM synchronization.

---

## ?? Technology Stack

### Frontend & Core
- **React 18.3.1**: Modern functional component architecture.
- **React Router 6.27.0**: Centralized lazy-loaded routing with code-splitting and Suspense.
- **Framer Motion 10.18.0**: Declarative animations, page transitions, and modal dialogs.
- **React Helmet Async 2.0.5**: Dynamic SEO meta tag management for social sharing.
- **CKEditor 5**: Rich text content authoring.
- **React Easy Crop 5.5.0**: Interactive profile image cropping.

### Real-Time & Backend Communication
- **Socket.io Client 4.8.1**: Real-time bidirectional streaming for feeds, likes, and follower updates.
- **Axios 1.9.0**: HTTP REST client with JWT Bearer token request interceptor.
- **js-cookie 3.0.5**: Secure token cookie persistence.

### Cloud & Database
- **Firebase Auth (`chatweb-2e06a`)**: User authentication and Google OAuth Provider.
- **Firebase Storage (`tiaralamal`)**: Cloud image storage buckets for posts and user avatars.

---

## ?? Project Architecture

The application is structured using **Feature-Based Architecture (FBA)**:

```text
src/
??? assets/          # Static icons, images, and JSON data
??? components/
?   ??? common/      # Shared compound components (QuoteSlider, InterestsModal, CommentModal)
?   ??? layout/      # Application layout scaffolding (Top, Sidebar, Content)
?   ??? ui/          # Reusable UI primitives (Loader, Modal, Toggle)
??? constants/       # Centralized API endpoints, categories, and settings configs
??? contexts/        # React Context providers (SettingsContext)
??? features/        # Self-contained domain features (components, hooks, services, styles, tests)
?   ??? article/     # Article reader, SEO tags, PDF export
?   ??? auth/        # Login, Signup, Google OAuth
?   ??? feed/        # Real-time infinite scroll feed, post cards, article cards
?   ??? post/        # Single post viewer, live likes
?   ??? profile/     # User profile, statistics, avatar crop
?   ??? settings/    # Appearance, language, notification panels
?   ??? writer/      # Content authoring modal, CKEditor, image queue
??? hooks/           # Shared cross-feature custom hooks (useAuth, useCommentForm, useSocket, useQuoteSlider)
??? pages/           # High-level route views (Home.jsx, Settings.jsx)
??? routes/          # Centralized router configuration (AppRoutes.jsx)
??? services/        # Core infrastructure (api.service, firebaseAuth, firebaseStorage, storage)
??? styles/          # Design system tokens, variables, typography, resets, animations, utilities
??? utils/           # Helper functions (cookies, eventBus, getDirection, generateID)
```

---

## ?? Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or pnpm / yarn

### Installation
```bash
# Clone repository
git clone https://github.com/Khalidoffcial/bayan.git

# Navigate to project directory
cd bayan_refactored

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env` file in the project root:
```env
REACT_APP_SERVER_API=https://bayan-production-d773.up.railway.app
```

### Available Scripts

#### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

#### `npm test`
Runs the automated unit and integration test suite using Jest and React Testing Library:
```bash
npm test -- --watchAll=false
```

#### `npm run build`
Builds the app for production to the `build` folder. Optimizes bundles for best performance.

---

## ?? Testing & Verification

The refactored codebase is covered by automated unit tests validating:
- Root application mounting, context providers, and routing.
- Authentication forms and Google OAuth triggers.
- Feed user info, action callbacks, and article card rendering.
- Settings preference panels (Appearance, Language, Notifications).

Run test suites:
```bash
$env:CI="true"; npm test -- --watchAll=false
```

---

## ??�?? Author & Contributions

**Khalid Asadany**
- GitHub: [https://github.com/Khalidoffcial](https://github.com/Khalidoffcial)
- Website: [https://bayan-space.vercel.app](https://bayan-space.vercel.app)

---

> **Less noise. More knowledge. More creators. More impact.**
