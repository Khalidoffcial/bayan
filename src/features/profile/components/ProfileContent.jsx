import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import PostCard from "../../feed/components/PostCard";
import ArticleCard from "../../feed/components/ArticleCard";
import MediaGallery from "../../../components/common/MediaGallery";
import Loader from "../../../components/ui/Loader";
import { useTranslation } from "../../../i18n/useTranslation";
import defaultImg from "../../../assets/icons/user_10374408.png";

/**
 * ReplyCard — standalone reply display (Twitter/X-style).
 * Body/author/date/media from the REPLY itself; "ردًا على @user" context
 * from parentUserData (the DIRECT parent's author). Body click opens the
 * reply's own page (/rp/{reply.id}); parent-author click opens their profile.
 */
const ReplyCard = ({ item, getDirection }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dir = getDirection ? getDirection(item.content) : "ltr";
  const parentName =
    item.parentUserData?.F_user || item.parentUserData?.S_user || t("comments.unknownAuthor");
  const parentUserId = item.parentUserData?.Id_user;

  return (
    <div className="container_post post-card profile-reply-card">
      <div className="post-card-head">
        <img
          src={item.userData?.imgProfile || defaultImg}
          alt={item.userData?.F_user || "User"}
          className="profile-pic-Posts"
          draggable={false}
        />
        <div className="names">
          <h2 className="nameacc">{item.userData?.F_user}</h2>
          <p className="usernameacc">{item.userData?.S_user}</p>
        </div>
      </div>

      <div
        className="post-card-reply-context"
        onClick={(e) => {
          e.stopPropagation();
          if (parentUserId) navigate(`/p/${parentUserId}`);
        }}
      >
        {t("comments.replyingTo")}{" "}
        {/* bdi يعزل اسم المستخدم عن اتجاه الجملة المحيطة */}
        <span className="post-card-reply-context-link"><bdi>@{String(parentName).replace("@", "")}</bdi></span>
      </div>

      <MediaGallery media={item.media} img={item.img} />

      <div
        className="content_Post"
        /* dir هنا اتجاه المحتوى (لغة المنشور الأصلية) — المحاذاة تلقائية منه */
        dir={dir}
        onClick={() => navigate(`/rp/${item.id}`)}
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />

      <div className="his_Post">{item.date}</div>
    </div>
  );
};
export const ProfileContent = ({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  onLike,
  onComment,
  onShare,
  likedPosts,
  getDirection,
  userId,
  activeCommentId,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="profile-content-state">
        <Loader />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="profile-content-state">
        <p className="profile-content-error-text">{error}</p>
        <button className="profile-content-retry" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="profile-content-state">
        <p className="profile-content-empty-text">{t("profile.emptyTab")}</p>
      </div>
    );
  }

  return (
    <div className="profile-content-list">
      {items.map((item) => {
        const isArticleOrNovel = item.kind === "article" || item.kind === "novel";
        const isReply = item.kind === "reply";

        return (
          <motion.div
            key={item.id}
            className={isArticleOrNovel ? "box" : "BottomBox"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {(item.kind === "post") && (
              <PostCard
                item={item}
                liked={likedPosts?.[item.id] ?? Boolean(item?.likesBy?.[userId])}
                likesCount={item.likesCount ?? 0}
                commentsCount={item.replyCount ?? 0}
                commentsOpen={activeCommentId === item.id}
                onLike={onLike}
                onComment={onComment}
                onShare={onShare}
                getDirection={getDirection}
              />
            )}

            {isReply && <ReplyCard item={item} getDirection={getDirection} />}

            {isArticleOrNovel && <ArticleCard item={item} kind={item.kind} />}
          </motion.div>
        );
      })}

      {error && items.length > 0 && (
        <div className="profile-content-state">
          <p className="profile-content-error-text">{error}</p>
          <button className="profile-content-retry" onClick={onRetry}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {hasMore && !loadingMore && (
        <button className="profile-content-load-more" onClick={onLoadMore}>
          {t("feed.loadMore")}
        </button>
      )}

      {loadingMore && (
        <div className="profile-content-state profile-content-loading-more">
          <Loader />
        </div>
      )}

      {!hasMore && items.length > 0 && !loadingMore && (
        <p className="profile-content-end">{t("feed.end")}</p>
      )}
    </div>
  );
};

export default React.memo(ProfileContent);
