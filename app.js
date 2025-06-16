//Load environment variables from .env file
const dotenv = require("dotenv");
dotenv.config();

const express = require("express"); //Import express
const pg = require("pg"); //Import PostgreSQL client library
const bodyParser = require("body-parser"); //Import body-parser

const app = express();


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


//Serve files from "public"
app.use(express.static("public"));
//Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));

//Store current request path in res.locals for template
app.use((req,res,next) => {
    res.locals.currentPath = req.path;
    next();
})

//Tell Express where to find view template and that pug is used
app.set("views", "views");
app.set("view engine", "pug");

//Redirect root URL to /dashboard
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





//Route: /dashboard
//Get "others" posts with posts joined with users
// => o.user_id as primary key and u.user_id as foreign key
//After that render dashboard
app.get("/dashboard", (req, res, next) => {
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


//Route: /users
//Get all users (id, name, picture) sorted by name alphabetically
//After that render users
//"next" function to tell express if something goes wrong => appropriate error handler
app.get("/users", (req, res, next) => {
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

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {
    const { name, birthday, password } = req.body;
    dbClient
        .query(`INSERT INTO users (name, password, birthday, created)
                VALUES ($1, $2, $3, NOW())`,
        [name, password, birthday || null ]
        )
        .then(dbResponse => {
            res.redirect("/registered-site");
        })
        .catch(next);
});

app.get("/registered-site", (req, res) => {
    res.render("registered-site");
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/profile", (req, res) => {
    res.render("profile");
})


//Middleware error handling
// ganz am Ende, nach allen Routen:
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send("Server Error");
});



//Listen on the configured port
app.listen(PORT, function() {
  console.log(`OTHer running and listening on port ${PORT}`);
});
