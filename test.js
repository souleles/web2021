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
<<<<<<< HEAD
app.use(bodyParser.urlencoded({limit: '5000mb', extended: true})); //max har size 50000 mb
app.use(bodyParser.json({limit: '5000mb', extended: true}));
// app.use(bodyParser.urlencoded({extended: false})); //false?
// app.use(bodyParser.json());
=======


app.use(bodyParser.urlencoded({limit: '50000mb', extended: true})); //max har size 50000 mb
app.use(bodyParser.json({limit: '50000mb', extended: true}));
>>>>>>> 4db048e68c618430e93f424da9fecbacf0cbaffa
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

app.get('/authlogin', redirectHome, (req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'authlogin.html'));
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

app.post('/authlogin', redirectHome, (req,res) => {
    const { adminID } = req.session
    if(req.body.password && req.body.username){
        db.select('username', 'password', 'id', 'admin_pass').from('newusers')
        .where('username', '=', req.body.username)
        .then(data => {
            const isAdmin = data[0].admin_pass;
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
    if(har === {}){
        console.log('empty har, happens when u press save without choosing har')
    }else{
        //save in database as json in info field
        db('entries')
        .returning('*')
        .insert({info: har,
                user_id: id
                })
        .then((result) => {
            console.log('result saved:', JSON.stringify(result));
            res.send('success')
        }).catch((err) => {
            console.log(err);
        });

        return db('newusers')
        .returning('*')
        .update({
                last_entry: new Date(),
                })
        .where('id', '=', id)
        .then((result) => {
            console.log('result saved:', JSON.stringify(result));
            //res.send('success');
        }).catch((err) => {
            console.log(err);
            res.send(err);
        });
    }

});




app.get('/editprofile', redirectLogin, (req,res)=>{
    res.sendFile(path.join(__dirname, '/public', 'edit.html'));
})

app.post('/editprofile', redirectLogin, (req,res)=>{
    //console.log(req.body);
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
                    //thisKeyIsSkipped: undefined
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
                        //thisKeyIsSkipped: undefined
                    }).then(data =>{
                        console.log('Username changed successfully!');
                        res.send({'username': data});
                    })
            }else{res.status(400).send('Error: Same username as your current, please pick another one')}
        }else{res.send('Please fill all the fields');}
    }).catch(err => {
        res.status(400).send('Wrong email or username exists');
        console.log(err)});
})

app.get('/view',redirectLogin, (req,res) => {
    const id = req.session.userID;
    db.select(db.raw('count(user_id), last_entry')).from('entries').joinRaw('inner join newusers on user_id=id')
    .where('user_id', '=', id)
    .groupBy('last_entry')
    .returning('*')
    .then(data =>{
        if (data.length === 0){
            res.send('empty');
        }else{
            data[0].last_entry = data[0].last_entry.toISOString().slice(0,10);
            res.send(data);
        }

    })
});


//ΑDMIN PAGE
app.get('/admin', (req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'admin.html'));
});

app.get('/admininfo1', async (req,res) => {
    const infoArray=[];

    //ADMIN 1a. 
    const first = await db.count('*').from('newusers')
    //console.log('------- 1a', first[0].count);
    infoArray.push(parseInt(first[0].count))
    res.send(first[0].count);

});

app.get('/admininfo2', async (req,res) => {

            //Preprocessing, getting max length of entries
            const preprocess = await db.select(db.raw('info -> \'log\' -> \'entries\' as entries')).from('entries')
            .whereRaw('info is not NULL')
            //console.log(preprocess);
            var maxLength = 0;
    
            const lengthArray = [];
    
            preprocess.forEach(entries => {
            lengthArray.push(entries.entries.length);
            })
    
            for (i=0; i <= maxLength; i++){
                if (lengthArray[i] > maxLength) {
                    maxLength = lengthArray[i];
                }
            }

    //ADMIN 1b.
    var finalArray = [];
    const methodArray = [];
    for(var i=0; i < maxLength; i++){
        const second = await db.select(db.raw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'method\' as method, count(info)', i)).from('entries')
                            .whereRaw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'method\' is not NULL', i)
                            .groupBy('method')
        
        methodArray.push(second);    
    }
    console.log(methodArray)
    var methodExists = false;
    var position=0;
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
                    methodExists = false;
                }else{
                    finalArray.push([methodArray[j][k].method, parseInt(methodArray[j][k].count)]);

                }
            }
        }
    }
   //console.log('\n------------ 1b', finalArray);
    res.send(finalArray)
//     infoArray.push(finalArray);
//     finalArray = [];
});

app.get('/admininfo3', async (req,res) => {
        //Preprocessing, getting max length of entries
        const preprocess = await db.select(db.raw('info -> \'log\' -> \'entries\' as entries')).from('entries')
        .whereRaw('info is not NULL')
        //console.log(preprocess);
        var maxLength = 0;
        var finalArray = [];
        var statusArray = [];
        const lengthArray = [];

        preprocess.forEach(entries => {
        lengthArray.push(entries.entries.length);
        })

        for (i=0; i <= maxLength; i++){
            if (lengthArray[i] > maxLength) {
                maxLength = lengthArray[i];
            }
        }

    //ADMIN 1c.

    for(var i=0; i < maxLength; i++){
        const third = await db.select(db.raw('info -> \'log\' -> \'entries\'->??->\'response\' ->>\'status\' as status, count(info)', i)).from('entries')
                            .whereRaw('info -> \'log\' -> \'entries\'->??->\'response\' ->>\'status\' is not NULL', i)
                            .groupBy('status')

        ///console.log(statusArray)
        statusArray.push(third);
    }


    var statusexists = false;
    var position=0;
    for(var j=0; j<statusArray.length; j++){
        for(k=0; k<statusArray[j].length; k++){

            if(finalArray.length===0){
                finalArray.push([parseInt(statusArray[j][k].status), parseInt(statusArray[j][k].count)]);
            }
            else{
                for(m=0; m<finalArray.length; m++){
                    if(parseInt(statusArray[j][k].status) === finalArray[m][0]){
                        statusexists = true;
                        position = m;
                        break; 
                    }
                }

                if(statusexists === true){
                    finalArray[position][1] = parseInt(statusArray[j][k].count) + parseInt(finalArray[position][1]);
                    statusexists=false;
                }else{
                    finalArray.push([parseInt(statusArray[j][k].status), parseInt(statusArray[j][k].count)]);

                }
            }
        }
    }
    console.log('\n---------1c', finalArray);
    res.send(finalArray);
});

