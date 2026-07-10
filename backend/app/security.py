"""Hachage de mots de passe (scrypt, bibliothèque standard) et helpers d'auth."""
import base64
import hashlib
import hmac
import re
import secrets

_N, _R, _P = 2**14, 8, 1  # paramètres scrypt raisonnables

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=64)
    return "scrypt${}${}".format(
        base64.b64encode(salt).decode(),
        base64.b64encode(digest).decode(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_b64, digest_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=64)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email)) and len(email) <= 255
