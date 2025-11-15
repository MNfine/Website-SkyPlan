from flask import Blueprint, request, jsonify
from threading import Lock
import time
import sys  

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
