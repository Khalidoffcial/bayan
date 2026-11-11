import React from "react";
import { useNavigate } from "react-router-dom";
import { Share2 as ShareIcon } from "lucide-react";
import FeedUser from "./FeedUser";
import { ReadLaterButton } from "../../focus-space/components/ReadLaterButton";
import { useTranslation } from "../../../i18n/useTranslation";
import ViewCounter from "../../../components/common/ViewCounter";

/**
 * ArticleCard — editorial card for articles AND novels, differentiated by
 * typography and structure (never a text label):
 *   article → cover + bold headline + 2-line lede + byline
 *   novel   → cover (or quiet spine panel), larger book-style headline,
 *             author name elevated as the byline
 */
export const ArticleCard = ({ item, kind, onShare }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const resolvedKind =
    kind || (String(item?.type || "").toLowerCase().startsWith("novel") ? "novel" : "article");
  const isNovel = resolvedKind === "novel";

  const cover =
    (Array.isArray(item?.img) && item.img[0]) ||
    (typeof item?.img === "string" && item.img) ||
    null;

  const open = () => navigate(`/r/${item.id}`, { state: item });

  return (
    <article className={`bayan-card bayan-card--${resolvedKind}`} onClick={open}>
      <div className="bcard-head">
        <FeedUser userData={item.userData} variant="card" />
      </div>

      {cover ? (
        <div className="bcard-cover">
          <img src={cover} alt={item.title || ""} width="780" height="440" decoding="async" loading="lazy" />
        </div>
      ) : (
        isNovel && (
          <div className="bcard-spine">
            <span className="bcard-spine-title">{item.title}</span>
          </div>
        )
      )}

      <h1 className="bcard-title" onClick={(e) => { e.stopPropagation(); open(); }}>
        {item.title}
      </h1>

      {item.descrip && <p className="bcard-lede">{item.descrip}</p>}

      {isNovel && item.userData?.F_user && (
        <p className="bcard-byline">
          {t("feed.by")} <b>{item.userData.F_user}</b>
        </p>
      )}

      <div className="bcard-foot" onClick={(e) => e.stopPropagation()}>
        <div className="bcard-meta">
          {item.date && <span className="bcard-meta-item">{item.date}</span>}
          <ViewCounter
            contentId={item.id}
            contentType={isNovel ? "novels" : "articles"}
            initialViews={item.views}
          />
        </div>

        <div className="bcard-actions">
          <ReadLaterButton
            compact
            contentId={item.id}
            contentType={isNovel ? "novels" : "articles"}
            title={item.title}
            image={cover}
            className="bcard-act"
          />
          {onShare && (
            <button
              type="button"
              className="bcard-act"
              onClick={(e) => { e.stopPropagation(); onShare?.(item); }}
              aria-label={t("share.title")}
            >
              <ShareIcon strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default React.memo(ArticleCard);
