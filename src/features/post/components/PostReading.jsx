import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import Top from "../../../components/layout/Top";
import Sidebar from "../../../components/layout/Sidebar";
import InlineComments from "../../../components/common/InlineComments";
import Loader from "../../../components/ui/Loader";
import DropdownMenu from "../../../components/ui/DropdownMenu";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import PostHeader from "./PostHeader";
import PostBody from "./PostBody";
import PostActions from "./PostActions";
import ViewCounter from "../../../components/common/ViewCounter";
import usePost from "../hooks/usePost";
import { deletePost } from "../services/post.service";
import { getDirection } from "../../../utils/helpers";
import "../styles/post.css";
import useAuth from "../../../hooks/useAuth";
import { useTranslation } from "../../../i18n/useTranslation";


export const PostReading = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const {
    dataPost,
    setDataPost,
    imageUrl,
    loading,
    liked,
    likesCount,
    commented,
    setCommented,
    userId,
    handleLike,
    handleShare,
  } = usePost();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="post-reading-container">
        <Top />
        <Sidebar />
        <div className="loading"><Loader /></div>
      </div>
    );
  }

  if (!dataPost) {
    return (
      <div className="post-reading-container">
        <Top />
        <Sidebar />
        <div className="loading"><h1>{t("post.notFound")}</h1></div>
      </div>
    );
  }

  const isOwner =
    String(dataPost.autherID ?? dataPost.userData?.Id_user ?? "") ===
    String(user?.id ?? "");

  const handleEdit = () => {
    toast.info(t("settings.account.comingSoon"));
  };

  const handleDeleteConfirmed = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await deletePost(dataPost.id);
      if (result.ok) {
        toast.success(t("comments.deleted"));
        setConfirmOpen(false);
        navigate(-1);
      } else {
        toast.error(result.error || t("comments.deleteFailed"));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="post-reading-container">
      <Top />
      <Sidebar />

      <div className="post-reading-content">
        <div className="article-meta-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← {t("feed.back")}
          </button>
          {/* تسجيل المشاهدة يحدث هنا — صفحة التفاصيل (Content ID حقيقي) */}
          <ViewCounter contentId={dataPost.id} contentType="posts" initialViews={dataPost.views} />
        </div>

        {isOwner && (
          <div className="post-owner-actions">
            <DropdownMenu
              ariaLabel={t("comments.actions")}
              items={[
                { key: "edit", label: t("comments.edit"), icon: FaEdit, onClick: handleEdit },
                {
                  key: "delete",
                  label: t("comments.delete"),
                  icon: FaTrash,
                  danger: true,
                  onClick: () => setConfirmOpen(true),
                },
              ]}
            />
          </div>
        )}

        <PostHeader
          userData={dataPost.userData}
          imageUrl={imageUrl}
        />

        <PostBody
          content={dataPost.content}
          imageUrl={imageUrl}
          contentDir={getDirection(dataPost.content)}
          contentId={dataPost.id}
          contentType="posts"
        />

        <PostActions
          liked={liked}
          likesCount={likesCount}
          onLike={handleLike}
          onComment={() => setCommented((prev) => !prev)}
          onShare={handleShare}
          post={dataPost}
          extraStats={<ViewCounter contentId={dataPost.id} contentType="posts" initialViews={dataPost.views} />}
        />

        {true && (
          <InlineComments
            userData={user}
            commentOnId={dataPost.id}
            contentType="posts"
            openByDefault
            parentAuthor={{
              username: dataPost.userData?.S_user,
              Id_user: dataPost.userData?.Id_user ?? dataPost.autherID,
            }}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t("comments.deleteTitle")}
        message={t("comments.deleteMessage")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        danger
        busy={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default React.memo(PostReading);
