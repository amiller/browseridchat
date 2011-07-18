import argparse
import flask
from gevent.wsgi import WSGIServer
import json
import chat
import browserid
import os
import urlparse

app = flask.Flask(__name__, static_path='/static')
#app.debug=True


# Generate the secret key if it hasn't been already
if chat.db.get('secretkey') is None:
    chat.db.set('secretkey', os.urandom(36))
app.secret_key = chat.db.get('secretkey')


@app.route('/')
def index(**kwargs):
    # Check session, redirect with new session if there isn't one
    return flask.render_template('index.html')


@app.route('/loginshim')
def loginshim(**kwargs):
    return flask.render_template('login.html')


@app.route('/login', methods=['POST'])
def login(**kwargs):
    # Verify the certificate. If so, return a session
    assertion = flask.request.form['assertion']
    session = flask.session
    try:
        email = browserid.verify_assertion(assertion, 'browseridchat.com')
    except ValueError, e:
        raise e

    session['email'] = email
    return email


@app.route('/publish', methods=['POST'])
def publish():
    # Check the session
    # If we're logged in then replace the pubkey for this email
    pubkey = flask.request.form['pubkey']
    email = flask.request.form['email']
    assert email == flask.session['email']
    chat.publish_pubkey(email, pubkey)
    return json.dumps(pubkey)


@app.route('/send/', methods=['POST'])
def post_message():
    # Check the recipient
    # Check the user
    #chat.post_message(recipient)
    return None


@app.route('/challenge', methods=['POST'])
def post_challenge():
    # Check the user
    sender = flask.session['email']
    recipient = flask.request.form['email']
    pubkey = flask.request.form['pubkey']
    assert pubkey == chat.get_pubkey(recipient)
    challenge = flask.request.form['challenge']
    chat.post_challenge(sender, recipient, pubkey, challenge)
    return 'OK'


@app.route('/challenges')
def get_challenges():
    recipient = flask.session['email']
    challenges = chat.get_challenges(recipient)
    return json.dumps(challenges)


@app.route('/pubkey/<email>')
def pubkey(email, **kwargs):
    try:
        return json.dumps(chat.get_pubkey(email))
    except Exception, e:
        flask.error = e
        flask.abort(404)


@app.route('/assertion', methods=['POST'])
def post_assertion():
    # There's not much to check about the assertion
    audience = urlparse.urlparse(flask.request.url).netloc
    assertion = flask.request.form['assertion']
    recipient = flask.request.form['recipient']
    email = browserid.verify_assertion(assertion, audience)
    chat.post_assertion(email, recipient, assertion)
    return assertion


@app.route('/backend')
def most_recent():
    pass


@app.route('/recv/<session>')
def check_messages(session):
    pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser('BrowserID Chat Server')
    parser.add_argument('--port', type=int, default=8231)
    ARGS = parser.parse_args()

    print 'Serving on port', ARGS.port
    #app.run('0.0.0.0', ARGS.port)
    http_server = WSGIServer(('', ARGS.port), app)
    http_server.serve_forever()
