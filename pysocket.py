# import socketio
# import mysql.connector

# sio = socketio.Server()
# app = socketio.WSGIApp(sio)

# con1 = mysql.connector.connect(
#     host="localhost",
#     user="yourusername",
#     password="yourpassword",
#     database="yourdatabase"
# )

# con2 = mysql.connector.connect(
#     host="localhost",
#     user="yourusername",
#     password="yourpassword",
#     database="yourdatabase"
# )

# @sio.event
# def connect(sid, environ):
#     print('open')

# @sio.event
# def info(sid, iid, id_other):
#     sid = iid
#     print("iid = " + iid + " client.id = " + sid)

#     @sio.event
#     def message(sid, data, time, idname, idN):
#         tableName = idname + "_" + idN
#         lang = "INSERT INTO %s (number_message, msg, time, type) VALUES (%s, %s, %s, 'text')"
#         val = ("??", "msg1", data, time)
#         cur = con2.cursor()
#         cur.execute(lang, val)

#         con2.commit()
#         print(cur.rowcount, "record inserted.")
#         cur.close()
#         print(data)
#         print(sid)
#         print(id_other)
#         sio.emit(id_other, data, broadcast=True)

# if __name__ == '__main__':
#     eventlet.wsgi.server(eventlet.listen(('', 8080)), app)
