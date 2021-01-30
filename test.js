//knex gia conenction me database -> knex.js.org documentation
//TO DO: 1. bulking, ip(both for user)

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
      password : 'web',
      database : 'test'
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
    console.log('admin:', bcrypt.hashSync('admin'));
    const { userID } = req.session
    if(req.body.password && req.body.email){
        db.select('email', 'password', 'id').from('newusers')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].password);
            console.log('validation after post login:', isValid);
            if (isValid){
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

    //ADMIN 1a.
    db.count('*').from('newusers')
    .then(data => {
        // console.log(data[0].count);
        infoArray.push(data[0].count)
        //res.send(data[0].count);
    })

    //ADMIN 1b.
    db.select(db.raw('info -> \'log\' -> \'entries\' as entries, id')).from('newusers')
    .whereRaw('info is not NULL')
    .then(data=>{
        var maxLength = 0;
        var final = 0;
    
        const lengthArray = [];
        const methodArray = [];
        const finalArray = [];

        data.forEach(entries => {
            lengthArray.push(entries.entries.length);
        })

        for (i=0; i <= maxLength; i++){
            if (lengthArray[i] > maxLength) {
                maxLength = lengthArray[i];
            }
        }
        //console.log('maxLength:', maxLength);

        for(var i=0; i < maxLength; i++){
            db.select(db.raw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'method\' as method, count(info)', i)).from('newusers')
            .whereRaw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'method\' is not NULL', i)
            .groupBy('method')
            .returning('*')
            .then(data =>{
                //console.log(data); //typeof(data) = object

                methodArray.push(data);    
                final = final+1;

                //when methodArray is done
                var methodExists = false;
                var position=0;

                if(final === maxLength){
                    //console.log('\n\nMETHOD ARRAY\n', methodArray);
                    for(var j=0; j<methodArray.length; j++){
                        for(k=0; k<methodArray[j].length; k++){

                            if(finalArray.length===0){
                                finalArray.push([methodArray[j][k].method, parseInt(methodArray[j][k].count)]);
                            }
                            else{
                                for(m=0; m<finalArray.length; m++){
                                    if(methodArray[j][k].method === finalArray[m][0]){
                                        methodExists = true;
                                        position = m;
                                        break; 
                                    }
                                }

                                if(methodExists === true){
                                    finalArray[position][1] = parseInt(methodArray[j][k].count) + parseInt(finalArray[position][1]);
                                }else{
                                    finalArray.push([methodArray[j][k].method, parseInt(methodArray[j][k].count)]);

                                }
                            }
                        }
                    }
                    console.log('\n', finalArray);
                }
            })
        }
    })

    //ADMIN 1c.
    db.select(db.raw('info -> \'log\' -> \'entries\' as entries, id')).from('newusers')
    .whereRaw('info is not NULL')
    .then(data=>{
        var maxLength = 0;
        var finalCount = 0;
    
        const lengthArray = [];
        const statusArray = [];
        const finalArray = [];
    
        data.forEach(entries => {
            lengthArray.push(entries.entries.length);
        })

        for (i=0; i <= maxLength; i++){
            if (lengthArray[i] > maxLength) {
                maxLength = lengthArray[i];
            }
        }
        //console.log('maxLength:', maxLength);

        for(var i=0; i < maxLength; i++){
            db.select(db.raw('info -> \'log\' -> \'entries\'->??->\'response\' ->>\'status\' as status, count(info)', i)).from('newusers')
            .whereRaw('info -> \'log\' -> \'entries\'->??->\'response\' ->>\'status\' is not NULL', i)
            .groupBy('status')
            .returning('*')
            .then(data =>{
                //console.log('DATA', data); //typeof(data) = object

                statusArray.push(data);    
                finalCount = finalCount+1;

                //when statusArray is done
                var methodExists = false;
                var position=0;

                if(finalCount === maxLength){
                    //console.log('\n\nMETHOD ARRAY\n', statusArray);
                    for(var j=0; j<statusArray.length; j++){
                        for(k=0; k<statusArray[j].length; k++){

                            if(finalArray.length===0){
                                finalArray.push([parseInt(statusArray[j][k].status), parseInt(statusArray[j][k].count)]);
                            }
                            else{
                                for(m=0; m<finalArray.length; m++){
                                    if(parseInt(statusArray[j][k].status) === finalArray[m][0]){
                                        methodExists = true;
                                        position = m;
                                        break; 
                                    }
                                }

                                if(methodExists === true){
                                    finalArray[position][1] = parseInt(statusArray[j][k].count) + parseInt(finalArray[position][1]);
                                }else{
                                    finalArray.push([parseInt(statusArray[j][k]), parseInt(statusArray[j][k].count)]);

                                }
                            }
                        }
                    }
                    console.log('\n', finalArray);
                }
            })
        }
    })

    //ADMIN 1d.
    db.select(db.raw('info -> \'log\' -> \'entries\' as entries, id')).from('newusers')
    .whereRaw('info is not NULL')
    .then(data=>{
        var maxLength = 0;
        var finalCount = 0;
    
        const lengthArray = [];
        const urlArray = [];
        const finalArray = [];
    
        data.forEach(entries => {
            lengthArray.push(entries.entries.length);
        })

        for (i=0; i <= maxLength; i++){
            if (lengthArray[i] > maxLength) {
                maxLength = lengthArray[i];
            }
        }
        //console.log('maxLength:', maxLength);

        for(var i=0; i < maxLength; i++){
            db.select(db.raw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'url\' as url, count(info)', i)).from('newusers')
            .whereRaw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'url\' is not NULL', i)
            .groupBy('url')
            .returning('*')
            .then(data =>{
                //console.log('DATA', data); //typeof(data) = object

                urlArray.push(data);    
                finalCount = finalCount+1;

                //when urlArray is done
                var urlExists = false;
                var position=0;

                if(finalCount === maxLength){
                    //console.log('\n\nURL ARRAY\n', urlArray);
                    for(var j=0; j<urlArray.length; j++){
                        for(k=0; k<urlArray[j].length; k++){

                            if(finalArray.length===0){
                                finalArray.push([(urlArray[j][k].url), parseInt(urlArray[j][k].count)]);
                            }
                            else{
                                for(m=0; m<finalArray.length; m++){
                                    if((urlArray[j][k].url) === finalArray[m][0]){
                                        urlExists = true;
                                        position = m;
                                        break; 
                                    }
                                }

                                if(urlExists === true){
                                    finalArray[position][1] = parseInt(urlArray[j][k].count) + parseInt(finalArray[position][1]);
                                }else{
                                    finalArray.push([(urlArray[j][k]), parseInt(urlArray[j][k].count)]);

                                }
                            }
                        }
                    }

                    console.log('\n', finalArray.length);
                }
            })
        }
    })

    //ADMIN 1e.
    db('newusers').select(db.raw('email into temp table providers')) //change email to provider when added to database
    .then(data =>{
        db.countDistinct('email').from('providers')
        .then(count=>{
            console.log(count);
            console.log(count[0].count); //typeof = string
        })
    })
    

});

    //ADMIN 1f



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