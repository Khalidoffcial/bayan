const { createServer } = require("http");
const { Server } = require("socket.io");

const dao = require("./datastore/Dao.js");
const DaoForDbUser = require("./datastore/signin_signupDao_firebase.js");

const httpServer = createServer();

// ======================================================
// SOCKET.IO
// ======================================================

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

// ======================================================
// REDIS + MEMORY CACHE
// ======================================================

let redisClient = null;
let useRedis = false;

const memoryCache = new Map();

(async () => {
    try {
        const redis = require("redis");

        redisClient = redis.createClient({
            url: "redis://127.0.0.1:6379",
        });

        redisClient.on("error", () => {
            if (useRedis) {
                console.log(
                    "⚠ Redis disconnected -> Using Memory Cache"
                );
            }

            useRedis = false;
        });

        try {
            await redisClient.connect();

            useRedis = true;

            console.log("🟢 Redis Connected");
        } catch {
            console.log(
                "⚠ Redis not available -> Memory Cache Enabled"
            );

            useRedis = false;
        }
    } catch {
        console.log(
            "⚠ Redis package not installed -> Memory Cache Enabled"
        );

        useRedis = false;
    }
})();

// ======================================================
// HELPERS
// ======================================================

function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function paginate(data, limit = 10, cursor = 0) {
    return {
        items: data.slice(cursor, cursor + limit),
        nextCursor:
            cursor + limit < data.length
                ? cursor + limit
                : null,
    };
}

// ======================================================
// CACHE SYSTEM
// ======================================================

async function cacheGet(key) {
    try {
        if (useRedis && redisClient) {
            const data = await redisClient.get(key);

            return data ? JSON.parse(data) : null;
        }

        return memoryCache.get(key) || null;
    } catch (err) {
        console.log("cacheGet error:", err.message);

        return null;
    }
}

async function cacheSet(key, value, ttl = 60) {
    try {
        if (useRedis && redisClient) {
            await redisClient.setEx(
                key,
                ttl,
                JSON.stringify(value)
            );
        } else {
            memoryCache.set(key, value);
        }
    } catch (err) {
        console.log("cacheSet error:", err.message);
    }
}

// ======================================================
// USER CACHE
// ======================================================

async function getUser(userId) {
    try {
        const cached = await cacheGet(`user:${userId}`);

        if (cached) return cached;

        const user =
            await DaoForDbUser.findbyID(userId);

        if (user) {
            await cacheSet(
                `user:${userId}`,
                user,
                300
            );
        }

        return user;
    } catch (err) {
        console.log("getUser error:", err.message);

        return null;
    }
}

// ======================================================
// ENGAGEMENT SYSTEM
// ======================================================

async function trackEngagement(contentId, type) {
    try {
        const key = `eng:${contentId}`;

        let data = await cacheGet(key);

        if (!data) {
            data = {
                likes: 0,
                comments: 0,
                views: 0,
            };
        }

        if (type === "view") data.views += 1;
        if (type === "like") data.likes += 1;
        if (type === "comment") data.comments += 1;

        await cacheSet(key, data, 86400);

        return data;
    } catch (err) {
        console.log(
            "trackEngagement error:",
            err.message
        );
    }
}

// ======================================================
// RANKING ENGINE
// ======================================================

async function getScore(content) {
    try {
        const eng =
            (await cacheGet(`eng:${content.id}`)) || {
                likes: 0,
                comments: 0,
                views: 0,
            };

        const likesScore = eng.likes * 3;

        const commentsScore = eng.comments * 5;

        const viewsScore = eng.views;

        return (
            likesScore +
            commentsScore +
            viewsScore
        );
    } catch {
        return 0;
    }
}

// ======================================================
// RECOMMENDATION ENGINE
// ======================================================

async function recommendFeed(user, type) {
    try {
        let interests = [];

        if (type === "novels") {
            interests =
                user?.interesting?.novels || [];
        } else {
            interests =
                user?.interesting?.articles || [];
        }

        let allContent = [];

        for (const cat of interests) {
            const cacheKey = `${type}:${cat}`;

            const cached =
                await cacheGet(cacheKey);

            let results = [];

            if (cached) {
                results = cached;
            } else {
                results =
                    await dao.getContentByCategory(
                        type,
                        cat,
                        10
                    );

                await cacheSet(
                    cacheKey,
                    results,
                    60
                );
            }

            allContent.push(...results);
        }

        const scored = await Promise.all(
            allContent.map(async (item) => ({
                ...item,
                score: await getScore(item),
            }))
        );

        return scored.sort(
            (a, b) => b.score - a.score
        );
    } catch (err) {
        console.log(
            "recommendFeed error:",
            err.message
        );

        return [];
    }
}

// ======================================================
// ENRICH USER DATA
// ======================================================

