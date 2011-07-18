"""
Andrew Miller <amiller@dappervision.com>

Use the browserid.org service to verify a user's email address.
"""
from urllib2 import urlopen
from urllib import quote_plus
from xml.etree import cElementTree
import json


def verify_assertion(assertion, audience):
    # Check the assertion on browserid.org, parsing out the email address
    url = 'https://browserid.org/verify?assertion=%s&audience=%s' % (
        quote_plus(assertion), audience)
    http_resp = urlopen(url)
    resp = json.loads(http_resp.read())

    if resp['status'] == 'okay':
        email = resp['email']
        return email
    else:
        raise ValueError('Authentication Failed: %s' % str(resp))


def resolvePublicKeysForAddress(address):
    # Query browserid.org for the key
    pubkeys = []
    try:
        finger = urlopen('https://browserid.org/users/%s.xml' % address).read()
    except:
        pass
    doc = cElementTree.fromstring(finger)
    for elem in doc:
        if elem.tag.endswith('Link') and elem.attrib['rel'] == 'public-key':
                pubkeys.append(elem.attrib['value'])
    print pubkeys
