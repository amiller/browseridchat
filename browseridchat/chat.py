"""
Andrew Miller <amiller@dappervision.com>

A simple message-box based chat service
"""
import redis
import time

messages = {}
sessions = {}


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


def post_message(recipient, ciphertext, sender=None):
    message = {
        'timestamp': time.time(),
        'ciphertext': time.time()
    }
    if sender is not None:
        message['sender'] = sender

    # FIXME we really need to store the message indexed by timestamp too
    messages.set_default(recipient, []).append(message)
