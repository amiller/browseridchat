function setSessions(val) {
  if (navigator.id) {
    navigator.id.sessions = val ? val : [ ];
  }
} 

function loggedIn(email) {
    setSessions([ { email: email } ]);
    $('div#login_local_output').html('window.sessionStorage.email: ' + window.sessionStorage.email)
    check_local_keypair()
}

function logout() {
    // Dispose of the session storage and the cookies
    window.sessionStorage.clear()
    var d = new Date();
    document.cookie = "v0=1;expires=" + d.toGMTString() + ";" + ";";
}

function gotVerifiedEmail(assertion) {
    if (assertion) {
	$.ajax({
	    url: '/login',
	    type: 'post',
	    data: {'assertion': assertion},
	    success: function(email, textStatus, jqXHR) {
		$("#header .login").removeClass('clickable').hide()
		window.sessionStorage.email = email
		$('div#login_webapp_output').html('browserIDChat.com/login: OK. Logged in as: '+email)
		loggedIn(email);
	    },
	    error: function(jqXHR, textStatus, errorThrown) {
		$("#header .login").css('opacity', '1');
	    }
	});
    } else {
	// something went wrong!  the user isn't logged in.
	$("#header .login").css('opacity', '1');
    }
}

function register_iframe(token, recipient) {
    var frame = $('<iframe style="display:none" id="loginframe"/>')
    frame.attr('src', 'http://'+token+'.pubkey.browseridchat.com/loginshim')
    frame.appendTo('body').load(function () {
	var chan = Channel.build({
	    window: document.getElementById('loginframe').contentWindow,
	    origin: "*",
	    scope: "browseridchat"
	})
	$("#partnersign .login").show().click(function() {
	    $("#partnersign .login").css('opacity', '0.5');
	    chan.call({
		method: "getVerifiedEmail",
		params: recipient,
		success: function (assertion) {
		    window.sessionStorage.assertion = assertion
		    console.info('sent assertion')
		    // We're logged in! Wow!
		    $('#partnersign .login').hide()
		    $('#partnersign').append("Logged in. Your partner should be well convinced of your identity")
		}
	    })
	}).addClass("clickable");
    })
}

function sign_in(success) {
    navigator.id.getVerifiedEmail(function(assertion) {
	$.ajax({
	    url: '/login',
	    success: 0
	})
    })
}

function generate_keypair() {
    // Generate an RSA keypair
    var key = new RSAKey();
    key.generate(512, "10001");

    var keypair = {'pub': key.serializePublicASN1(),
		   'priv': key.serializePrivateASN1()};

    // Store the keypair in local storage
    var email = window.sessionStorage.email;
    var emails = get_local_emails()
    emails[email] = keypair;
    window.localStorage.emails = JSON.stringify(emails)
    console.info('hi' + window.localStorage.emails)
    publish_pubkey()
    check_local_keypair()
}

function publish_pubkey() {
    // Publish the email address
    // We'll need to check cookie to see if signed in
    var email = window.sessionStorage.email;
    var pubkey = get_local_emails()[email].pub;
    $.ajax({
	url:'/publish',
	type:'post',
	data: {'pubkey': pubkey, 'email': email},
	success: function () { check_remote_pubkey() },
	error: function (e) { console.error(e) }
    })
}

function query_remote_pubkey(email, success, error) {
    $.ajax({
	url: '/pubkey/'+window.encodeURI(email),
	dataType: 'json',
	success: success,
	error: error
    })
}

