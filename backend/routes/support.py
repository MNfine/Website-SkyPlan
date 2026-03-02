from flask import Blueprint, request, jsonify
from threading import Lock
import time
import sys
from backend.utils.email_service import send_support_ticket_email

support_bp = Blueprint('support', __name__)

# In-memory message store (simple). Each message: {id, sender, text, ts}
_messages = []
_lock = Lock()
_next_id = 1


def _now_ms():
    return int(time.time() * 1000)


@support_bp.route('/message', methods=['POST'])
def post_message():
    global _next_id
    data = request.get_json() or {}
    text = data.get('text')
    sender = data.get('sender') or 'user'

    if not text:
        return jsonify({'success': False, 'message': 'Missing text'}), 400


    with _lock:
        msg = {
            'id': _next_id,
            'sender': sender,
            'text': text,
            # ✅ luôn dùng giờ server, bỏ data.get('ts')
            'ts': _now_ms()
        }
        _messages.append(msg)
        _next_id += 1

    # Try to find the active Socket.IO instance in a robust way:
    # 1) Prefer the instance attached to the Flask app (current_app.extensions['socketio'])
    # 2) Fallback to sys.modules lookup for '__main__' or 'backend.app' (handles different start modes)
    try:
        from flask import current_app
        socketio = None
        try:
            socketio = current_app.extensions.get('socketio') if getattr(current_app, 'extensions', None) else None
        except Exception:
            socketio = None

        if not socketio:
            app_mod = sys.modules.get('backend.app') or sys.modules.get('__main__')
            socketio = getattr(app_mod, 'socketio', None) if app_mod is not None else None

        if socketio:
            try:
                print('[support] Broadcasting message via Socket.IO:', msg)
                socketio.emit('chat.message', msg)
                # Ensure eventlet/gevent context switch so emit is delivered immediately
                try:
                    socketio.sleep(0)
                except Exception:
                    pass
            except Exception as e:
                print('[support] Socket.IO emit error:', e)
        else:
            print('[support] No active Socket.IO instance found; skipping broadcast')
    except Exception as e:
        print('[support] Could not emit via Socket.IO:', e)

    return jsonify({'success': True, 'message': msg}), 201


@support_bp.route('/messages', methods=['GET'])
def get_messages():
    try:
        after = int(request.args.get('after', 0))
    except Exception:
        after = 0

    with _lock:
        results = [m for m in _messages if m['ts'] > after]

    return jsonify({'success': True, 'messages': results}), 200


@support_bp.route('/ticket', methods=['POST'])
def create_ticket():
    """Create a support ticket and send email notifications"""
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip()
        subject = data.get('subject', '').strip()
        message = data.get('message', '').strip()
        
        # Validate required fields
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        if not subject:
            return jsonify({
                'success': False,
                'message': 'Subject is required'
            }), 400
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Send email notifications
        email_sent = send_support_ticket_email(email, subject, message)
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Ticket created successfully. We will respond soon.'
            }), 201
        else:
            # Still return success but log warning
            return jsonify({
                'success': True,
                'message': 'Ticket created, but email notification failed. Please contact us directly.'
            }), 201
            
    except Exception as e:
        print(f"[Support] Error creating ticket: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error creating ticket: {str(e)}'
        }), 500
