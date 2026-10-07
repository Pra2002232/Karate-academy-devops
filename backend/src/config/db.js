const { Pool } = require("pg");

const {
    getUser
} = require("../middleware/requestContext");


const pool = new Pool({

    host:
        process.env.DB_HOST ||
        "localhost",

    port:
        process.env.DB_PORT ||
        5432,

    database:
        process.env.DB_NAME ||
        "karate_academy",

    user:
        process.env.DB_USER ||
        "cricketuser",

    password:
        process.env.DB_PASSWORD
});


pool.on("connect", () => {

    console.log(
        "Connected to PostgreSQL"
    );

});


pool.on("error", (err) => {

    console.error(
        "PostgreSQL error:",
        err
    );

});


const rawConnect =
    pool.connect.bind(pool);


const setDatabaseContext = async (
    rawQuery
) => {

    const user =
        getUser();

    const userId =
        user?.id
            ? String(user.id)
            : "";

    const role =
        user?.role || "";

    const branchId =
        user?.branch_id !== null &&
        user?.branch_id !== undefined
            ? String(user.branch_id)
            : "";


    await rawQuery(
        `
        SELECT
            set_config(
                'app.user_id',
                $1,
                false
            ),
            set_config(
                'app.user_role',
                $2,
                false
            ),
            set_config(
                'app.branch_id',
                $3,
                false
            )
        `,
        [
            userId,
            role,
            branchId
        ]
    );
};


const wrapClient = (client) => {

    const rawQuery =
        client.query.bind(client);


    client.query = async (
        text,
        values
    ) => {

        await setDatabaseContext(
            rawQuery
        );

        return rawQuery(
            text,
            values
        );
    };


    return client;
};


// ======================================================
// WRAPPED CONNECT
// ======================================================

pool.connect = async () => {

    const client =
        await rawConnect();

    return wrapClient(
        client
    );
};


// ======================================================
// WRAPPED QUERY
// ======================================================

pool.query = async (
    text,
    values
) => {

    const client =
        await rawConnect();

    const rawQuery =
        client.query.bind(client);

    try {

        await setDatabaseContext(
            rawQuery
        );

        return await rawQuery(
            text,
            values
        );

    } finally {

        try {

            await rawQuery(
                `
                SELECT
                    set_config(
                        'app.user_id',
                        '',
                        false
                    ),
                    set_config(
                        'app.user_role',
                        '',
                        false
                    ),
                    set_config(
                        'app.branch_id',
                        '',
                        false
                    )
                `
            );

        } catch (error) {

            console.error(
                "Database context reset error:",
                error.message
            );

        }

        client.release();

    }
};


module.exports = pool;