function challenge_partner() {
    function makeid(n)
    {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for( var i=0; i < n; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
    }
 
    var partner = JSON.parse(window.sessionStorage.partner)
    var randomToken = makeid(16);
    var key = new RSAKey()
    key.readPublicKeyFromPEMString(partner.pubkey)
    var challenge = key.encrypt(randomToken)
    $('.partner_challenge_token').html(randomToken)
    $('.partner_challenge_enc').html(challenge)

    $.ajax({
	url: '/challenge',
	type: 'post',
	data: {'pubkey': partner.pubkey, 
	       'challenge': challenge,
	       'email': partner.email},
	success: function (result) {
	    // now we wait
	},
	error: function (e) {
	    console.error(e)
	}
    })
}

function lookup_partner_pubkey(email) {
    query_remote_pubkey(
	email, 
	function(pubkey) {
	    $('#partner_pubkey_output').html(pubkey)
	    window.sessionStorage.partner = JSON.stringify({'pubkey': pubkey, 'email': email})
	    challenge_partner()
	},
	function (err) {
	    console.error(err)
	    $('#partner_pubkey_output').html(err)
	}
    )
}

function check_remote_pubkey() {
    // Query the browseridchat.com server for the pubkey
    var email = window.sessionStorage.email
    var output = $('#remote_pubkey')
    var local_pubkey = get_local_emails()[email].pub
    output.html('Checking...')
    $('a#pubkey_link').attr('href', 'http://browseridchat.com/pubkey/'+window.encodeURI(email))
    query_remote_pubkey(email,
	function (pubkey) {
	    output.empty()
	    if (pubkey == local_pubkey) {
		output.append('<div class="role-webapp pubkey">' + pubkey.slice(0,256)+"</div>")
	    } else {
		output.append('pubkey mismatch')
		output.append('<input type="button" value="Publish" onclick="publish_pubkey()"/>')
	    }
	},
	function (jq, err) {
	    output.empty()
	    output.append(err)
	    output.append(jq)
	})
}

function get_local_emails() {
    try {
	emails = JSON.parse(window.localStorage.emails)
	if (typeof emails !== 'object') throw "emails blob bogus!";
    } catch(e) {
	console.error(e)
	window.localStorage.emails = JSON.stringify({})
    }
    return JSON.parse(window.localStorage.emails)
}


function get_challenges() {
    var email = window.sessionStorage.email
    $.ajax({
	url: '/challenges',
	dataType: 'json',
	success: function (challenges) {
	    if (challenges) {
		
		var sender = challenges[0][0];
		var recipient = challenges[0][1];
		var pubkey = challenges[0][2];
		var challenge = challenges[0][3];

		console.info(challenge)
		// Encrypt the challenge
		$('#challenge_cipher').html(challenge)

		// Decrypt the challenge
		var keypair = get_local_emails()[window.sessionStorage.email]

		// Assert pubkey matches
		if (pubkey != keypair.pub) {
		    throw 'pubkey doesn\'t match'
		}

		var key = new RSAKey()
		key.readPrivateKeyFromPEMString(keypair.priv)
		key.readPublicKeyFromPEMString(keypair.pub)


		var token = key.decrypt(challenge)
		register_iframe(token, recipient)

		$('.challenge_plain').html(token)
		$('.challenge_email').html(recipient)

	    } else {
		$('#challenge_cipher').html('No one wants to talk to you yet')
	    }
	},
	error: function (e) {
	    console.error(e)
	}
    })
}


function check_local_keypair() {
    // Check local storage. Do we have the keys?
    var output = $('#local_keypair')
    var email=null, pubkey, privkey
    var emails = get_local_emails()

    try {
	output.empty()	
	for (var k in emails) {
	    // Just grab the first one. Make sure to clobber them on write
	    // TODO select between available identities
	    if (email === null) {
		email = k;
		pubkey = emails[email].pub
		privkey = emails[email].priv
	    }
	    output.append("<div>"+k+' Pubkey: <div class="pubkey">'+
			  emails[k].pub.slice(0,256)+"</div>Private key: [omitted]</div>");
	}
	if (email === null) {
	    throw 'no emails';
	}

	check_remote_pubkey()

    } catch(e) {
	output.empty()
	output.append('No local keys found! Please create one')
	$('#remote_pubkey').empty()
	window.localStorage.emails = JSON.stringify({})
    }
}


$(document).ready(function() {
    // Step 0. Sign in
    var email = window.sessionStorage.email;
    if (!email) {
	// Don't have a session. Need to sign in
	$('#header .login').show().click(function () {
	    navigator.id.getVerifiedEmail(gotVerifiedEmail)
	})
	return
    } else {
	loggedIn(email);
    }
   
    // Step 1. Get local and then remote keys
    check_local_keypair()

    // Everything else is done through callbacks i suppose
    get_challenges()
});

setSessions();
