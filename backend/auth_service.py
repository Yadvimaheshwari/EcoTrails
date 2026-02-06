"""
Authentication service
"""
import os
import secrets
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from backend.models import User
from backend.redis_client import redis_client

logger = logging.getLogger("EcoAtlas.Auth")

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN_DAYS", "7")) * 24 * 60 * 60  # 7 days in seconds
MAGIC_LINK_SECRET = os.getenv("MAGIC_LINK_SECRET", secrets.token_urlsafe(32))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"


def generate_token(user_id: str, email: str) -> str:
    """Generate JWT token"""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(seconds=JWT_EXPIRES_IN),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email using SMTP"""
    if not EMAIL_ENABLED:
        logger.info(f"Email disabled - would send to {to_email}: {subject}")
        return True
    
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured - email sending disabled (check logs for magic link)")
        return True  # Return True so magic link still works (logged to console)
    
    if not SMTP_FROM_EMAIL or SMTP_FROM_EMAIL == "":
        logger.warning("SMTP_FROM_EMAIL not configured - using SMTP_USER")
        from_email = SMTP_USER
    else:
        from_email = SMTP_FROM_EMAIL
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Magic link email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {e}")
        # Still return True so magic link works (logged to console for development)
        return True


def send_magic_link(email: str, db: Session) -> bool:
    """Send magic link email"""
    try:
        # Generate token
        token = secrets.token_urlsafe(32)
        expires_in = 86400  # 24 hours (increased for better UX)
        
        # Store in Redis (or in-memory fallback)
        redis_key = f"magic_link:{token}"
        if not redis_client.set(redis_key, email, ttl=expires_in):
            logger.error("Failed to store magic link token in Redis/memory")
            return False
        
        # Create magic link URL
        magic_link_url = f"{FRONTEND_URL}/auth/verify?token={token}"
        
        # Create email content
        subject = "Sign in to EcoAtlas"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5530;">Sign in to EcoAtlas</h2>
                <p>Click the link below to sign in to your EcoAtlas account:</p>
                <p style="margin: 30px 0;">
                    <a href="{magic_link_url}" 
                       style="background-color: #2c5530; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Sign In
                    </a>
                </p>
                <p style="font-size: 12px; color: #666;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{magic_link_url}" style="color: #2c5530; word-break: break-all;">
                        {magic_link_url}
                    </a>
                </p>
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    This link will expire in 24 hours. If you didn't request this link, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Send email (will return True even if email fails, as long as token is stored)
        email_sent = _send_email(email, subject, body)
        
        # Always log the magic link for development/debugging
        logger.info(f"Magic link generated for {email}: {magic_link_url}")
        
        # Return True if token was stored successfully (email is optional)
        return email_sent
    except Exception as e:
        logger.error(f"Error sending magic link: {e}", exc_info=True)
        return False


def verify_magic_link(token: str, db: Session) -> Optional[User]:
    """Verify magic link token and return/create user"""
    try:
        if not token:
            logger.warning("Empty token provided to verify_magic_link")
            return None
        
        redis_key = f"magic_link:{token}"
        email = redis_client.get(redis_key)
        
        if not email:
            logger.warning(f"Token not found in Redis: {token[:10]}... (may be expired or already used)")
            return None
        
        # Delete token (one-time use)
        redis_client.delete(redis_key)
        
        # Get or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            import uuid
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=email.split("@")[0]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user: {email}")
        else:
            logger.info(f"Verified existing user: {email}")
        
        return user
    except Exception as e:
        logger.error(f"Error verifying magic link: {e}", exc_info=True)
        return None


def create_or_get_user(email: str, name: Optional[str] = None, db: Session = None) -> Optional[User]:
    """Create or get user by email"""
    if not db:
        return None
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name or email.split("@")[0]
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user
