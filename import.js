const fs = require("fs");
const { parse} = require("csv-parse");
const { Client } = require("pg");
require("dotenv").config();

;(async () => {
    const client = new Client({ connectionString: process.env.DB_CON_STRING });
    await client.connect();

    for(const {file, sql } of [
        {
         file: "users.csv",
         sql: `INSERT INTO users (user_id, name, password, birthday, profile_pic,
                bio_text, created) VALUES ($1, $2, $3, $4, $5, $6, $7)`
        },
        {
         file: "others.csv",
         sql:   `INSERT INTO others 
                (post_id, user_id, text, created)
                Values ($1, $2, $3, $4)`
        }
        ]) {
        const parser = fs.createReadStream(file).pipe(parse({trim:true}));
        for await (const record of parser) {
            await client.query(sql, record);
        }
        console.log(`${file} importiert.`);
    }
    await client.end();
    console.log("Fertig");
})();
