"use strict";
var express = require('express');
var exphbs  = require('express-handlebars');
var router = express.Router();
var bodyParser = require('body-parser');
var Token = require('./models').Token;
var User = require('./models').User;
var Post = require('./models').Post;

// Initialize Express
var app = express();

// mongoose configuration
var mongoose = require('mongoose');


if (! process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not in the environmental variables. Run 'source env.sh'");
}
mongoose.connection.on('connected', function() {
  // console.log('Success: connected to MongoDb!');
});
mongoose.connection.on('error', function() {
  console.log('Error connecting to MongoDb. Check MONGODB_URI in env.sh');
  process.exit(1);
});
mongoose.connect(process.env.MONGODB_URI);

// Handlabars setup
app.engine('.hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
app.set('view engine', '.hbs');
app.set('views', '../fb-frontend')
// Parse req.body contents
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

///////body////////
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});
app.get('/', function(req, res){
  res.render('')
})

app.post('/api/user/register', function(req, res){
  // var fname = req.body.fname;
  // var lname = req.body.lname;
  // var email = req.body.email;
  // var password = req.body.password;
  console.log('here in backend')
  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email;
  var password = req.body.password;
  var newUser = new User({
    fname: fname,
    lname: lname,
    email: email,
    password: password
  })
  newUser.save(function(err){
    if (err){
      console.log(err);
    }
    else {
      console.log('Successfully saved new user');
    }
  })
  res.status(200).json({success: true});
})


app.post('/api/user/login', function(req, res){
  console.log('in login');
  var email = req.body.email;
  var password = req.body.password;
  var token = email + new Date();
  var userId;
  User.findOne({email: email}, function(err, user){
    if (err){
      res.status(301).json({"error": "Login failed."});
      return;
    }
    if (user==null){
      res.status(400).send('invalid user id');
      return;
    }
    userId = user._id;

    var newToken = new Token({
      userId: userId,
      token: token,
      createdAt: new Date()
    })

    newToken.save(function(err){
      if (err){
        console.log(err);
      }
      else{
        console.log('succesfully saved token to database')
      }
    });
    res.status(200).json({
      success: true,
      response: {
        id: userId,
        token: token
      }
    });
  });
})


app.get('/api/user/logout', function(req, res){
  var token = req.query.token;
  Token.remove({token: token}, function(err){
    if (err){
      console.log("unable to delete token");
      return;
    }
    console.log("successfully deleted Token");
    res.status(200).json({
      "success": true,
    })
  })
})


//get a post
app.get('/api/posts/:page?', function(req, res){
  var pageNumber = 1;
  if (req.params.page){
    pageNumber = req.params.page;
  };
  var token = req.query.token;
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    }
    //token has been validated
    var posts = [];
    Post.find({}).sort('createdAt').exec(function(err, postArr){
      if (err){
        res.status(500).json({ "error": "failed to query posts." });
        return;
      }
      //found posts
      res.status(200).json(postArr.slice(0,pageNumber*10));
    })
  });
})

//post a post
app.post('/api/posts', function(req, res){
  var token = req.body.token;
  var content = req.body.content;
  var date = new Date();
  console.log('In post a post in fb backend. token: ', token, 'content', content);
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    }
    //authenticated token
    User.findOne({_id: token.userId}, function(err, user){
      if (err){
        console.log("unable to find user");
        return;
      }
      if (user==null){
        res.status(400).send('invalid user id');
        return;
      }
      ///found user
      var newPost = new Post({
        poster: user,
        content: content,
        likes: [],
        comments: [],
        createdAt: date
      })
      newPost.save(function(err, result){
        if (err) {
          console.log("ERRORR", err)
          res.status(500).send("Failed to save Project");
        }
        else {
          res.status(200).json({
            success: true,
            response: {
              poster: {
                name: user.fname,
                id: user._id
              },
              content: content,
              createdAt: date,
              _id: result._id,
              comments: [],
              likes: []
            }
          })}
        })
      })
    })
  })

  //get comment
app.get('/api/posts/comments/:post_id', function(req, res){
  var token = req.query.token;
  var postId = req.params.post_id;
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    }
    //authenticated token
    //find the post
    Post.findOne({_id: postId},
      function(err, post){
      if (err){
        res.status(400).send("invalid post id");
        return;
      }
      if (post==null){
        res.status(400).send('invalid post id');
        return;
      }
      //found the post
      res.status(200).send({
        "success": true,
        "response": [
          post.comments
        ]
      })
    });
  });
});


