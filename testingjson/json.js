const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex');
const { json } = require('express');

const PORT = process.env.PORT || 7000;

app.use(bodyParser.urlencoded({extended: true})); //false?
app.use(bodyParser.json());
app.use(express.static('public'));


app.get('/', (req,res) =>{
    res.sendFile(path.join(__dirname, '/public', 'index1.html'));
});

app.post('/', (req,res) => {
    console.log(JSON.parse(JSON.stringify(req.body)));
});





app.listen(PORT, () => {
    console.log(`server initiated at port ${PORT}`);
})