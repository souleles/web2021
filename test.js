//knex gia conenction me database -> knex.js.org documentation
//TO DO: 1. login jquery msg - flash-msg !!!!!!!!must do submits from javascript 
//       2. study query strings
//       3. upload

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt-nodejs');
const session = require('express-session');
const knex = require('knex');
const KnexSessionStore = require('connect-session-knex')(session);
const { response } = require('express');
const { exists } = require('fs');

const PORT = process.env.PORT || 7000;

const db  = knex({
    client: 'pg',
    //useNullAsDefault: true,
    connection: {
      host : '127.0.0.1', //idio me localhost
      user : 'postgres',
      password : 'web',
      database : 'test'
    }
});

// const store = new KnexSessionStore({
//     db,
//     tablename: 'sessions', // optional. Defaults to 'sessions'
//   });

app.use(bodyParser.urlencoded({extended: true})); //false?
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(
    session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: false,
        //store,
        cookie: {
            maxAge: 1000*60*10*6, // 1hour for testing
        },
    }),
);

//Check if a user session has not been created
const redirectLogin = (req,res,next) => {
    if(!req.session.userID){
        res.redirect('/signin')
    }else{
        next()
    }
}

//Check if a user session has been created
const redirectHome = (req,res,next) => {
    if(req.session.userID){
        res.redirect('/')
    }else{
        next()
    }
}


app.get('/', redirectLogin, (req,res) =>{
    //const { userID } = req.session
    res.sendFile(path.join(__dirname, '/public', 'home.html'));
});

app.get('/signin', redirectHome, (req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'login.html'));
});

app.get('/register', redirectHome, (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'register.html'));
});

app.post('/register', redirectHome, (req,res) => {
    let exists = false;
    const {email, username, password} = req.body
    const hash = bcrypt.hashSync(password);

    //checking if user already exists
    db.select('email').from('users')
    .then(data => {
        data.forEach(email => {
            if(req.body.email === email.email ){
                exists = true;
                res.status(400).json('email already exists')
                //window.alert('email already exists');
            }
        })
        if (!exists){
            return db('users')
                .returning('*')
                .insert({
                    email: email,
                    password: hash,
                    username: username
                })
                .then(data  => {
                    req.session.userID = data[0].id
                    res.redirect('/users?id=' + data[0].id)
                })
        }else{
            res.status(400).redirect('/register');
            //res.status(400).send('user already exists')
        } 
    })
})

app.post('/signin', redirectHome, (req,res) => {
    const { userID } = req.session

    db.select('email', 'password', 'id').from('users')
    .where('email', '=', req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].password);
        console.log('validation after post login:', isValid);
        if (isValid){
            return db.select('*').from('users')
            .where('email', '=', req.body.email)
            .then(user => {
                req.session.userID = data[0].id;                    //bazoume data[0] giati ta epistrefei ws pinaka, ola se ena keli
                res.redirect('/users?id=' + data[0].id)
                //res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user'))
        }else{
            res.status(404).redirect('/signin?password=wrong');
            //res.status(400).redirect('/signin')//.json('wrong credentials1 - password')
        }

    })
    .catch(err => res.status(400).json('wrong credentials2, email'))
})

app.get('/users', redirectLogin, (req,res) =>{                //pigainei stin selida ../users?id=2
    const id  = req.session.userID;
    db.select('*').from('users').where({'id': id})
    .then(user => {
        if (user.length){
            res.sendFile(path.join(__dirname, '/public', 'users.html'));
        }else{
            res.status(400).json('not found')
        }
    })
    .catch(err => res.status(400).json('error getting user'))          
})

app.get('/editprofile', redirectLogin, (req,res)=>{
    res.sendFile(path.join(__dirname, '/public', 'edit.html'));
})

app.post('/editprofile', redirectLogin, (req,res)=>{
    db.select('username', 'password').from('users')
    .where('email', '=', req.body.email)
    .then(data => {
        //change password
        if(req.body.oldpassword && req.body.newpassword){
            console.log('hi?');
            const isValid = bcrypt.compareSync(req.body.oldpassword, data[0].password);
            if(isValid){
                const hash = bcrypt.hashSync(req.body.newpassword);
                //update password
                return db('users')
                .returning('*')
                .where('email', '=', req.body.email)
                .update({
                    password: hash,
                    thisKeyIsSkipped: undefined
                }).then(data =>{
                    console.log('Password changed successfully!');
                    res.redirect('/editprofile');
                })
            }else{
                res.send('wrong old password');
            }
        //change username
        }else if(req.body.username){
            return db('users')
                .returning('*')
                .where('email', '=', req.body.email)
                .update({
                    username: req.body.username,
                    thisKeyIsSkipped: undefined
                }).then(data =>{
                    console.log('Username changed successfully!');
                    res.redirect('/editprofile');
                })
        }
    }).catch(err => console.log(err));
})



app.post('/logout', redirectLogin, function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.redirect('/signin');
 });

 //ERROR PAGE
//handles the non-existent paths
app.get('*', (req, res, next) => {
	res.status(200).send('Sorry, requested page not found.');
	next();
});


app.listen(PORT, () => {
    console.log(`server initiated at port ${PORT}`);
})
