"""
Andrew Miller <amiller@dappervision.com>

A simple message-box based chat service
"""
import redis
import time
import os
import random
import string
import json

messages = {}
sessions = {}
assertions = {}

db = redis.Redis(port=8324)


def get_messages(recipient, after_time=None, include_anonymous=True,
                 sender=None):
    """
    Args:
        recipient: the email address of the recipient
        after_time: only send new messages after this timestamp
        include_anonymous: include anonymous as well as signed-sender messages
        sender: only include messages from a sender matching this wildcard
                string
    """
    # TODO implement the timestamp query as a range search in redis
    return messages[recipient]


def get_challenges(recipient):
    keys = db.keys('challenge:%s:*' % recipient)
    if not keys: return []
    challenges = [json.loads(_) for _ in db.mget(keys)]
    return challenges


def post_assertion(sender, recipient, assertion):
    db.set('assertion:%s:%s', assertion)


def post_challenge(sender, recipient, pubkey, challenge):
    db.set('challenge:%s:%s' % (recipient, sender),
           json.dumps((sender, recipient, pubkey, challenge)))


def post_message(recipient, ciphertext, sender=None):
    message = {
        'timestamp': time.time(),
        'ciphertext': time.time(),
        }
    if sender is not None:
        message['sender'] = sender

    # FIXME we really need to store the message indexed by timestamp too
    db.rpush('messages:%s:%s' % (recipient, sender), message)
    db.rtrim('mesagess:%s:%s' % (recipient, sender), 20)


def create_session():
    # FIXME create a random session string
    return 'asdfsadf'


def publish_pubkey(email, pubkey):
    db.set('pubkey:%s' % email, pubkey)
    return pubkey


def get_pubkey(email):
    pubkey = db.get('pubkey:%s' % email)
    if pubkey is None:
        raise ValueError('No pubkey listed for [%s]' % email)
    return pubkey
