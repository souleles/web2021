//knex gia conenction me database -> knex.js.org documentation
//TO DO: 1. login jquery msg
//       2. study query strings
//       3. upload, edit users

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
            maxAge: 1000*60*10, // 10 minutes for testing
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
        res.redirect('/home')
    }else{
        next()
    }
}


app.get('/', (req,res) =>{
    //const { userID } = req.session
    res.sendFile(path.join(__dirname, '/public', 'home.html'));
});

app.get('/home', (req,res) =>{
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
    const {email, password} = req.body
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
                    joined: new Date()
                })
                .then(data  => {
                    req.session.userID = data[0].id
                    res.redirect('/home')
                })
        }else{
            res.status(400).send('user already exists')
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
            res.redirect('/signin');
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


// app.get('/users/:id', redirectLogin, (req,res) =>{    //pigainei stin selida ../users/2
//     const{ id } = req.params;
//     db.select('*').from('users').where({'id': id})
//     .then(user => {
//         if (user.length){
//             res.sendFile(path.join(__dirname, '/public', 'users.html'));
//         }else{
//             res.status(400).json('not found')
//         }
//     })
//     .catch(err => res.status(400).json('error getting user'))          
// })

app.get('/editprofile', (req,res)=>{
    res.sendFile(path.join(__dirname, '/public', 'edit.html'));
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