app.get('/admininfo4', async (req,res) => {
            //Preprocessing, getting max length of entries
            const preprocess = await db.select(db.raw('info -> \'log\' -> \'entries\' as entries')).from('entries')
            .whereRaw('info is not NULL')
            //console.log(preprocess);
            var maxLength = 0;
    
            const lengthArray = [];
    
            preprocess.forEach(entries => {
            lengthArray.push(entries.entries.length);
            })
    
            for (i=0; i <= maxLength; i++){
                if (lengthArray[i] > maxLength) {
                    maxLength = lengthArray[i];
                }
            }
    var finalArray = [];
    //ADMIN 1d.
    const urlArray = [];
    for(var i=0; i < maxLength; i++){
        const forth = await db.select(db.raw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'url\' as url, count(info)', i)).from('entries')
                            .whereRaw('info -> \'log\' -> \'entries\'->??->\'request\' ->>\'url\' is not NULL', i)
                            .groupBy('url')
        
        urlArray.push(forth);
    }
    var urlExists = false;
    var position=0;

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
                    urlExists = false;
                }else{
                    finalArray.push([(urlArray[j][k].url), parseInt(urlArray[j][k].count)]);
                }
            }
        }
    }
    //console.log('\n-------1d', finalArray);
    //console.log('\n-------1d', finalArray.length);
    // infoArray.push(finalArray.length)
    res.send(finalArray);
});


app.get('/admininfo5', async (req,res) => {


    //ADMIN 1e.
    const fifth1 = await db('newusers').select(db.raw('email into temp table providers1')) //change email to provider when added to database
    const fifth2 = await db.countDistinct('email').from('providers1')
    //console.log('\n------1e-2',fifth2[0].count); //typeof = string
    //infoArray.push(parseInt(fifth2[0].count));
    res.send(fifth2[0].count);
    const drop = await db.schema.dropTable('providers1');
});


app.get('/admininfo6', async (req,res) => {  
    const preprocess = await db.select(db.raw('info -> \'log\' -> \'entries\' as entries')).from('entries')
    .whereRaw('info is not NULL')
    
    //ADMIN 1f
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var contentAgeArray = [];

    //access antries
    preprocess.forEach(data1 =>{
        //console.log('data1', data1);
        //loop through every entries object
        data1.entries.forEach(entries =>{
            var lastModExists = 0;
            //console.log('------ entries', entries);
            //loop through headers
            entries.response.headers.forEach(header => {
                if(header.name === 'last-modified'){
                    month = header.value.slice(8,11);
                    monthMod = parseInt(months.indexOf(month)+1);
                    dayMod = parseInt(header.value.slice(5,7));
                    yearMod = parseInt(header.value.slice(12,16));
                    //console.log('\nLAST MODIFIED: ', header.value);
                    lastModExists=1;
                }
                //console.log('---------header', header);
            })
            //get content-type and startedDateTime of entries that have last-modified
            if(lastModExists === 1){
                entries.response.headers.forEach(header => {
                    if(header.name === 'content-type'){
                        contentType = header.value;
                    }
                })
                //console.log('startedDateTime: ', entries.startedDateTime.slice(0,10));
                var ageDay=0;
                dayStarted = parseInt(entries.startedDateTime.slice(5,7));
                monthStarted = parseInt(entries.startedDateTime.slice(8,10));
                yearStarted = parseInt(entries.startedDateTime.slice(0,4));

                if(yearStarted === yearMod){
                    ageDay = Math.abs((monthStarted-monthMod)*30 + (dayStarted-dayMod));
                }else{
                    ageDay = Math.abs((yearStarted-yearMod)*12*30 + (monthStarted-monthMod)*30 + (dayStarted-dayMod));
                }
                //console.log('age to days', ageMonth * 30 + ageDay);
                //ageMonth * 30 + ageDay = age counted to days
                //1x3 contentAgeArry, where fields are: contentType, count, age
                if(contentAgeArray.length === 0){
                    contentAgeArray.push([contentType, 1, ageDay]);
                }else{
                    for(var i=0; i<contentAgeArray.length; i++){
                        if(contentType.toLowerCase() === contentAgeArray[i][0].toLowerCase() ){
                            var position = i;
                            var exists = true;
                            break;
                        }
                    }
                    if(exists === true ){
                        contentAgeArray[position][1] = contentAgeArray[position][1] + 1;
                        contentAgeArray[position][2] = contentAgeArray[position][2] + ageDay;
                        exists=false;
                    }else{
                        contentAgeArray.push([contentType, 1, ageDay]);
                    }
                }
            }
        })

    })
    //console.log('\n------ 1f ', contentAgeArray);

    //infoArray.push(contentAgeArray);
    //console.log('\n\nFINALLY?', infoArray)
    res.send(contentAgeArray);
});


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
