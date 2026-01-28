from flask_socketio import emit, join_room, leave_room
from flask import session, flash
from ..app import socketio
import mysql.connector
from datetime import datetime

# Database connection
mycon_obj = mysql.connector.connect(host='localhost', user='root', password='admin123', database='message_system')

#mycon_obj = mysql.connector.connect( host="sql12.freesqldatabase.com", user="sql12805427", password="xtFCQmMibE", database="sql12805427")
cursor_socket = mycon_obj.cursor(dictionary=True)

@socketio.on('connect')
def handle_connect():
    username = session.get('user')
    if username:
        join_room(username)
        print(f'✓ {username} connected and joined room: {username}')

@socketio.on('send_message')
def handle_send_message(data):
    from_user = session.get('user')
    to_user = data['recipient_id']  # This is the recipient username
    message = data['message']
    now = datetime.now()
    
    print(f'\n📨 Message from {from_user} to {to_user}')
    
    # Save to database
    sendData_query = '''
        INSERT INTO message_list (`from_user`, `to_user`, `message`, `date`, `time`) 
        VALUES (%s, %s, %s, %s, %s)
    '''
    
    try:
        cursor_socket.execute(sendData_query, (from_user, to_user, message, now.date(), now.time()))
        mycon_obj.commit()
        print(f'✓ Message saved to database')
    except Exception as e:
        print(f'✗ Database error: {e}')
        mycon_obj.rollback()
        return
    
    # FIX: Correct date format (%m for month, %d for day)
    message_data = {
        'from_user': from_user,
        'to_user': to_user,
        'message': message,
        'date': now.strftime('%Y-%m-%d'),  # ✅ Fixed: %m-%d instead of %M-%D
        'time': now.strftime('%H:%M:%S')
    }
    
    # Emit to recipient in real-time (room = recipient's username)
    print(f'📤 Emitting to room: {to_user}')
    emit('receive_message', message_data, room=to_user)
    print(f'✓ Emitted receive_message to {to_user}')
    
    # Also emit back to sender for confirmation
    emit('message_sent', message_data)
    print(f'✓ Emitted message_sent to sender\n')

@socketio.on('disconnect')
def handle_disconnect():
    username = session.get('from_user')
    if username:
        leave_room(username)
        print(f'✓ {username} disconnected and left room: {username}')
