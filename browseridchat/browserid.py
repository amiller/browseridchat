"""
Andrew Miller <amiller@dappervision.com>

Use the browserid.org service to verify a user's email address.
"""
import urllib2
from xml.etree import cElementTree


def verifyAddress():
    pass


def resolvePublicKeysForAddress(address):
    # Query browserid.org for the key
    pubkeys = []
    try:
        finger = urllib2.urlopen('https://browserid.org/users/%s.xml' % address).read()
    except:
        pass
    doc = cElementTree.fromstring(finger)
    for elem in doc:
        if elem.tag.endswith('Link') and elem.attrib['rel'] == 'public-key':
                pubkeys.append(elem.attrib['value'])
    print pubkeys
