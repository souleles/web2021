//knex gia conenction me database -> knex.js.org documentation
//TO DO: 1. bulking, ip(both for user)
//       2. study query strings

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
const { count, info } = require('console');

const PORT = process.env.PORT || 7000;

const db  = knex({
    client: 'pg',
    //useNullAsDefault: true,
    connection: {
      host : '127.0.0.1', //idio me localhost
      user : 'postgres',
      password : 'web1',
      database : 'test',
      port : 7000
    }
});

// const store = new KnexSessionStore({
//     db,
//     tablename: 'sessions', // optional. Defaults to 'sessions'
//   });

app.use(bodyParser.urlencoded({extended: false})); //false?
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
    res.sendFile(path.join(__dirname, '/public', 'users.html'));
});

app.get('/signin', redirectHome, (req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'login.html'));
});

app.get('/authlogin', redirectHome, (req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'authlogin.html'));
});

app.get('/register', redirectHome, (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'register.html'));
});

app.post('/register', redirectHome, (req,res) => {
    let existsE = false;
    let existsU = false
    if(req.body.password && req.body.email && req.body.username){
        const {email, username, password} = req.body
        const hash = bcrypt.hashSync(password);
        
        

        //checking if user already exists
        db.select('email', 'username').from('newusers')
        .then(data => {
            data.forEach(email => {
                if(req.body.email === email.email ){
                    existsE = true;
                    res.status(400).send('Email already exists')
                }
            })
            data.forEach(username => {
                if(req.body.username === username.username){
                    existsU = true;
                    res.status(400).send('Username Already exists')
                }
            })

            if (!existsE && !existsU){
                return db('newusers')
                    .returning('*')
                    .insert({
                        email: email,
                        password: hash,
                        username: username
                    })
                    .then(data  => {
                        req.session.userID = data[0].id
                        res.send(data)
                    })
            } 
        }). catch(err =>{ console.log(err)});
    }
    else
        res.send('Please fill all the fields');
})

app.post('/signin', redirectHome, (req,res) => {
    const { userID } = req.session
    if(req.body.password && req.body.email){
        db.select('email', 'password', 'id', 'count').from('newusers')
        .where('email', '=', req.body.email)
        .then(data => {
            const isAdmin = data[0].count;
            const isValid = bcrypt.compareSync(req.body.password, data[0].password);
            console.log('validation after post login:', isValid);
            if (isValid && isAdmin==0){
                return db.select('*').from('newusers')
                .where('email', '=', req.body.email)
                .then(user => {
                    req.session.userID = data[0].id;                    //bazoume data[0] giati ta epistrefei ws pinaka, ola se ena keli
                    res.send(user);
                })
                .catch(err => res.status(400).json('unable to get user'))
            }else{
                //res.status(404).redirect('/signin');
                res.status(400).send('Password is not correct')
            }

        })
        .catch(err => res.status(400).send('Email does not exist'))
    }else {res.send('Please fill all the fields');}
})

app.post('/authlogin', redirectHome, (req,res) => {
    const { adminID } = req.session
    if(req.body.password && req.body.username){
        db.select('username', 'password', 'id', 'count').from('newusers')
        .where('username', '=', req.body.username)
        .then(data => {
            const isAdmin = data[0].count;
            const isValid = bcrypt.compareSync(req.body.password, data[0].password);
            console.log('validation after post login:', isValid);
            if (isValid & isAdmin==1){
                return db.select('*').from('newusers')
                .where('username', '=', req.body.username)
                .then(user => {
                    req.session.adminID = data[0].id;                    //bazoume data[0] giati ta epistrefei ws pinaka, ola se ena keli
                    res.send(user);
                })
                .catch(err => res.status(400).json('unable to get user'))
            }else if(isAdmin==0){
                res.status(400).send('Not Authorized Login as User')
            }
            else{
                //res.status(404).redirect('/signin');
                res.status(400).send('Password is not correct')
            }

        })
        .catch(err => res.status(400).send('Email does not exist'))
    }else {res.send('Please fill all the fields');}
})

app.get('/users', redirectLogin, (req,res) =>{
    const id  = req.session.userID;
    db.select('*').from('newusers').where('id', '=', id)
    .then(user => {
        if (user.length){
            res.sendFile(path.join(__dirname, '/public', 'users.html'));
        }else{
            res.status(400).json('not found');
        }
    })
    .catch(err => res.status(400).json('error getting user'))          
})


