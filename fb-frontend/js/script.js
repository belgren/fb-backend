$('#feed_form').hide();
$('#login_form').hide();
$('#logout-button-form').hide();
//need to add buttons/functionality for deleting end editing posts and number of posts per page.  Also format feed

// $('#registration_form').hide();
// getPosts('belgren28@gmail.com', 'password');
// var _email='belgren28@gmail.com';
// var _password = 'password';


$('#registration_form #reg-btn').on('click', function(){
  var _fname = $('.first-name').val();
  var _lname = $('.last-name').val();
  var _email = $('.email').val();
  var _password = $('.password').val();
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/user/register',{
    success: switchFormsLog(),
    method: 'POST',
    data: {
      fname : _fname,
      lname : _lname,
      email : _email,
      password : _password
    },
    error: function(err){
      alert('One or more invalid fields entered ', err);
    }
  });
});

//from registration form, move to login form if login button is clicked
$('#registration_form #log-btn').on('click', function(){
  switchFormsLog();
})


$('#login_form #log-btn').on('click', function(){
  _email = $('#login_form .email').val();
  _password = $('#login_form .password').val();
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/user/login', {
    method: 'POST',
    success: function(data){
      localStorage.setItem('token', data.response.token);
      getPosts(_email, _password);
      setInterval(function(){getPosts(_email, _password)}, 30000);
      switchFormsFeed();
    },
    data: {
      email: _email,
      password: _password
    },
  })
})

//switch back to register page with button in login form
$('#login_form #reg-btn').on('click', function(e){
  switchFormsReg();
})

function getPosts(_email, _password){
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/posts/1', {
    method: 'GET',
    success: function(data) {
      console.log(data);
      $('.posts').empty();
      for (var i=data.length-1; i>=0; i--){
        $('.posts').append(createPost(data[i]))
        $('.posts').append(addComments(data[i]))
      }
    },
    data: {
      token: localStorage.getItem('token')
    }
  })
}


function createPost(data){
  var numLikes = data.likes.length;
  var comments = data.comments;
  var numComments = comments.length;
  var _id = data['_id'];
  var elem = `<div class="post" id=${_id}>
                <p class="author">${data.poster.fname} ${data.poster.lname}</p>
                <p class="date">${data.createdAt}</p>
                <p class="message">${data.content}</p>
                <div class="likes">${numLikes} Likes</div>
                <div class="replies">${numComments} Replies</div>
                <br>
                <button type="button" class="like btn btn-primary">Like</button>
                <button type="button" class="reply btn btn-info">Reply</button>
                <!-- <button type="button" id="delete-comment" class="delete btn btn-danger">Delete Post</button> -->
                <br><br>
                Comments:
              </div>
              `
  return elem;
}

function addComments(data){
  var comments = data.comments;
  var numComments = comments.length;
  var elem = "";
  for (var i=0; i<comments.length; i++){
    var commentText = comments[i]['content'];
    var commentTime = comments[i]['createdAt'];
    var date = new Date(commentTime);
    var author = comments[i]['poster']['name']
    var newComment = `<div class="comment">
                        <p class="author"> ${author} </p>
                        <p class="date"> ${date} </p>
                        <p class="commentText">${commentText} </p>
                      </div>
                  `
    elem+=newComment;
  }
  return elem;
}

$('.post #delete-comment').on('click', function(e){
  alert('clicked');
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/posts/:post_id/'+_id, {
    method: 'GET',
    success: function(data){
              getPosts(_email, _password)},
    data: {
      token: localStorage.getItem('token')
    },
    error: function(err){
      console.log(err);
    }
  })
})

//like button
$('body').on('click', '.like', function(event){
  event.preventDefault();
  var elem = $(this).parent().children('.likes');
  var likes = parseInt(elem.text().substring(0,1));
  var _id = $(this).parent().attr('id');
  elem.text(likes + " Likes");
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/posts/likes/'+_id, {
    method: 'GET',
    success: function(data){
              getPosts(_email, _password)},
    data: {
      token: localStorage.getItem('token')
    },
    error: function(err){
      console.log(err);
    }
  })
})

$('body').on('click', '#post-button', function(event){
  event.preventDefault();
  var elem = $(this).siblings("#postapost");
  var _content = elem.val();
  console.log(localStorage.getItem('token'));
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/posts',{
    method: 'POST',
    data: {
      token: localStorage.getItem('token'),
      content: _content
    },
    success: function(data){elem.val("");
              getPosts(_email, _password)
          }
  })
})

$('.posts').on('click', '#post-reply-button', function(event){
  var _id = $(this).closest('.post').attr('id');
  var _content = $(this).siblings('#reply-text-box').val();
  console.log("in frontend, token: ",localStorage.getItem('token'))

  $.ajax('https://radiant-shore-89538.herokuapp.com/api/posts/comments/'+_id, {
    method: 'POST',
    data: {
      token: localStorage.getItem('token'),
      content: _content
    },
    success: function(data){
      getPosts(_email, _password);
    },
    error: function(err){
      console.log(err);
    }
  })
})

$('.posts').on('click', '.reply', function(event){
  var post = $(this).parent();
  var commentBox = `<div class="comment-box">
                      <textarea class="form-control" id="reply-text-box" rows="3" placeholder="Say something..."></textarea>
                      <button type="button" id="post-reply-button" class="btn btn-primary">Post Reply</button>
                    </div>`
  post.append(commentBox);
})


$('#logout-button').on('click', function(){
  console.log('clicked logout btn');
  $.ajax('https://radiant-shore-89538.herokuapp.com/api/user/logout', {
    method: 'GET',
    data: {
      token: localStorage.getItem('token')
    },

    success: function(data){
              $('#feed_form').hide();
              $('#login_form').show();
              $('#logout-button-form').hide();
              $('#registration_form').hide();
              _email = "";
              _password = "";
    },
    error: function(err){
      console.log(err);
    }
  })
})

function switchFormsLog(){
  $('#registration_form').hide();
  $('#login_form').show();
}

function switchFormsFeed(){
  $('#login_form').hide();
  $('#feed_form').show();
  $('#logout-button-form').show();

}

function switchFormsReg(){
  $('#registration_form').show();
  $('#login_form').hide();
}
