import os
from flask_socketio import SocketIO

socketio = SocketIO(
    cors_allowed_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,https://pydah-ai-versant.vercel.app').split(','), 
    async_mode='eventlet'
) 