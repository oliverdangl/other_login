require("dotenv").config(); //Load environment var

//File-system streaming and CSV parsing
const fs = require("fs");
const { parse} = require("csv-parse");

//PostgreSQL client
const { Client } = require("pg");

;(async () => {
    //Initialize Postgres client using csv string
    const client = new Client({
        connectionString: process.env.DB_CON_STRING
    });
    await client.connect();

    //Array define for import tasks
    const tasks = [
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
    ];

    //Loop over each import task
    for(const {file, sql} of tasks) {
        //Create read stream from CSV file
        const parser = fs
            .createReadStream(file)
            .pipe(parse({trim:true}));

        //Run the INSERT query for each parsed record
        for await (const record of parser) {
            //record[0] maps to $1, etc
            await client.query(sql, record);
        }
        console.log(`${file} importiert.`);
    }
    //Close DB connection when finished
    await client.end();
    console.log("Fertig");
})();
