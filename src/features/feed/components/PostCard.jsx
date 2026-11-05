import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";

import FeedUser from "./FeedUser";
import FeedActions from "./FeedActions";
import InlineComments from "../../../components/common/InlineComments";
import MediaGallery from "../../../components/common/MediaGallery";
import ViewCounter from "../../../components/common/ViewCounter";
import DropdownMenu from "../../../components/ui/DropdownMenu";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { useTranslation } from "../../../i18n/useTranslation";
import { deletePost } from "../../post/services/post.service";

import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";

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
        toast.success("تم حذف المنشور");
        setConfirmOpen(false);
        onDeleted?.(item.id);
      } else {
        toast.error(result.error || "تعذّر حذف المنشور");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container_post post-card">
      <div className="post-card-head">
        <FeedUser userData={item.userData} />
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

      {/* Twitter/X-style parent context for first-class replies.
          Shows the PARENT author (stored on the reply as parentUserData),
          not the reply's own author. */}
      {item.comment_on && (
        <div className="post-card-reply-context">
          {t("comments.replyingTo")}{" "}
          {(item.parentUserData?.Id_user || item.parentUserData?.S_user) && (
            <span
              className="post-card-reply-context-link"
              onClick={(e) => {
                e.stopPropagation();
                if (item.parentUserData?.Id_user) {
                  navigate(`/p/${item.parentUserData.Id_user}`);
                }
              }}
            >
              {/* bdi يعزل اسم المستخدم (قد يكون عربيًا) عن اتجاه الجملة المحيطة */}
              <bdi>@{String(item.parentUserData.S_user || t("comments.unknownAuthor")).replace("@", "")}</bdi>
            </span>
          )}
        </div>
      )}

      <MediaGallery media={item.media} img={item.img} />

      <div
        className="content_Post"
        /* dir هنا اتجاه المحتوى (لغة المنشور الأصلية) — يعطي المحاذاة تلقائيًا،
           لا محاذاة فيزيائية مثبتة تكسر النص المختلط */
        dir={dir}
        onClick={() => navigate(`/rp/${item.id}`, { state: item })}
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />

      <div className="his_Post">
        {item.date}
        {/* عداد مشاهدات حقيقي من الخادم */}
        <ViewCounter contentId={item.id} contentType="posts" initialViews={item.views} />
      </div>

      <FeedActions
        itemId={item.id}
        liked={liked}
        likesCount={likesCount}
        commentsCount={commentsCount}
        onLike={onLike}
        onComment={onComment}
        onShare={() => onShare(item)}
        extra={<ReadLaterButton compact contentId={item.id} contentType="posts" title={(item.content || "").slice(0, 80)} />}
      />

      {commentsOpen && <InlineComments userData={user} commentOnId={item.id} contentType="posts" />}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="حذف المنشور"
        message="هل تريد حذف هذا المنشور نهائيًا؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        busy={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default React.memo(PostCard);
