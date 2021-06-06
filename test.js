//to do: 
//      1. for ips (heatmaps) check ip stack, ip-api, ipapi
//      2. at charts black color the letters, alkis eipe x-axis?
//      3. at login page: change position of login as admin at top right corner
//      4. user 3: plithos eggrafwn? -> a. plithos twn arxeiwn pou exei anebasei 
//                                      b. plithos twn entries pou exei exoun ta arxeia (eggrafes)
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt-nodejs');
const session = require('express-session');
const knex = require('knex');
const { exists } = require('fs');
const { count } = require('console');
const { userInfo } = require('os');
const KnexSessionStore = require('connect-session-knex')(session);

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

app.use(bodyParser.urlencoded({limit: '5000mb', extended: true})); //max har size 50000 mb
app.use(bodyParser.json({limit: '5000mb', extended: true}));
// app.use(bodyParser.urlencoded({extended: false})); //false?
// app.use(bodyParser.json());
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

//Check if admin session has not been created
const redirectLoginadmin = (req,res,next) => {
    if(!req.session.adminID){
        res.redirect('/authlogin')
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

const redirectHomeadmin = (req,res,next) => {
    if(req.session.adminID){
        res.redirect('/admin')
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

app.get('/authlogin', redirectHomeadmin, (req,res) => {
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
    const { userID } = req.session
    if(req.body.password && req.body.email){
        db.select('email', 'password', 'id', 'admin_pass').from('newusers')
        .where('email', '=', req.body.email)
        .then(data => {
            const isAdmin = data[0].admin_pass;
            const isValid = bcrypt.compareSync(req.body.password, data[0].password);
            console.log('validation after post login:', isValid);
            if (isValid==1 & isAdmin==0){
                return db.select('*').from('newusers')
                .where('email', '=', req.body.email)
                .then(user => {
                    req.session.userID = data[0].id;                    //bazoume data[0] giati ta epistrefei ws pinaka, ola se ena keli
                    res.send(user);
                })
                .catch(err => res.status(400).json('unable to get user'))
            }else if (isAdmin){
                res.status(400).send('Login As Admin')
            }
            else{
                //res.status(404).redirect('/signin');
                res.status(400).send('Password is not correct')
            }

        })
        .catch(err => res.status(400).send('Email does not exist'))
    }else {res.send('Please fill all the fields');}
})

app.post('/authlogin', redirectHomeadmin, (req,res) => {
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
    const id = req.session.userID;
    const har = JSON.parse(req.body.har);
    const isp = req.body.isp;
    const lat = req.body.lat;
    const lon = req.body.lon;
    const user_city = req.body.user_city;
    const chunkSize = 100;
    const rows = [];
    
    har.log.entries.forEach(data => {
        const startedDateTime = data.startedDateTime;
        const serverIPAddress = data.serverIPAddress;
        const wait = data.timings.wait;
        const method = data.request.method;
        const url = data.request.url;
        const status = data.response.status;
        const statustext = data.response.statusText;
        var content, lastMod, cacheControl, pragma, expires, age, host;

        data.response.headers.forEach(headers =>{
            if(headers.name){
                if(headers.name === 'content-type' || headers.name === 'Content-Type'){
                    content = headers.value.toLowerCase(); //because some may be the same but with a different upper cased letter
                }
                if(headers.name === 'last-modified'){
                    lastMod = headers.value;
                }

                if(headers.name === 'pragma'){
                    pragma = headers.value;
                }
                if(headers.name === 'expires'){
                    expires = headers.value;
                }
                if(headers.name === 'age'){
                    age = headers.value;
                }
                if(headers.name === 'cache-control'){
                    cacheControl = headers.value;
                }
            }
        })
        data.request.headers.forEach(headers => {
            if(headers.name){
                if(headers.name === 'Host'){
                    host = headers.value;
                }

            }
        })
        rows.push({user_id: id, 
            starteddatetime: startedDateTime, 
            serverip: serverIPAddress, 
            wait: wait, 
            method: method, 
            url: url, 
            status: status, 
            statustext: statustext, 
            content: content, 
            lastmod: lastMod, 
            cachecontrol: cacheControl, 
            pragma: pragma, 
            expires: expires, 
            age: age, 
            host: host
        })
    });
    
    if(har === {}){
        console.log('empty har, happens when u press save without choosing har')
    }else{
        //save in database as json in info field

        db.batchInsert('entries', rows, chunkSize)
        .returning('*')
        .then((result) => {
            console.log('saved HAR and user info succesfully');
        }).catch((err) => {
            console.log(err);
        });

        return db('newusers')
        .returning('*')
        .update({
                last_entry: new Date(),
                isp: isp,
                lat: lat,
                lon: lon, 
                user_city: user_city
                })
        .where('id', '=', id)
        .then((result) => {
           // console.log('result saved:', JSON.stringify(result));
            res.send('success');
        }).catch((err) => {
            console.log(err);
            res.send(err);
        });
    }

});

app.get('/heatmap',redirectLogin, (req,res)=>{
    const id = req.session.userID;
    db.select('serverip','content').from('entries')
    .where('user_id', '=', id)
    .where('content', 'LIKE', 'text/%') //after % can be html, html charset=utf-8 ,plain, javascript, css
    .then(data => {
        // console.log(data);
        res.send(data);
    })
    .catch(err => res.status(400).json('error getting http info user send'));
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
    }).catch(err => res.status(400).send('Wrong email or username exists'));
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
app.get('/admin', redirectLoginadmin,(req,res) => {
    res.sendFile(path.join(__dirname, '/public', 'admin.html'));
});


//USER INFORMATION
//ADMIN 1a. 
app.get('/admininfo1', redirectLoginadmin, (req,res) => {

    db.count('*').from('newusers').then( data => {
        //console.log('------- 1a', data[0].count);
        res.send(data[0].count);
    
    })
});

//ADMIN 1b.
app.get('/admininfo2', redirectLoginadmin, (req,res) => {

    var finalArray = [];
    db.select(db.raw('method, count(method)')).from('entries')
    .groupBy('method')
    .then(data =>{
        data.forEach( method =>{
            finalArray.push([method.method, method.count])
        })
        //console.log('\n------------ 1b', finalArray);
        res.send(finalArray);
    })

});

//ADMIN 1c.
app.get('/admininfo3', redirectLoginadmin, (req,res) => {

    var finalArray = [];
    db.select(db.raw('status, count(status)')).from('entries')
    .groupBy('status')
    .then(data =>{
        data.forEach(status => {
            finalArray.push([status.status, status.count])
        })
        //console.log('\n---------1c', finalArray);
        res.send(finalArray);
    })

});

//ADMIN 1d.
app.get('/admininfo4', redirectLoginadmin, (req,res) => {

    db('entries').countDistinct('url') 
    .then( data => {
        //console.log('\n---------1d', data[0].count);
        res.send(data[0].count);
    })
});

//ADMIN 1e.
app.get('/admininfo5', redirectLoginadmin, (req,res) => {

    db('newusers').countDistinct('isp') 
    .then(data =>{
        //console.log('\n---------1e', data[0].count);
        res.send(data[0].count);
    })

});

//ADMIN 1f
app.get('/admininfo6', redirectLoginadmin, (req,res) => {  
    
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var contentAgeArray = [];

    db.select('content', 'starteddatetime', 'lastmod').from('entries')
    .whereNotNull('lastmod')
    .whereNotNull('content')
    .then( data => {
        data.forEach( data1 =>{
            month = data1.lastmod.slice(8,11);
            monthMod = parseInt(months.indexOf(month)+1);
            dayMod = parseInt(data1.lastmod.slice(5,7));
            yearMod = parseInt(data1.lastmod.slice(12,16));

            dayStarted = parseInt(data1.starteddatetime.slice(5,7));
            monthStarted = parseInt(data1.starteddatetime.slice(8,10));
            yearStarted = parseInt(data1.starteddatetime.slice(0,4));

            var ageDay=0;

            //Date computations
            if(yearStarted === yearMod){
                ageDay = Math.abs((monthStarted-monthMod)*30 + (dayStarted-dayMod));
            }else{
                ageDay = Math.abs((yearStarted-yearMod)*12*30 + (monthStarted-monthMod)*30 + (dayStarted-dayMod));
            }

            //1x3 contentAgeArray, where fields are: content, count, age
            if(contentAgeArray.length === 0){
                contentAgeArray.push([data1.content, 1, ageDay]);
            }else{
                for(var i=0; i<contentAgeArray.length; i++){
                    if(data1.content.toLowerCase() === contentAgeArray[i][0].toLowerCase() ){
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
                    contentAgeArray.push([data1.content, 1, ageDay]);
                }
            }
        })
        //console.log('\n------ 1f ', contentAgeArray);
        res.send(contentAgeArray);

    })
});

//TIMINGS
app.get('/contentChart', redirectLoginadmin, (req,res) => {
    db.select('content', 'starteddatetime', 'wait').from('entries')
    .whereNotNull('content')
    .then( data => {
        var contentChart= [];
        var contentPosition = 0;

        data.forEach( data1 => {
            var exists = false;
            var hour = parseInt(data1.starteddatetime.slice(11,13));

            if(contentChart.length === 0){
                contentChart.push([data1.content]);
                contentChart[contentPosition][hour+1] = [data1.wait, 1];
            }
            else{
                for(var i=0; i<contentChart.length; i++){
                    //if content-type exists already in the array
                    if(data1.content.toLowerCase() === contentChart[i][0].toLowerCase() ){
                        var position = i;
                        var exists = true;
                        break;
                    }
                }
                if(exists === true ){

                    if(contentChart[position][hour+1]){
                        contentChart[position][hour+1] = [contentChart[position][hour+1][0] + data1.wait, contentChart[position][hour+1][1] + 1];
                    }else{
                        contentChart[position][hour+1] = [data1.wait, 1];
                    }
                    exists=false;
                }else{
                    contentChart.push([data1.content]);
                    contentPosition = contentPosition + 1;
                    contentChart[contentPosition][hour+1] = [data1.wait, 1];
                }
            }
        })

        // console.log('\n\n----------A', contentChart);
        res.send(contentChart);
    })
});


app.get('/dayChart', redirectLoginadmin, (req,res) => {
    var weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var dayChart= [];
    for(let i=0; i<7; i++){
        dayChart[i] = [weekday[i]];
    }
 

    db.select('starteddatetime', 'wait').from('entries')
    .then( data => {
        data.forEach(data1 =>{
            var date = new Date(data1.starteddatetime);
            var day = weekday[date.getDay()];
            var hour = parseInt(data1.starteddatetime.slice(11,13));

            for(var i=0; i<dayChart.length; i++){
                if(day.toLowerCase() === dayChart[i][0].toLowerCase() ){
                    if(dayChart[i][hour+1]){
                        dayChart[i][hour+1] = [dayChart[i][hour+1][0] + data1.wait, dayChart[i][hour+1][1] + 1];
                    }else{
                        dayChart[i][hour+1] = [data1.wait, 1];
                    }
                }
            }
        })
        //console.log('\n\n----------B', dayChart);
        res.send(dayChart);
    })
});


app.get('/methodChart', redirectLoginadmin, (req,res) => {

    db.select('method', 'wait', 'starteddatetime').from('entries')
    .then( data => {
        var methodPosition = 0;
        var methodChart = [];

        data.forEach( data1 => {
            var method = data1.method;
            var hour = parseInt(data1.starteddatetime.slice(11,13));
            var exists = false;

            if(methodChart.length === 0){
                methodChart.push([method]);
                methodChart[methodPosition][hour+1] = [data1.wait, 1];
            }else{
                for(var i=0; i<methodChart.length; i++){
                    //if content-type exists already in the array
                    if(method.toLowerCase() === methodChart[i][0].toLowerCase() ){
                        var position = i;
                        exists = true;
                        break;
                    }
                }
                if(exists === true ){

                    if(methodChart[position][hour+1]){
                        methodChart[position][hour+1] = [methodChart[position][hour+1][0] + data1.wait, methodChart[position][hour+1][1] + 1];
                    }else{
                        methodChart[[position]][hour+1] = [data1.wait, 1];
                    }
                    exists=false;
                }else{
                    methodChart.push([method]);
                    methodPosition = methodPosition + 1;
                    methodChart[methodPosition][hour+1] = [data1.wait, 1];
                }
            }
        })
        //console.log('\n\n----------C', methodChart);
        res.send(methodChart);
    })
})


app.get('/providerChart', redirectLoginadmin, (req,res) =>{

    db.select('isp', 'starteddatetime', 'wait').from('entries').joinRaw('inner join newusers on user_id=id')
    .then(data => {
        var provArray = [];
        var providerPosition = 0;

        data.forEach( data1 => {
            var isp = data1.isp;
            var hour = parseInt(data1.starteddatetime.slice(11,13));
            var exists = false;

            if(provArray.length === 0){
                provArray.push([isp]);
                provArray[providerPosition][hour+1] = [data1.wait, 1];
            }else{
                for(var i=0; i<provArray.length; i++){

                    if(isp.toLowerCase() === provArray[i][0].toLowerCase() ){
                        var position = i;
                        exists = true;
                        break;
                    }
                }
                if(exists === true ){

                    if(provArray[position][hour+1]){
                        provArray[position][hour+1] = [provArray[position][hour+1][0] + data1.wait, provArray[position][hour+1][1] + 1];
                    }else{
                        provArray[[position]][hour+1] = [data1.wait, 1];
                    }
                    exists=false;
                }else{
                    provArray.push([isp]);
                    providerPosition = providerPosition + 1;

                    provArray[providerPosition][hour+1] = [data1.wait, 1];
                }
            }
        })
        //console.log('\n\n8----------D', provArray);
        res.send(provArray);
    });
})

app.get('/entriesMap', redirectLoginadmin, (req,res)=>{
    db.select(db.raw('serverip, id, username, user_city, lat, lon, count(content)')).from('entries').joinRaw('inner join newusers on user_id=id')
    .whereNotNull('serverip')
    .where('content', 'LIKE', 'text/%')
    .groupBy('serverip', 'id')
    .then(data => {
        res.send(data);
    })
})

app.post('/logout', redirectLogin, function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.redirect('/signin');
 });

app.post('/logoutAdmin', redirectLoginadmin, function(req, res){
    req.session.destroy(function(){
       console.log("admin logged out.")
    });
    res.redirect('/authlogin');
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