async function enrichContent(contentArray) {
    return Promise.all(
        contentArray.map(async (item) => {
            try {
                const profile =
                    await getUser(item.autherID);

                return {
                    ...item,
                    userData: profile || {},
                };
            } catch {
                return item;
            }
        })
    );
}

// ======================================================
// SOCKET EVENTS
// ======================================================

io.on("connection", (socket) => {
    console.log("🟢 Client Connected:", socket.id);

    // ==================================================
    // SET INTERESTS
    // ==================================================

    socket.on(
        "setInterests",
        async (idUser, interests) => {
            try {
                console.log(
                    "🔥 Updating interests"
                );

                console.log("User:", idUser);

                console.log(
                    "Interests:",
                    interests
                );

                await DaoForDbUser.updateUserToInsertInteresting(
                    idUser,
                    interests
                );

                // ==================================
                // CLEAR CACHE
                // ==================================

                try {
                    if (
                        useRedis &&
                        redisClient
                    ) {
                        await redisClient.del(
                            `user:${idUser}`
                        );

                        console.log(
                            "🗑 Redis cache cleared"
                        );
                    } else {
                        memoryCache.delete(
                            `user:${idUser}`
                        );

                        console.log(
                            "🗑 Memory cache cleared"
                        );
                    }
                } catch (cacheErr) {
                    console.log(
                        "Cache delete error:",
                        cacheErr.message
                    );
                }

                // ==================================
                // JOIN ROOMS
                // ==================================

                interests?.articles?.forEach(
                    (interest) => {
                        socket.join(
                            `room:${interest}`
                        );
                    }
                );

                interests?.novels?.forEach(
                    (interest) => {
                        socket.join(
                            `room:${interest}`
                        );
                    }
                );

                socket.emit("result", {
                    status: "ok"});

                console.log(
                    "✅ Interests updated"
                );
            } catch (err) {
                console.log(
                    "❌ setInterests error:",
                    err.message
                );

                socket.emit("result", {
                    status: "error",
                    message:
                        "Failed to update interests",
                });
            }
        }
    );

    // ==================================================
    // JOIN ROOMS
    // ==================================================

    socket.on("JOIN_ROOMS", async (userId) => {
        try {
            const user = await getUser(userId);

            if (!user) return;

            const articleInterests =
                user?.interesting?.articles ||
                [];

            const novelInterests =
                user?.interesting?.novels || [];

            articleInterests.forEach(
                (interest) => {
                    socket.join(
                        `room:${interest}`
                    );
                }
            );

            novelInterests.forEach(
                (interest) => {
                    socket.join(
                        `room:${interest}`
                    );
                }
            );

            console.log(
                "✅ Rooms joined successfully"
            );
        } catch (err) {
            console.log(
                "JOIN_ROOMS error:",
                err.message
            );
        }
    });

    // ==================================================
    // TRACK ENGAGEMENT
    // ==================================================

    socket.on(
        "ENGAGEMENT",
        async ({ contentId, type }) => {
            await trackEngagement(
                contentId,
                type
            );
        }
    );

    // ==================================================
    // GET FEED
    // ==================================================

    socket.on(
        "GET_FEED",
        async ({
            userId,
            type = "posts",
            cursor = 0,
            limit = 10,
        }) => {
            try {
                const user =
                    await getUser(userId);

                if (!user) {
                    return socket.emit(
                        "FEED_RESULT",
                        {
                            items: [],
                            nextCursor: null,
                        }
                    );
                }

                let feed =
                    await recommendFeed(
                        user,
                        type
                    );

                feed = await enrichContent(feed);

                const result = paginate(
                    shuffle(feed),
                    limit,
                    cursor
                );

                socket.emit(
                    "FEED_RESULT",
                    result
                );
            } catch (err) {
                console.log(
                    "GET_FEED error:",
                    err.message
                );

                socket.emit(
                    "FEED_RESULT",
                    {
                        items: [],
                        nextCursor: null,
                    }
                );
            }
        }
    );

    // ==================================================
    // NEW POST LIVE
    // ==================================================

    socket.on(
        "NEW_POST",
        async ({ category, post }) => {
            try {
                io.to(`room:${category}`).emit(
                    "NEW_POST",
                    post
                );

                console.log(
                    "📢 New post broadcasted"
                );
            } catch (err) {
                console.log(
                    "NEW_POST error:",
                    err.message
                );
            }
        }
    );

    // ==================================================
    // DISCONNECT
    // ==================================================

    socket.on("disconnect", () => {
        console.log(
            "🔴 Client disconnected:",
            socket.id
        );
    });
});

// ======================================================
// START SERVER
// ======================================================

httpServer.listen(9000,"0.0.0.0", () => {
    console.log(
        "🚀 Advanced AI Feed Server Running on Port 9000"
    );
});