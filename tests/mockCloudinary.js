/** Mock replacing "cloudinary" for offline tests. */
const calls = [];

module.exports = {
    __calls: calls,
    v2: {
        config: () => { },
        uploader: {
            destroy: async (publicId) => {
                calls.push(publicId);
                return { result: "ok" };
            },
        },
    },
};
