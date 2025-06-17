//Load environment variables from .env file
const dotenv = require("dotenv");
dotenv.config();

const express = require("express"); //Import express
const pg = require("pg"); //Import PostgreSQL client library
const bodyParser = require("body-parser"); //Import body-parser

const session = require("express-session");
const {urlencoded} = require("express");

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

//Parse URL-encoded bodies
app.use(urlencoded({ extended: false }));
//Serve files from "public"
app.use(express.static("public"));


//Store current request path in res.locals for template
app.use((req,res,next) => {
    res.locals.currentPath = req.path;
    res.locals.loggedIn = req.session.userId;
    res.locals.username = req.session.username;
    next();
});

//Tell Express where to find view template and that pug is used
app.set("views", "views");
app.set("view engine", "pug");


//Read port number and database connection
const PORT = process.env.PORT;
const conString = process.env.DB_CON_STRING; //Includes parameters to connect


//Create a new Postgres client and connect
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


function requireLogin(req, res, next) {
    if(!req.session.userId){
        return res.render("error", { error: "Du musst eingeloggt sein, um auf diese Seite zuzugreifen"});
    }
    next();
}

//Routes

//Landing page
app.get("/", (req, res,next) => {
    dbClient
        .query(`
            SELECT o.post_id, o.text, o.created, 
                    u.user_id, u.name, u.profile_pic
            FROM others o
            JOIN users u ON o.user_id = u.user_id
            ORDER BY o.created DESC
        `)
        //When query succeeds => call of landing page with key others including other array
        .then(dbResponse => {
            res.render("landing", {others: dbResponse.rows});
        })
        .catch(next); //Triggers middleware error-handling
});


//Dashboard - protected
app.get("/dashboard", requireLogin,  (req, res, next) => {
    dbClient
        .query(`
            SELECT o.post_id, o.text, o.created,
                       u.user_id, u.name, u.profile_pic
            FROM others o
            JOIN users u ON o.user_id = u.user_id
            ORDER BY o.created DESC
        `)
        //When query succeeds => call of dashboard page with others key including other array
        .then(dbResponse => {
            res.render("dashboard", {others: dbResponse.rows});
        })
        .catch(next); //Triggers middleware error-handling
});


//Users list - protected
app.get("/users", requireLogin, (req, res, next) => {
    dbClient
        .query(`
            SELECT user_id, name, profile_pic
            FROM users
            ORDER BY name
        `)
        //When query succeeds => call of users page with users key including user array
        .then(dbResponse => {
            res.render("users", {users: dbResponse.rows});
        })
        .catch(next); //Triggers middleware error-handling
})


//Registration page
app.get("/register", (req, res) => {
    res.render("register");
})


//Handle registration and auto-login
app.post("/register",  (req, res, next) => {
    const { username, birthday, password } = req.body;

    dbClient
        .query(`SELECT COALESCE(MAX(user_id), 0) AS max_id 
                FROM users`)
        .then(maxResult => {
            const nextId = maxResult.rows[0].max_id + 1;


            return dbClient
                .query(`INSERT INTO users (user_id, name, password, birthday, created)
                        VALUES ($1, $2, $3, $4, NOW()) RETURNING user_id, name`,
                    [nextId, username, password, birthdate || null]
                );
        })
        .then(result => {
            const user = result.rows[0];
            req.session.userId = user.user_id;
            req.session.username = user.name;
            res.redirect("/registered-site");
        })
        .catch(next);
});

app.get("/registered-site", (req, res) => {
    res.render("registered-site");
})


//Login page
app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", (req, res, next) => {
    const { name, password } = req.body;
    dbClient
        .query(`SELECT user_id, name
                FROM users
                WHERE name = $1 AND password = $2`,
                [name, password]
        )
        .then(result => {
            if(result.rows.length > 0){
                const user = result.rows[0];
                req.session.userId = user.user_id;
                req.session.username = user.name;
                res.redirect("/dashboard");
            } else {
                res.redirect("/login?error=1");
            }
        })
        .catch(next);
});


//Logout
app.get("/logout", (req, res) => {
    req.session.destroy(err =>{
        if(err) console.error(err);
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});


//Profile page - protected
app.get("/profile", requireLogin ,(req, res, next) => {
    dbClient
        .query(`SELECT user_id, name, profile_pic, birthday, created
            FROM users WHERE user_id = $1`,
            [req.session.userId]
        )
         .then(result => {
             res.render("profile", {user: result.rows[0]});
         })
        .catch(next);
});


//Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send("Server Error");
});



//Start server
app.listen(PORT, function() {
  console.log(`OTHer running and listening on port ${PORT}`);
});