app.post('/users', redirectLogin, (req,res) =>{
    const id =req.session.userID;
    //console.log(JSON.parse(JSON.stringify(req.body))); // = req.body
    const har = req.body;
    // console.log(req.ip);
    // var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // if (ip.substr(0, 7) == "::ffff:") {
    //     ip = ip.substr(7)
    // }
    // console.log(ip);

    
    //save in database as json in info field
    db.select('id', 'count').from('newusers')
    .where('id', '=', id)
    .then(data =>{
        if(data[0].count = 0){
            return db('newusers')
            .returning('*')
            .insert({info: har,
                    last_entry: new Date(),
                    count: data[0].count+1
                    })
            .where('id', '=', id)
            .then((result) => {
                console.log('result saved:', JSON.stringify(result));
                res.send('success')
            }).catch((err) => {
                console.log(err);
            });
        }else{
            return db('newusers')
            .returning('*')
            .update({info: har,
                    last_entry: new Date(),
                    count: data[0].count+1
                    })
            .where('id', '=', id)
            .then((result) => {
                console.log('result saved:', JSON.stringify(result));
                res.send('success');
            }).catch((err) => {
                console.log(err);
                res.send(err);
            });
        }
    })

});




app.get('/editprofile', redirectLogin, (req,res)=>{
    res.sendFile(path.join(__dirname, '/public', 'edit.html'));
})

app.post('/editprofile', redirectLogin, (req,res)=>{
    console.log(req.body);
    db.select('username', 'password').from('newusers')
    .where('email', '=', req.body.email)
    .then(data => {
        //change password
        if(req.body.oldpassword && req.body.newpassword){
            const isValid = bcrypt.compareSync(req.body.oldpassword, data[0].password);
            if(isValid){
                const hash = bcrypt.hashSync(req.body.newpassword);
                //update password
                return db('newusers')
                .returning('password')
                .where('email', '=', req.body.email)
                .update({
                    password: hash,
                    thisKeyIsSkipped: undefined
                }).then(data =>{
                    console.log('Password changed successfully!');
                    res.send({'password': data})
                })
            }else{
                res.send('Wrong old Password');
            }
        }else if((req.body.oldpassword && !req.body.newpassword) || (!req.body.oldpassword && req.body.newpassword)){
                res.send('Please fill all the fields');
            
            //change username
        }else if(req.body.username){
            if(req.body.username !== data[0].username){
                return db('newusers')
                    .returning('username')
                    .where('email', '=', req.body.email)
                    .update({
                        username: req.body.username,
                        thisKeyIsSkipped: undefined
                    }).then(data =>{
                        console.log('Username changed successfully!');
                        res.send({'username': data});
                    })
            }else{res.status(400).send('Error: Same username as your current, please pick another one')}
        }else{res.send('Please fill all the fields');}
    }).catch(err => console.log(err));
})

app.get('/view',redirectLogin, (req,res) => {
    const id = req.session.userID;
    db.select('count', 'last_entry').from('newusers')
    .where('id', '=', id)
    .returning('*')
    .then(data =>{
        data[0].last_entry = data[0].last_entry.toISOString().slice(0,10);
        res.send(data);
    })
});


app.post('/logout', redirectLogin, function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.redirect('/signin');
 });






//ΑDMIN PAGE
app.get('/admin', (req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'admin.html'));
});

app.get('/admininfo', (req,res) => {
    const infoArray=[];
    db.count('*').from('newusers')
    .then(data => {
        // console.log(data[0].count);
        infoArray.push(data[0].count)
        //res.send(data[0].count);
    })
    db.select(db.raw('info -> \'log\' -> \'entries\'->0->\'request\' ->>\'method\' as method, count(info)')).from('newusers')
    .whereRaw('info is not NULL')
    .groupBy('method')
    .returning('*')
    .then(data =>{
        //console.log(data[0].entries.length);
        // console.log(data[0].method);
        // console.log(data[0].count)
        infoArray.push(data[0].method);
        infoArray.push(data[0].count);     
        console.log(infoArray);
           
    })
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


// COUNT(DISTINCT column)
// In this form, the COUNT(DISTINCT column) returns the number of unique non-null values in the column.
// SELECT 
//    COUNT(DISTINCT column) 
// FROM 
//    table_name
// WHERE
//    condition;
// We often use the COUNT() function with the GROUP BY clause to return the number of items for each group. For example, we can use the COUNT() with the GROUP BY clause to return the number of films in each film category.