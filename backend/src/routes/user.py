from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import bcrypt
from src.extensions import db
from src.models.user import User
from src.models.log import Log
import logging

logger = logging.getLogger(__name__)

user_bp = Blueprint('user', __name__)

@user_bp.route('', methods=['GET'])
@jwt_required()
def get_user_info():
    """
    Get current user information
    ---
    tags:
      - User
    security:
      - Bearer: []
    responses:
      200:
        description: User information
      401:
        description: Unauthorized
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        logger.info(f"Retrieved info for user {user_id}")
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'created_at': user.created_at.isoformat(),
                'is_active': user.is_active,
                'file_count': len(user.files)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user info for {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user information'}), 500

@user_bp.route('/public_key', methods=['GET'])
@jwt_required()
def get_public_key():
    """
    Get user's RSA public key
    ---
    tags:
      - User
    security:
      - Bearer: []
    responses:
      200:
        description: Public key
      401:
        description: Unauthorized
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        logger.info(f"Retrieved public key for user {user_id}")
        
        return jsonify({
            'success': True,
            'public_key': user.rsa_public_key
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting public key for user {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve public key'}), 500

@user_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_user():
    """
    Update user information
    ---
    tags:
      - User
    security:
      - Bearer: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              email:
                type: string
              current_password:
                type: string
              new_password:
                type: string
    responses:
      200:
        description: User updated
      400:
        description: Validation error
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        updated = False
        
        # Update email if provided
        if 'email' in data and data['email']:
            new_email = data['email'].strip().lower()
            
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=new_email).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Email already in use'}), 400
            
            if '@' not in new_email:
                return jsonify({'error': 'Invalid email address'}), 400
            
            user.email = new_email
            updated = True
        
        # Update password if provided
        if 'new_password' in data and data['new_password']:
            if 'current_password' not in data or not data['current_password']:
                return jsonify({'error': 'Current password is required to change password'}), 400
            
            # Verify current password
            if not bcrypt.checkpw(data['current_password'].encode(), user.password_hash.encode()):
                return jsonify({'error': 'Current password is incorrect'}), 401
            
            new_password = data['new_password']
            if len(new_password) < 8:
                return jsonify({'error': 'New password must be at least 8 characters'}), 400
            
            # Hash new password
            user.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            updated = True
        
        if updated:
            db.session.commit()
            
            # Log update
            log_entry = Log(
                user_id=user_id,
                action='update_profile',
                details='Updated user profile',
                ip_address=request.remote_addr
            )
            db.session.add(log_entry)
            db.session.commit()
            
            logger.info(f"User {user_id} updated their profile")
            
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully'
            }), 200
        else:
            return jsonify({
                'success': True,
                'message': 'No changes made'
            }), 200
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

@user_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_user_activity():
    """
    Get user's recent activity logs
    ---
    tags:
      - User
    security:
      - Bearer: []
    parameters:
      - name: limit
        in: query
        type: integer
        description: Number of logs to return
    responses:
      200:
        description: Activity logs
      401:
        description: Unauthorized
    """
    user_id = get_jwt_identity()
    
    try:
        limit = request.args.get('limit', 50, type=int)
        if limit < 1 or limit > 100:
            limit = 50
        
        # Get user's recent activity logs
        logs = Log.query.filter_by(user_id=user_id)\
                       .order_by(Log.timestamp.desc())\
                       .limit(limit)\
                       .all()
        
        activity = []
        for log in logs:
            activity.append({
                'id': log.id,
                'action': log.action,
                'details': log.details,
                'timestamp': log.timestamp.isoformat(),
                'ip_address': log.ip_address
            })
        
        logger.info(f"Retrieved activity logs for user {user_id}")
        
        return jsonify({
            'success': True,
            'activity': activity,
            'count': len(activity)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting activity for user {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve activity logs'}), 500

@user_bp.route('/check_username/<username>', methods=['GET'])
def check_username(username):
    """
    Check if username is available
    ---
    tags:
      - User
    parameters:
      - name: username
        in: path
        required: true
        type: string
    responses:
      200:
        description: Username availability status
    """
    try:
        username = username.strip()
        
        if not username or len(username) < 3:
            return jsonify({
                'success': True,
                'available': False,
                'message': 'Username must be at least 3 characters'
            }), 200
        
        # Check if username exists
        user = User.query.filter_by(username=username).first()
        
        return jsonify({
            'success': True,
            'available': user is None,
            'message': 'Username is available' if user is None else 'Username already taken'
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking username {username}: {str(e)}")
        return jsonify({'error': 'Failed to check username'}), 500

@user_bp.route('/check_email/<email>', methods=['GET'])
def check_email(email):
    """
    Check if email is available
    ---
    tags:
      - User
    parameters:
      - name: email
        in: path
        required: true
        type: string
    responses:
      200:
        description: Email availability status
    """
    try:
        email = email.strip().lower()
        
        if not email or '@' not in email:
            return jsonify({
                'success': True,
                'available': False,
                'message': 'Invalid email address'
            }), 200
        
        # Check if email exists
        user = User.query.filter_by(email=email).first()
        
        return jsonify({
            'success': True,
            'available': user is None,
            'message': 'Email is available' if user is None else 'Email already registered'
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking email {email}: {str(e)}")
        return jsonify({'error': 'Failed to check email'}), 500