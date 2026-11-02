import {
  normalizeProfileItem,
  extractProfileItems,
  extractNextCursor,
  extractCounts,
} from "./services/profileContent.service";

describe("profileContent.service (unified profile feed normalization)", () => {
  test("normalizes posts, replies, articles and novels to one shape", () => {
    const post = normalizeProfileItem({
      id: "1",
      content: "hello",
      type: "posts",
      timestamp: 1000,
      autherID: "42",
    });
    expect(post.kind).toBe("post");
    expect(post.autherID).toBe("42");

    const reply = normalizeProfileItem({
      id: "2",
      content: "reply body",
      comment_on: "1",
      timestamp: 2000,
      autherID: "42",
    });
    expect(reply.kind).toBe("reply");
    expect(reply.autherID).toBe("42"); // real writer, not the parent's author

    const article = normalizeProfileItem({
      id: "3",
      title: "T",
      descrip: "D",
      type: "article",
      timestamp: 3000,
      autherID: "42",
    });
    expect(article.kind).toBe("article");
    expect(article.title).toBe("T");

    const novel = normalizeProfileItem({
      id: "4",
      title: "N",
      type: "novels",
      date: "29 Oct 2026",
      time: "10:00:00",
      autherID: "42",
    });
    expect(novel.kind).toBe("novel");
    expect(novel.timestamp).toBeGreaterThan(0); // parsed from date/time
  });

  test("items without any date get timestamp 0 and still normalize safely", () => {
    const noDate = normalizeProfileItem({ id: "9", content: "no date" });
    expect(noDate).not.toBeNull();
    expect(noDate.timestamp).toBe(0);
  });

  test("extracts items, cursor and counts from paginated payloads", () => {
    const payload = {
      items: [{ id: "1" }, { id: "2" }],
      nextCursor: 2,
      counts: { all: 5, posts: 3, replies: 2 },
    };

    expect(extractProfileItems(payload)).toHaveLength(2);
    expect(extractProfileItems([])).toHaveLength(0); // legacy array payload
    expect(extractNextCursor(payload)).toBe(2);
    expect(extractNextCursor([])).toBeNull();
    expect(extractCounts(payload).all).toBe(5);
    expect(extractCounts([])).toBeNull();
  });

  test("extractItems falls back to legacy array payloads", () => {
    const legacy = [{ id: "1", comment_on: "0" }];
    expect(extractProfileItems(legacy)[0].id).toBe("1");
  });

  test("dedup helper semantics: same id seen once via REST and once via socket merges once", () => {
    // Contract used by useProfileContent.mergeItems — normalize first, then
    // dedup by id. The same item id must normalize to the same id string.
    const a = normalizeProfileItem({ id: "77", content: "x" });
    const b = normalizeProfileItem({ id: "77", content: "x" });
    expect(a.id).toBe(b.id);
  });
});
