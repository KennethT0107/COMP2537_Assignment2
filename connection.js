const MongoStore = require("connect-mongo");
require('dotenv').config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

const MongoClient = require("mongodb").MongoClient;
const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true`;
let database = new MongoClient(atlasURI, {useNewUrlParser: true, useUnifiedTopology: true});
let usrCollection = database.db(process.env.MONGODB_DATABASE).collection('users');

let mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: process.env.MONGODB_SESSION_SECRET
    }
});

function getUser(key) {
    return usrCollection.findOne({username: key});
}

module.exports = {usrCollection, mongoStore, getUser};