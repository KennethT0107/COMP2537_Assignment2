const {isValidSession, sessionValidation, isAuthorized} = require("./functions.js");
require('dotenv').config();
require('ejs');
const express = require("express");
const session = require("express-session")
const app = express();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const {ObjectId} = require("mongodb");
const numberOfRandoms = 5;

const logOutWhen = 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)
const port = process.env.PORT || 8000;
const node_session_secret = process.env.NODE_SESSION_SECRET;

app.set('view engine', 'ejs');

app.use("/js", express.static("./public/js"));
app.use("/css", express.static("./public/css"));
app.use("/img", express.static("./public/img"));


const {usrCollection, mongoStore, getUser} = include('connection');

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}));

app.get('/', (req, res) => {
    if (isValidSession(req))
        res.redirect('/main');
    else
        res.render('login', {error: 0});
});

app.use('/main', sessionValidation);
app.get('/main', (req, res) => {
    res.render('main', {name: req.session.username});
});

app.get('/sign-up', (req, res) => {
    if (isValidSession(req))
        res.redirect('/main');
    else
        res.render('signUp', {error: false});
});

app.get('/kenny/:catID', (req, res) => {
    let catID =req.params.catID;

    switch (catID) {
        case "1":
            res.send("<body style='background-image: url(/img/cat1.jpg); background-size: cover; background-position: center'><h1>Fooood<br></h1></body>");
            return;
        case "2":
            res.send("<body style='background-image: url(/img/cat2.jpg); background-size: cover; background-position: center'><h1>Coughhhhh<br></h1></body>");
            return;
        case "3":
            res.send("<body style='background-image: url(/img/cat3.jpg); background-size: cover; background-position: center'><h1>FULLY CHARGED<br></h1></body>");
            return;
    }
});

app.get('/memes', (req, res) => {
    res.render('memes');
});

app.use('/admin', sessionValidation);
app.get('/admin', async (req, res) => {
    const curr = await getUser(req.session.username);
    if (await isAuthorized(req.session.username)) {
        const __users = await usrCollection.find().project({username: 1, password: 1, _id: 1, rank: 1}).toArray();
        res.render("admin", {__restrictOption: false, curr: curr, users: __users});
    } else {
        res.status(403);
        res.render("admin", {__restrictOption: true, curr: curr, users: []});
    }
})

app.get('/admin/:options/:_id', async (req, res) => {
    let id = req.params._id;
    let modifyOption = req.params.options;
    const filter = {_id: new ObjectId(id)};

    if (modifyOption === "promote") {
        await usrCollection.updateOne(filter, {$set: {rank: "admin"}});
    } else if (modifyOption === "demote") {
        await usrCollection.updateOne(filter, {$set: {rank: "user"}});
    }
    res.redirect('/admin');
})

app.post('/logging-in', async (req, res) => {
    let username = req.body.name;
    let password = req.body.password;

    const schematic = Joi.string().alphanum().max(20).required();
    const validationBool = schematic.validate(username);
    if (validationBool.error != null) {
        console.log(validationBool.error);
        res.redirect('/');
        return;
    }

    /* project: only one of each. */
    const __users = await usrCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

    if (__users.length !== 1) {
        res.render('login', {error: 1});
        return;
    }

    if (await bcrypt.compare(password,  __users[0].password)) {
        req.session.authenticated = true;
        req.session.username = username;
        req.session.cookie.maxAge = logOutWhen;
        res.redirect('/main');
        return;
    }

    else {
        res.render('login', {error: 2});
        return;
    }
});

app.post('/creatingUser', async (req, res) => {
    let username = req.body.name;
    let password = req.body.password;

    const schematic = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().max(20).required()
    });

    const validationBool = schematic.validate({username, password});
    if (validationBool.error != null) {
        res.redirect('/sign-up');
        return;
    }

    let hashedPWD = await bcrypt.hash(password, numberOfRandoms);

    /* Add to database. :) */
    try {
        await usrCollection.insertOne({username: username, password: hashedPWD, rank: "user"});
    } catch (error) {
        res.render('signUp', {error: true});
        return;
    }
    const __pkUsernameExists = await usrCollection.indexExists('username_1');
    if (!__pkUsernameExists) {
        await usrCollection.createIndex({ username: 1 }, { unique: true });
    }
    res.render('signUpSuccess');
})

app.post('/loggingOut', async (req, res) => {
    req.session.destroy();
    res.redirect('/');
})

app.get("*", (req, res) => {
    res.status(404);
    res.render('404');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});