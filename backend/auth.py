"""
Supabase JWT Authentication for Flask.
Verifies JWT tokens issued by Supabase Auth.
"""
import os
import jwt
from functools import wraps, lru_cache
from flask import request, jsonify

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


def _get_token_from_header():
    """Extract JWT token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token and return the decoded payload.
    Raises jwt.exceptions.PyJWTError on invalid token.
    """
    if not SUPABASE_JWT_SECRET:
        raise ValueError("SUPABASE_JWT_SECRET not configured")
    
    # Decode and verify the token
    payload = jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )
    return payload


def get_current_user():
    """
    Get the current authenticated user from the request.
    Returns None if not authenticated.
    """
    token = _get_token_from_header()
    if not token:
        return None
    
    try:
        payload = verify_supabase_token(token)
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
        }
    except (jwt.exceptions.PyJWTError, ValueError):
        return None


def require_auth(f):
    """
    Decorator to require authentication on a route.
    Returns 401 if not authenticated.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = _get_token_from_header()
        
        if not token:
            return jsonify({"error": "Missing authorization token"}), 401
        
        try:
            payload = verify_supabase_token(token)
            # Store user info in request context
            request.current_user = {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role"),
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        except ValueError as e:
            return jsonify({"error": str(e)}), 500
        
        return f(*args, **kwargs)
    
    return decorated_function
