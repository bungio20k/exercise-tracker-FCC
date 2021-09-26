const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// My code start here
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Schema } = mongoose;

mongoose.connect(process.env.URI, {useNewUrlParser: true});
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const userSchema = Schema({
    username: String
})

const exerciseSchema = Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User' 
    },
    description: {type: String, required: true},
    duration: {type: Number, required: true},
    date: Date,
})

const logSchema = Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    count: Number,
    log: [{
        type: Schema.Types.ObjectId,
        ref: 'Exercise'
    }]
})

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Log = mongoose.model('Log', logSchema);

app.get("/api/users", (req, res) => {
    User.find().exec((err, data) => {
        if (err) return console.log(err);
        res.json(data);
    })
})

app.get("/api/users/:_id/logs", (req, res) => {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);

    Log.findOne({
        user: req.params._id
    }).populate('user') .populate('log', 'description duration date -_id').exec((err, data) => {
        
        if (err) return console.log(err);
        let log = data.log;

        if (req.query.from) log = log.filter(elem => elem.date > from);
        if (req.query.to) log = log.filter(elem => elem.date < to);
        if (req.query.limit) log = log.slice(0, req.query.limit); 

        if (data) res.json({
            username: data.user.username,
            count: data.count,
            _id: data.user._id,
            log: log.map(elem => ({
                description: elem.description,
                duration: elem.duration,
                date: elem.date.toDateString()
                })
            )
        });
    })
}) 

app.post("/api/users", (req, res) => {
    let newUser = new User({username: req.body.username});
    newUser.save((err, data) => {
        if (err) return console.log(err);
        res.json({
            username: data.username,
            _id: data._id
        })
    })
});

app.post("/api/users/:_id/exercises", (req, res) => {
    let newExercise = new Exercise({
        user: req.params._id,
        description: req.body.description,
        duration: req.body.duration,
        date: (req.body.date)? req.body.date: new Date()
    })
    newExercise.save((err, exercise) => {
        if(err) return console.log(err);
        
        Log.findOne({user: exercise.user}, (err, logData) => {
            if (err) return console.log(err);
            if (!logData) {
                let newLog = new Log({
                    user: exercise.user,
                    count: 1,
                    log: [exercise._id]
                })
                newLog.save((err, log) => {
                    if (err) return console.log(err);
                })
            }
            else {
                logData.count += 1;
                logData.log.push(exercise._id);
                logData.save((err, data) => {
                    if (err) return console.log(err);
                })
            }
        })

        Exercise.findOne({_id: exercise._id}).populate("user").exec((err, data) => {
            if (err) return console.log(err);
            if (data) res.json({
                username: data.user.username,
                description: data.description,
                duration: data.duration,
                date: data.date? data.date.toDateString() : undefined,
                _id: data.user._id
            })
        })
    })
})

// My code end here



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
