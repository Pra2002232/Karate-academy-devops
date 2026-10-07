const {
    AsyncLocalStorage
} = require("async_hooks");

const storage =
    new AsyncLocalStorage();

const runWithUser = (user, next) => {

    storage.run(
        { user },
        next
    );
};

const getUser = () => {

    const context =
        storage.getStore();

    return context?.user || null;
};

module.exports = {
    runWithUser,
    getUser
};
