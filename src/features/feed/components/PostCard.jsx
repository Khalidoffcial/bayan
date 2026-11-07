import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart as HeartIcon, MessageCircle as CommentIcon,
  Share2 as ShareIcon,
} from "lucide-react";
import { FaEdit, FaTrash } from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";
import ViewCounter from "../../../components/common/ViewCounter";

import FeedUser from "./FeedUser";
import InlineComments from "../../../components/common/InlineComments";
import MediaGallery from "../../../components/common/MediaGallery";
import DropdownMenu from "../../../components/ui/DropdownMenu";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { useTranslation } from "../../../i18n/useTranslation";
import { deletePost } from "../../post/services/post.service";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";

/** Compact numeric formatting for like/comment counters (1.2K style). */
const compact = (n) => {
  if (!Number(n)) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

export const PostCard = ({
  item,
  liked,
  likesCount,
  commentsCount,
  commentsOpen = false,
  onLike,
  onComment,
  onShare,
  getDirection,
  onDeleted,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dir = getDirection ? getDirection(item.content) : "ltr";

  const isOwner =
    String(item.autherID ?? item.userData?.Id_user ?? "") === String(user?.id ?? "");

  const handleDeleteConfirmed = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await deletePost(item.id);
      if (result.ok) {
        toast.success(t("post.deletedToast"));
        setConfirmOpen(false);
        onDeleted?.(item.id);
      } else {
        toast.error(result.error || t("post.deleteFailedToast"));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="bayan-card bayan-card--post">
      <div className="bcard-head">
        <FeedUser userData={item.userData} variant="card" />
        {isOwner && (
          <DropdownMenu
            ariaLabel={t("comments.actions")}
            items={[
              {
                key: "edit",
                label: t("comments.edit"),
                icon: FaEdit,
                onClick: () => navigate(`/rp/${item.id}`, { state: item }),
              },
              {
                key: "delete",
                label: t("comments.delete"),
                icon: FaTrash,
                danger: true,
                onClick: () => setConfirmOpen(true),
              },
            ]}
          />
        )}
      </div>

      {item.comment_on && (
        <div className="bcard-reply">
          {t("comments.replyingTo")}{" "}
          {(item.parentUserData?.Id_user || item.parentUserData?.S_user) && (
            <span
              className="bcard-reply-link"
              onClick={(e) => {
                e.stopPropagation();
                if (item.parentUserData?.Id_user) {
                  navigate(`/p/${item.parentUserData.Id_user}`);
                }
              }}
            >
              <bdi>@{String(item.parentUserData.S_user || t("comments.unknownAuthor")).replace("@", "")}</bdi>
            </span>
          )}
        </div>
      )}

      {(item.media?.length || item.img) && (
        <div className="bcard-media">
          <MediaGallery media={item.media} img={item.img} />
        </div>
      )}

      <div
        className="bcard-body"
        dir={dir}
        onClick={() => navigate(`/rp/${item.id}`, { state: item })}
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />

      <div className="bcard-foot">
        <div className="bcard-meta">
          <span className="bcard-meta-item">{item.date}</span>
          <ViewCounterInline contentId={item.id} initialViews={item.views} />
        </div>

        <div className="bcard-actions">
          <button
            type="button"
            className={`bcard-act ${liked ? "bcard-act--liked" : ""}`}
            onClick={(e) => { e.stopPropagation(); onLike?.(item.id); }}
            aria-label={t("feed.like")}
            aria-pressed={liked}
          >
            <HeartIcon strokeWidth={liked ? 2.6 : 2} fill={liked ? "currentColor" : "none"} />
            {Boolean(likesCount) && <span className="bcard-act-count">{compact(likesCount)}</span>}
          </button>

          <button
            type="button"
            className="bcard-act"
            onClick={(e) => { e.stopPropagation(); onComment?.(item.id); }}
            aria-label={commentsCount ? `${t("feed.comment")} (${compact(commentsCount)})` : t("feed.comment")}
          >
            <CommentIcon strokeWidth={2} />
            {Boolean(commentsCount) && <span className="bcard-act-count">{compact(commentsCount)}</span>}
          </button>

          <ReadLaterButton
            compact
            contentId={item.id}
            contentType="posts"
            title={(item.content || "").slice(0, 80)}
            className="bcard-act"
          />

          <button
            type="button"
            className="bcard-act"
            onClick={(e) => { e.stopPropagation(); onShare?.(item); }}
            aria-label={t("share.title")}
          >
            <ShareIcon strokeWidth={2} />
          </button>
        </div>
      </div>

      {commentsOpen && <InlineComments userData={user} commentOnId={item.id} contentType="posts" />}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t("post.deleteTitle")}
        message={t("post.deleteConfirm")}
        confirmLabel={t("comments.delete")}
        cancelLabel={t("common.cancel")}
        danger
        busy={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
};

/** Lightweight inline views indicator — delegates to the real ViewCounter. */
const ViewCounterInline = ({ contentId, initialViews }) => (
  <ViewCounter contentId={contentId} contentType="posts" initialViews={initialViews} />
);

export default React.memo(PostCard);
