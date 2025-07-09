from flask_socketio import SocketIO
 
# This instance will be initialized with the Flask app in main_with_socketio.py
socketio = SocketIO(cors_allowed_origins="*") 