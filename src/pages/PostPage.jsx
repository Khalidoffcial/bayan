import React from "react";
import AppLayout from "../components/layout/AppLayout";
import PostReading from "../features/post/components/PostReading";

/** PostPage — /rp/:id. AppLayout owns chrome; reading owns its column. */
export const PostPage = () => {
  return (
    <AppLayout>
      <PostReading />
    </AppLayout>
  );
};

export default React.memo(PostPage);
