# Folder Reorganization TODO

Goal: Reorganize into a feature-based architecture. Move files only — no renames, no code changes, no CSS changes. Update imports automatically. Verify build after each step.

## Baseline
- [x] Confirmed node_modules present
- [ ] Run baseline build (verify current state builds)

## Steps

### Step 1: Writer feature
- [ ] Create `src/features/writer/{components,hooks,services,styles,utils}/`
- [ ] Move Writer.jsx, WriterActions.jsx, WriterEditor.jsx, WriterImages.jsx, WriterToolbar.jsx → `features/writer/components/`
- [ ] Move writer.css → `features/writer/styles/`
- [ ] Update imports in moved Writer files (relative `./WriterToolbar.jsx` stays same; `../../utils/cookies.js` → `../../../utils/cookies.js`, `../../services/storage.service` → `../../../services/storage.service`)
- [ ] Update import in `Content.jsx` (writer location)
- [ ] Build verify

### Step 2: Feed split (home)
- [ ] Create `features/home/{components,styles}/`
- [ ] Move Feed.jsx, FeedList.jsx, FeedItem.jsx → `features/home/components/`
- [ ] Move FeedActions.jsx, FeedUser.jsx → `features/home/components/`
- [ ] Move skeleton/ → `features/home/components/`
- [ ] Move feed.css → `features/home/styles/`
- [ ] Move PostCard.jsx → `features/posts/components/`
- [ ] Move ArticleCard.jsx → `features/articles/components/`
- [ ] Update imports
- [ ] Build verify

### Step 3: Article/Post/Profile/Auth features
- [ ] Create feature folders
- [ ] Move components + styles
- [ ] Update imports
- [ ] Build verify

### Step 4: Settings feature
- [ ] Move Settings/* + pages/Settings.jsx + styles/settings.css
- [ ] Update imports
- [ ] Build verify

### Step 5: Home feature (QuoteSlider, WhoUs, Content, Home.jsx, InterestsModal)
- [ ] Move QuoteSlider, WhoUs, Content, InterestsModal
- [ ] Move Home.jsx
- [ ] Update imports
- [ ] Build verify

### Step 6: Shared (ui, common, layout)
- [ ] Move Loader → components/ui/
- [ ] Move CommentModal → components/common/
- [ ] Move Top, Sidebar → components/layout/
- [ ] Update imports
- [ ] Build verify

### Step 7: Global (contexts, routes, styles)
- [ ] Move SettingsContext → contexts/
- [ ] Move App.js → routes/
- [ ] Move styles/css to global styles/
- [ ] Update imports
- [ ] Build verify

### Step 8: Stray images
- [ ] Move facebook.png, refresh-page-option.png, remove.png → assets/images/
- [ ] Build verify

## Final
- [ ] Full build verify
- [ ] Update TODO complete