// // post comment
app.post('/api/posts/comments/:post_id', function(req, res){
  var postId = req.params.post_id;
  var token = req.query.token;
  var content = req.body.content;
  console.log('in backend, postId: ', postId, " token: ", token, " content: ", content);
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    }
    //authenticated Token
    //find user
    User.findOne({_id: token.userId}, function(err, user){
      if (err){
        res.status(500).send("failed to find user");
        return;
      }
      if (user==null){
        res.status(400).send('invalid user id');
        return;
      }
      //find post
      Post.findOne({_id: postId},
        function(err, post){
        if (err){
          res.status(400).send("invalid post id");
          return;
        }
        if (post==null){
          res.status(400).send('invalid post id');
          return;
        }
        var comment = {
          "createdAt": new Date(),
          "content": content,
          "poster": {
            "name": user.fname,
            "id": user._id
          }
        };
        post.comments.push(comment);
        post.save(function(err){
          if (err){
            res.status(400).send('error updating comments');
            return;
          }
          res.status(200).json({
            "success": true,
            "response": {
              "_id": post._id,
              "poster": {
                "id": post.userId,
                "name": post.fname
              },
              "content": post.content,
              "createdAt": post.createdAt,
              "comments": [
                comment
              ],
              "likes": post.likes
            }
          });
        })
      });
    });
  });
})

app.get('/api/posts/likes/:post_id', function(req, res){
  var token = req.query.token;
  var postId = req.params.post_id;
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    }
    //authenticated token
    User.findOne({_id: token.userId}, function(err, user){
      if (err){
        res.status(500).send("failed to find user");
        return;
      }
      if (user==null){
        res.status(400).send('invalid user id');
        return;
      }
      //find post
      Post.findOne({_id: postId},
        function(err, post){
        if (err){
          res.status(400).send("invalid post id");
          return;
        }
        if (post==null){
          res.status(400).send('invalid post id');
          return;
        }
        var likes = post.likes;
        var likesIndex;
        for (var i=0; i<likes.length; i++){
          if (String(likes[i].id) == user._id){
            likesIndex=i;
          }
        }
        //unlike
        if (i){
          post.likes.splice(likesIndex, 1);
        }
        //like
        else{
          post.likes.push({
            'name': user.fname,
            'id': user._id
          });
        };
        post.save(function(err){
          if (err){
            res.status(500).send("unable to save data");
            return;
          }
        });
        res.status(200).json({
          "success": true,
          "response": {
            "_id": post._id,
            "poster": post.poster,
            "content": post.content,
            "createdAt": post.createdAt,
            "comments": post.comments,
            "likes": post.likes
          }
        })
      });
    });
  });
});

app.delete('/api/posts/:post_id', function(req, res){
  var token = req.query.token;
  var postId = req.params.post_id;
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    };
    //validated Token
    //find post
    Post.findOne({_id: postId},
      function(err, post){
      if (err){
        res.status(500).send("unable to locate post");
        return;
      }
      if (post==null){
        res.status(400).send('invalid post id');
        return;
      }
      //check if user owns the post they are trying to delete
      if (token.userId == post.poster._id){
        Post.deleteOne({_id: postId}, function(err){
          res.status(200).send('successfully deleted post');
          return;
        });
      }
      else{
        res.status(400).send('user cannot delete posts by other users');
        return;
      };
    });
  });
})

app.put('/api/posts/:post_id', function(req, res){
  var token = req.query.token;
  var postId = req.params.post_id;
  var new_content = req.query.content;
  Token.findOne({token: token}, function(err, token){
    if (err){
      console.log("Unable to authenticate token");
      return;
    }
    else if (token==null){
      res.status(500).send("Token cannot be verified");
      return;
    };
    //validated Token
    //find post
    Post.findOne({_id: postId},
      function(err, post){
      if (err){
        res.status(500).send("unable to locate post");
        return;
      }
      if (post==null){
        res.status(400).send('invalid post id');
        return;
      }
      //check if user owns the post they are trying to update
      if (token.userId == post.poster._id){
        //update post
        post.content = new_content;
        post.save(function(err){
          if (err){
            res.status(400).send('error saving post');
            return;
          }
          res.status(200).send('successfully updated post');
          return;
        })
      }
      else{
        res.status(400).send('user cannot edit posts by other users');
        return;
      };
    });
  });
})



console.log('Express started. Listening on port', process.env.PORT || 3000);
app.listen(process.env.PORT || 3000);
