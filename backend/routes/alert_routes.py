from flask_login import login_required, current_user
from backend.database.models import UserRole, Alert, AlertType
from backend.services.alert_service import AlertService
from backend.utils import ResponseBuilder
import logging
from flask import Blueprint, request

logger = logging.getLogger(__name__)
bp = Blueprint('alerts', __name__)

alert_service = AlertService()

@bp.route('/api/alerts', methods=['GET'])
@login_required
def get_alerts():
    """Get alerts for current user or all alerts for admin"""
    try:
        # Parse query parameters
        unread_only = request.args.get('unread', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 50))
        
        # For admins, can get alerts for all users or specific user
        if current_user.role == UserRole.ADMIN.value:
            user_id = request.args.get('user_id')
            # If no user_id specified, get all alerts
            alerts = alert_service.get_alerts(
                user_id=user_id,
                unread_only=unread_only,
                limit=limit
            )
        else:
            # Regular users only get their alerts
            alerts = alert_service.get_alerts(
                user_id=current_user.id,
                unread_only=unread_only,
                limit=limit
            )
        
        # Format alerts for response
        alerts_data = []
        for alert in alerts:
            alerts_data.append({
                'id': alert.id,
                'timestamp': alert.timestamp.isoformat(),
                'type': alert.type,
                'title': alert.title,
                'message': alert.message,
                'source': alert.source,
                'source_id': alert.source_id,
                'is_read': alert.is_read,
                'user_id': alert.user_id
            })
        
        return ResponseBuilder.success({
            'alerts': alerts_data,
            'count': len(alerts_data)
        })
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/alerts/<alert_id>/read', methods=['POST'])
@login_required
def mark_alert_as_read(alert_id):
    """Mark an alert as read"""
    try:
        # Verify alert exists and user has access
        alert = Alert.query.get(alert_id)
        if not alert:
            return ResponseBuilder.error("Alert not found", 404)
            
        # Check permissions
        if alert.user_id and alert.user_id != current_user.id and current_user.role != UserRole.ADMIN.value:
            return ResponseBuilder.error("Access denied", 403)
            
        # Mark as read
        success = alert_service.mark_as_read(alert_id)
        
        if success:
            return ResponseBuilder.success(message="Alert marked as read")
        else:
            return ResponseBuilder.error("Failed to mark alert as read", 500)
            
    except Exception as e:
        logger.error(f"Error marking alert as read: {str(e)}")
        return ResponseBuilder.error(str(e), 500)