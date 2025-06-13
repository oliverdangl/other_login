const express = require("express");
const dotenv = require("dotenv");
//const pg = require("pg");//Access to postgres db through Node.js
//const bodyParser = require("body-parser");

/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;

//const conString = process.env.DB_CON_STRING; //Includes parameters to connect

/*
//Forgot to set conString
if(conString === undefined) {
    console.log("Error: environment variable DB_CON_STRING not set.");
    process.exit(1);
}
*/


//Configure connection and connect to client
//pg.defaults.ssl = true;
//const dbClient = new pg.Client(conString);
//dbClient.connect();

app = express();

//turn on serving static files (required for delivering css to client)
app.use(express.static("public"));

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
app.get("/dashboard", (req, res) => {
    res.render("dashboard");
})

//Routing to /users
app.get("/users", (req, res) => {
    res.render("users");
})

app.listen(PORT, function() {
  console.log(`OTHer running and listening on port ${PORT}`);
});
