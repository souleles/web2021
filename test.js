//ΕXW PGADMIN4 GIA DATABASE, NA DW DBEAVER KALUTERA
//knex gia conenction me database -> knex.js.org documentation

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const knex = require('knex');
const { response } = require('express');
const { exists } = require('fs');

const PORT = process.env.PORT || 7000;

    
const db  = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1', //idio me localhost
      user : 'postgres',
      password : 'web',
      database : 'test'
    }
});

app.use(bodyParser.urlencoded({extended: true})); //false ? true
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'project',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        //maxAge: 5000, //if not given it expires when the browser closes
        sameSite: true,
        secure: true }
  }))

//check if there is a user session, if user is authenticated
const redirectLogin = (req,res,next) => {
    console.log('in redirectlogin ',req.session.userID)
    if(!req.session.userID){
        res.redirect('/signin')
    }else{
        next()
    }
}

const redirectHome = (req,res,next) => {
    console.log('at redirecthome', req.session.userID)
    if(req.session.userID){
        res.redirect('/home')
    }else{
        next()
    }
}


app.get('/', redirectLogin, (req,res) =>{
    const { userID } = req.session
    console.log(userID)
    res.send('hi');
});

app.get('/home', redirectLogin, (req,res) =>{
    //const { userID } = req.session
    //console.log('userID = ', userID)
    console.log('home page');
    res.send('hi');
});

app.get('/signin', redirectHome, (req,res) => {
    //req.session.userID = 1
    res.sendFile(path.join(__dirname, '/public', 'login.html'));
    console.log('AT GET LOGIN', req.session)
});

app.get('/register', redirectHome, (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'register.html'));
});

app.post('/signin', redirectHome, (req,res) => {
    const { userID } = req.session
    console.log('AT POST LOGIN', req.session)

    db.select('email', 'password').from('users')
    .where('email', '=', req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].password);
        console.log('validation:', isValid);
        if (isValid){
            return db.select('*').from('users')
            .where('email', '=', req.body.email)
            .then(user => {
                req.session.userID = 1;
                console.log('after validation', req.session)
                res.redirect('/home')
                //res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user'))
        }else{
            res.status(400).json('wrong credentials1')
        }

    })
    .catch(err => res.status(400).json('wrong credentials2'))
})

app.post('/register', redirectHome, (req,res) => {
    let exists = false;
    const {email, password} = req.body
    const hash = bcrypt.hashSync(password);
    // bcrypt.hash(password, null, null, function(err, hash) {
    //     // Store hash in your password DB.
    //     console.log('hashed password:', hash);
    // });

    //checking if user already exists
    db.select('email').from('users')
    .then(data => {
        data.forEach(email => {
            if(req.body.email === email.email ){
                exists = true;
                //res.status(400).json('email already exists')
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
                }).then(res.redirect('/'))
        }else{
            res.status(400).send('user already exists')
        } 
    })
})

app.post('/logout', redirectLogin, function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.redirect('/login');
 });

app.get('/profile/:id', (req,res) =>{
    const{ id } = req.params;
    db.select('*').from('users').where({'id': id})
    .then(user => {
        if (user.length){
            res.json(user[0])
        }else{
            res.status(400).json('not found')
        }
    })
    .catch(err => res.status(400).json('error getting user'))          
})

app.put('/image', (req,res) => {
    const{ id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('didnt get entries'))
})

//ERROR PAGE
//handles the non-existent paths
app.get('*', (req, res, next) => {
	res.status(200).send('Sorry, requested page not found.');
	next();
});


app.listen(PORT, () => {
    console.log(`server initiated at port ${PORT}`);
})
