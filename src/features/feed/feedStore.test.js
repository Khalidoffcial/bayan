import feedStore, { dedupRequest } from "./services/feedStore";

describe("feedStore (persistent feed cache)", () => {
  beforeEach(() => feedStore.clearAll());

  test("mergePage appends without duplicates and advances cursor", () => {
    feedStore.mergePage("all", [{ id: "1" }, { id: "2" }], { nextCursor: 2 });
    feedStore.mergePage("all", [{ id: "2" }, { id: "3" }], { nextCursor: 4 });

    const snap = feedStore.get("all");
    expect(snap.items.map((i) => i.id)).toEqual(["1", "2", "3"]);
    expect(snap.cursor).toBe(4);
    expect(snap.hasMore).toBe(true);
  });

  test("isFresh is true right after fetch and false after the TTL", () => {
    jest.useFakeTimers();
    try {
      feedStore.mergePage("all", [{ id: "1" }], { nextCursor: 1 });
      expect(feedStore.get("all").isFresh).toBe(true);

      jest.setSystemTime(Date.now() + feedStore.STALE_MS + 1000);
      expect(feedStore.get("all").isFresh).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test("prependItem adds new content without duplicating existing", () => {
    feedStore.mergePage("posts", [{ id: "1" }], {});
    feedStore.prependItem("posts", { id: "2" });
    feedStore.prependItem("posts", { id: "2" }); // duplicate push ignored

    expect(feedStore.get("posts").items.map((i) => i.id)).toEqual(["2", "1"]);
  });

  test("applyUpdate patches one item in place, preserving userData", () => {
    feedStore.mergePage("all", [{ id: "1", likesCount: 0, userData: { name: "A" } }], {});
    feedStore.applyUpdate("all", "1", { likesCount: 5 });

    const item = feedStore.get("all").items[0];
    expect(item.likesCount).toBe(5);
    expect(item.userData.name).toBe("A");
  });

  test("removeItem deletes only the target item", () => {
    feedStore.mergePage("all", [{ id: "1" }, { id: "2" }], {});
    feedStore.removeItem("all", "1");
    expect(feedStore.get("all").items.map((i) => i.id)).toEqual(["2"]);
  });

  test("per-type entries are isolated (all/posts/articles/novels)", () => {
    feedStore.mergePage("all", [{ id: "1" }], {});
    feedStore.mergePage("posts", [{ id: "2" }], {});

    expect(feedStore.get("all").items).toHaveLength(1);
    expect(feedStore.get("posts").items).toHaveLength(1);
    expect(feedStore.get("articles").isEmpty).toBe(true);
  });

  test("dedupRequest shares one in-flight promise per key", async () => {
    let calls = 0;
    const p1 = dedupRequest("k", async () => { calls++; return "r"; });
    const p2 = dedupRequest("k", async () => { calls++; return "r2"; });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(calls).toBe(1); // second identical request shared the first
    expect(r1).toBe("r");
    expect(r2).toBe("r");

    // After completion, a new request may run again (retry allowed)
    await dedupRequest("k", async () => { calls++; return "r3"; });
    expect(calls).toBe(2);
  });

  test("failing producer does not poison the pending map", async () => {
    await expect(dedupRequest("bad", async () => { throw new Error("x"); })).rejects.toThrow("x");
    // retry allowed after failure
    await expect(dedupRequest("bad", async () => "ok")).resolves.toBe("ok");
  });

  test("scroll position persists per feed type", () => {
    feedStore.setScroll("all", 420);
    expect(feedStore.getScroll("all")).toBe(420);
    expect(feedStore.getScroll("posts")).toBe(0);
  });
});
