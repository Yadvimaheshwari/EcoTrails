"""
Social networking service for sharing hike experiences, discoveries, and plans
"""
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.models import SocialPost, PostComment, PostLike, User, Hike, Place

logger = logging.getLogger("EcoAtlas.Social")


def create_post(
    db: Session,
    user_id: str,
    content: str,
    post_type: str = "experience",
    hike_id: Optional[str] = None,
    place_id: Optional[str] = None,
    media_urls: Optional[List[str]] = None,
    location: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> SocialPost:
    """Create a new social post"""
    post = SocialPost(
        id=str(uuid.uuid4()),
        user_id=user_id,
        hike_id=hike_id,
        place_id=place_id,
        post_type=post_type,
        content=content,
        media_urls=media_urls or [],
        location=location,
        tags=tags or [],
        likes_count=0,
        comments_count=0,
        is_public=True,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    logger.info(f"Created social post {post.id} by user {user_id}")
    return post


def get_feed(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    post_type: Optional[str] = None,
    place_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get the community feed with enriched user/place data"""
    query = db.query(SocialPost).filter(SocialPost.is_public == True)

    if post_type:
        query = query.filter(SocialPost.post_type == post_type)
    if place_id:
        query = query.filter(SocialPost.place_id == place_id)

    posts = (
        query.order_by(desc(SocialPost.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for post in posts:
        user = db.query(User).filter(User.id == post.user_id).first()
        place = None
        if post.place_id:
            place = db.query(Place).filter(Place.id == post.place_id).first()
        hike = None
        if post.hike_id:
            hike = db.query(Hike).filter(Hike.id == post.hike_id).first()

        result.append(serialize_post(post, user, place, hike))

    return result


def get_user_posts(
    db: Session,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Get posts by a specific user"""
    posts = (
        db.query(SocialPost)
        .filter(SocialPost.user_id == user_id)
        .order_by(desc(SocialPost.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    user = db.query(User).filter(User.id == user_id).first()

    result = []
    for post in posts:
        place = None
        if post.place_id:
            place = db.query(Place).filter(Place.id == post.place_id).first()
        hike = None
        if post.hike_id:
            hike = db.query(Hike).filter(Hike.id == post.hike_id).first()
        result.append(serialize_post(post, user, place, hike))

    return result


def get_post(db: Session, post_id: str) -> Optional[Dict[str, Any]]:
    """Get a single post with full details"""
    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if not post:
        return None

    user = db.query(User).filter(User.id == post.user_id).first()
    place = None
    if post.place_id:
        place = db.query(Place).filter(Place.id == post.place_id).first()
    hike = None
    if post.hike_id:
        hike = db.query(Hike).filter(Hike.id == post.hike_id).first()

    data = serialize_post(post, user, place, hike)

    # Include comments
    comments = (
        db.query(PostComment)
        .filter(PostComment.post_id == post_id)
        .order_by(PostComment.created_at)
        .all()
    )
    data["comments"] = []
    for comment in comments:
        comment_user = db.query(User).filter(User.id == comment.user_id).first()
        data["comments"].append({
            "id": comment.id,
            "content": comment.content,
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
            "user": {
                "id": comment_user.id if comment_user else None,
                "name": comment_user.name if comment_user else "Unknown",
                "avatar_url": comment_user.avatar_url if comment_user else None,
            },
        })

    return data


def add_comment(
    db: Session,
    post_id: str,
    user_id: str,
    content: str,
) -> PostComment:
    """Add a comment to a post"""
    comment = PostComment(
        id=str(uuid.uuid4()),
        post_id=post_id,
        user_id=user_id,
        content=content,
    )
    db.add(comment)

    # Update comment count
    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if post:
        post.comments_count = (post.comments_count or 0) + 1

    db.commit()
    db.refresh(comment)
    return comment


def toggle_like(
    db: Session,
    post_id: str,
    user_id: str,
) -> Dict[str, Any]:
    """Toggle like on a post. Returns the new like state."""
    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == user_id)
        .first()
    )

    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if not post:
        return {"liked": False, "likes_count": 0}

    if existing:
        db.delete(existing)
        post.likes_count = max(0, (post.likes_count or 0) - 1)
        db.commit()
        return {"liked": False, "likes_count": post.likes_count}
    else:
        like = PostLike(
            id=str(uuid.uuid4()),
            post_id=post_id,
            user_id=user_id,
        )
        db.add(like)
        post.likes_count = (post.likes_count or 0) + 1
        db.commit()
        return {"liked": True, "likes_count": post.likes_count}


def check_liked(db: Session, post_id: str, user_id: str) -> bool:
    """Check if a user has liked a post"""
    return (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == user_id)
        .first()
        is not None
    )


def delete_post(db: Session, post_id: str, user_id: str) -> bool:
    """Delete a post (only by the author)"""
    post = (
        db.query(SocialPost)
        .filter(SocialPost.id == post_id, SocialPost.user_id == user_id)
        .first()
    )
    if not post:
        return False

    db.delete(post)
    db.commit()
    return True


def serialize_post(
    post: SocialPost,
    user: Optional[User],
    place: Optional[Place],
    hike: Optional[Hike],
) -> Dict[str, Any]:
    """Serialize a post with associated data"""
    return {
        "id": post.id,
        "post_type": post.post_type,
        "content": post.content,
        "media_urls": post.media_urls or [],
        "location": post.location,
        "tags": post.tags or [],
        "likes_count": post.likes_count or 0,
        "comments_count": post.comments_count or 0,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "user": {
            "id": user.id if user else None,
            "name": user.name if user else "Unknown Hiker",
            "avatar_url": user.avatar_url if user else None,
        },
        "place": {
            "id": place.id,
            "name": place.name,
            "place_type": place.place_type,
        } if place else None,
        "hike": {
            "id": hike.id,
            "distance_miles": hike.distance_miles,
            "duration_minutes": hike.duration_minutes,
            "elevation_gain_feet": hike.elevation_gain_feet,
            "status": hike.status,
        } if hike else None,
    }
