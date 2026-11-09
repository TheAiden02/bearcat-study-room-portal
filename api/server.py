from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, RootModel
from datetime import datetime, time
import uuid
import asyncio
import psycopg2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONN = psycopg2.connect('database connection goes here')
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

    async def register_connection(self, websocket: WebSocket):
        await websocket.accept()
        connection_id = uuid.uuid4()
        self.connections[connection_id] = websocket


# API Endpoints
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

