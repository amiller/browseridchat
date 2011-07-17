import argparse
import flask
from gevent.wsgi import WSGIServer

app = flask.Flask(__name__, static_path='/static')
app.debug=True


#@app.route('/static')
#def static(filename, **kwargs):
#    return flask.send_file('static/%s' % filename)


@app.route('/')
@app.route('/<session>')
def test(session=None, **kwargs):
    # Check session, redirect with new session if there isn't one
    return flask.render_template('index.html')


@app.route('/sendmessage')
def post_message():
    # Check the recipient
    # Check the user
    pass


@app.route('/receivemessages/<session>')
def check_messages(session):
    pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser('BrowserID Chat Server')
    parser.add_argument('--port', type=int, default=8231)
    ARGS = parser.parse_args()

    print 'Serving on port', ARGS.port
    app.run('0.0.0.0', ARGS.port)
    #http_server = WSGIServer(('', ARGS.port), app)
    #http_server.serve_forever()
