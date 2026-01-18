# from app import create_app
# app = create_app()
# if __name__ == '__main__':
#     app.run(debug = True, port = 5001)

from app import create_app, socketio

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5222)
 #   socketio.run(app, debug=True, host='localhost', port=5001)
