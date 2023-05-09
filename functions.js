/*
    By Instructor.
 */
//Define the include function for absolute file name
global.base_dir = __dirname;
global.abs_path = function(path) {
    return base_dir + path;
}
global.include = function(file) {
    return require(abs_path('/' + file));
}

const {getUser} = include('connection');
function isValidSession(req) {
    return req.session.authenticated;
}

function sessionValidation(req, res, next) {
    if (isValidSession(req))
        next();
    else
        res.redirect('/');
}

async function isAuthorized(username) {
    const curr = await getUser(username);
    return curr.rank === "admin";
}

module.exports = {isValidSession, sessionValidation, isAuthorized};