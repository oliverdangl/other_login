const express = require("express");
const dotenv = require("dotenv");
const pg = require("pg");//Access to postgres db through Node.js
const bodyParser = require("body-parser");

/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;

const conString = process.env.DB_CON_STRING; //Includes parameters to connect

//Forgot to set conString
if(!conString) {
    console.log("Error: environment variable DB_CON_STRING not set.");
    process.exit(1);
}

//Configure connection and connect to client
const dbClient = new pg.Client({
    connectionString: conString,
    ssl: { rejectUnauthorized: false }
});
dbClient
    .connect()
    .then(() => console.log("Mit Datenbank verbunden"))
    .catch(err => {
        console.error("DB-Verbindungsfehler:", err);
        process.exit(1);
    });

const urlencodedParser = bodyParser.urlencoded({
    extended: false
});


app = express();

//turn on serving static files (required for delivering css to client)
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

//Storing requested path
app.use((req,res,next) => {
    res.locals.currentPath = req.path;
    next();
})

//configure template engine
app.set("views", "views");
app.set("view engine", "pug");

app.get('/', (req, res) => {
    res.redirect("/dashboard");
});

//Routing to /dashboard
app.get("/users", (req, res,next) => {
    dbClient
    .query(`
        SELECT user_id, name, profile_pic
        FROM users
        ORDER BY name
    `)
    .then (({rows: users }) => {
        res.render("users", {users});
    })
    .catch(next);
})

//Routing to /users
app.get("/dashboard", (req, res,next) => {
    dbClient
    .query(`
        SELECT o.post_id, o.text, o.created,
                u.user_id, u.name, u.profile_pic
        FROM others o
        JOIN users u ON o.user_id = u.user_id
        ORDER BY o.created DESC
    `)
    .then(({ rows: others }) => {
        res.render("dashboard", {others})
    })
    .catch(next);
});

//Error handling
app.use((err, req, res, next) =>{
    console.log(err);
    res.status(500).send("Server Error");
});

app.listen(PORT, function() {
  console.log(`OTHer running and listening on port ${PORT}`);
});
