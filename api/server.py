from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
import json
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, RootModel
from datetime import datetime, time
import uuid
import asyncio
import os
import psycopg2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONN = psycopg2.connect(os.environ["DATABASE_URL"])
DB = DB_CONN.cursor()


# Request/Response Models
# -----------------------------------------------
class BookReservationRequest(BaseModel):
    room_id: int
    user_email: str
    start_datetime: datetime
    end_datetime: datetime

class GetReservationsRequest(BaseModel):
    room_id: int = None
    user_email: str = None
    start_datetime: datetime = None
    end_datetime: datetime = None




# Helper functions (Synchronous)
# -----------------------------------------------
def validate_user(user_email):
    sql = '''
        SELECT * FROM Student WHERE UCEmail = %s
    '''

    try:
        DB.execute(sql, user_email)
    except:
        raise HTTPException("500", "validate_user(): database error")

    if DB.fetchone() is not None:
        return True

    return False
    
def validate_room_ID(room_id):
    sql = '''
        SELECT * FROM StudyRoom WHERE RoomID = %s
    '''

    try:
         DB.execute(sql, room_id)
    except:
        raise HTTPException("500", "validate_room_ID(): database error")

    if DB.fetchone() is not None:
        return True

    return False

# Connection Management
# -----------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.connections: dict[uuid.UUID, WebSocket]
        self.event_queue: list

    def buffer_event(self, event):
        self.event_queue.append(event)

    async def register_connection(self, conn_id: uuid, websocket: WebSocket):
        await websocket.accept()
        self.connections[conn_id] = websocket

    async def handle_disconnect(self, conn_id: uuid):
        pass

    async def process_events(self):
        """
        If a user makes, updates, or deletes a reservation, rebuild room availability snapshot.
        It's worth considering if we even need to track individual events since really, the only event is 
        'Room availability (might have) changed, update all websocket clients'.

        """
        pass

    async def broadcast_availability(self):
        """
        Broadcast a snapshot of room availability to all websocket clients
        """
        pass



ws_manager = ConnectionManager()

# API WS Endpoint
# -----------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    connection_id = uuid.uuid4

    await ws_manager.register_connection(connection_id, websocket)

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                request_data = json.loads(raw_data)
                print(request_data)
                ws_manager.buffer_event(request_data)
            except json.JSONDecodeError:
                pass  # Cleanly drop invalid string frames

    except WebSocketDisconnect:
        await ws_manager.handle_disconnect(connection_id)



# API REST Endpoints
# -----------------------------------------------

@app.post("/request_reservation")
def request_reservation(
    request: BookReservationRequest
):
    # Validate room id, user email
    if not validate_user(request.user_email):
        raise HTTPException("400", f"User {request.user_email} could not be found.")

    if not validate_room_ID(request.room_id):
        raise HTTPException("400", f"A room with ID {request.room_id} could not be found")

    # Check for reservation availability
    sql = '''
        SELECT * FROM Reservation 
        WHERE 
            RoomID = %(room_id)s and
            StartDateTime < %(end)s and 
            EndDateTime > %(start)s 
    '''
    try:
        DB.execute(
            sql,
            {
                'room_id': request.room_id,
                'start': request.start_datetime,
                'end': request.end_datetime
            }
        )
    except:
        raise HTTPException(500, "Database error")

    if DB.fetchone():
        raise HTTPException(400, "Conflict with existing reservation. Choose a different room or time")

    # Book reservation
    sql = '''
        INSERT INTO Reservation (UCEmail, RoomID, StartDateTime, EndDateTime)
        VALUES (%s, %s, %s, %s)
    '''

    try:
        DB.execute(
            sql,
            (request.user_email, request.room_id, request.start_datetime, request.end_datetime)
        )
    except:
        raise HTTPException(500, "Database error")
    
    return "success"

@app.get("/get_reservations")
def get_reservations(
        request: GetReservationsRequest
):
    if request.user_email and not validate_user(request.user_email):
        raise HTTPException("400", f"User {request.user_email} could not be found")

    if request.room_id and not validate_room_ID(request.room_id):
        raise HTTPException("400", f"A room with ID {request.room_id} could not be found")

    query_args = []

    sql = '''
        SELECT * FROM Reservation WHERE 1 = 1
    '''

    if request.user_email:
        sql += " AND UCEmail = %(user_email)s"
        query_args.append(request.user_email)

    if request.start_datetime:
        sql += " AND StartDateTime > %(start_dt)s"
        query_args.append(request.start_datetime)

    if request.end_datetime:
        sql += " AND EndDateTime < %(end_dt)s"
        query_args.append(request.end_datetime)

    try:
        DB.execute(
            sql,
            query_args
        )
    except:
        raise HTTPException(500, "Database error")
    
    return DB.fetchall()

