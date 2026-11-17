from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, RootModel
from datetime import datetime, timedelta, timezone
import uuid
import jwt
import os
import psycopg2


app = FastAPI()

# Configuration for json web tokens (jwt)
# -----------------------------------------------
SECRET_KEY = "arbitrary-string" # TODO: Replace with environment variable
ALGORITHM = "HS256"
TOKEN_LIFETIME_MIN = 360 # Token expires after 6 hours

security = HTTPBearer()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
# -----------------------------------------------
class BookReservationRequest(BaseModel):
    room_id: int
    start_datetime: datetime
    end_datetime: datetime


class GetMyReservationsRequest(BaseModel):
    room_id: int = None
    start_datetime: datetime = None
    end_datetime: datetime = None


class UpdateReservationRequest(BaseModel):
    reservation_id: uuid.UUID
    new_room_id: int = None
    new_start_datetime: datetime = None
    new_end_datetime: datetime = None


class LoginRequest(BaseModel):
    user_email: str


class SignupRequest(BaseModel):
    user_email: str
    first_name: str
    last_name: str


# Helper functions (Synchronous)
# -----------------------------------------------
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Decodes the passed jwt and raises an error if the username passed does not match the username in the token
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, [ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(401, "Invalid authentication token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid authentication token")

        

def get_db_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def validate_user(user_email):
    sql = """
        SELECT * FROM Student WHERE UCEmail = %s
    """
    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, user_email)
                result = cur.fetchone()
    except:
        raise HTTPException("500", "validate_user(): database error")
    finally:
        conn.close()

    if result is not None:
        return True

    return False


def validate_room_ID(room_id):
    sql = """
        SELECT * FROM StudyRoom WHERE RoomID = %s
    """

    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, room_id)
                result = cur.fetchone()
    except:
        raise HTTPException("500", "validate_room_ID(): database error")
    finally:
        conn.close()

    if result is not None:
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
@app.post("/login")
def login(request: LoginRequest):
    user_exists = validate_user(request.user_email)
    if not user_exists:
        raise HTTPException("401", "Invalid username or password")

    # TODO: validate password

    expiration = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MIN)

    token_data = {
        "usr": request.user_email,
        "exp": expiration
    }

    token = jwt.encode(token_data, SECRET_KEY, ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/signup")
def signup(request: SignupRequest):
    if validate_user(request.user_email):
        raise HTTPException(
            "400", "Cannot create user. Username has already been taken."
        )

    # TODO: Consider adding pattern-matching email validation

    sql = """
        INSERT INTO Student (UCEmail, FirstName, LastName)
        VALUES (%s, %s, %s)
    """
    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql, (request.user_email, request.first_name, request.last_name)
                )
    except:
        raise HTTPException("500", "Database error. User was not created")
    finally:
        conn.close()

    return request.user_email


@app.post("/request_reservation")
def request_reservation(request: BookReservationRequest, current_user: str = Depends(get_current_user)):
    # Validate room id, user email
    if not validate_user(current_user):
        raise HTTPException("400", f"User {current_user} could not be found.")

    if not validate_room_ID(request.room_id):
        raise HTTPException(
            "400", f"A room with ID {request.room_id} could not be found"
        )

    # Check for reservation availability
    sql = """
        SELECT * FROM Reservation 
        WHERE 
            RoomID = %(room_id)s and
            StartDateTime < %(end)s and 
            EndDateTime > %(start)s 
    """
    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    {
                        "room_id": request.room_id,
                        "start": request.start_datetime,
                        "end": request.end_datetime,
                    },
                )
                result = cur.fetchone()
    except:
        raise HTTPException(500, "Database error")
    finally:
        conn.close()

    if result:
        raise HTTPException(
            400, "Conflict with existing reservation. Choose a different room or time"
        )

    # Book reservation
    sql = """
        INSERT INTO Reservation (ReservationID, UCEmail, RoomID, StartDateTime, EndDateTime)
        VALUES (%s, %s, %s, %s)
    """
    reservation_id = uuid.uuid4()
    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor as cur:
                cur.execute(
                    sql,
                    (
                        reservation_id,
                        current_user,
                        request.room_id,
                        request.start_datetime,
                        request.end_datetime,
                    ),
                )
    except:
        raise HTTPException(500, "Database error")
    finally:
        conn.close()

    return reservation_id


@app.post("/update_reservation")
def update_reservation(request: UpdateReservationRequest, current_user: str = Depends(get_current_user)):
    # TODO: verify that the user sending the request is also the owner of the reservation

    # Validate incoming data
    if request.user_email and not validate_user(request.user_email):
        raise HTTPException("400", f"User {request.user_email} could not be found")

    if request.new_room_id and not validate_room_ID(request.room_id):
        raise HTTPException(
            "400", f"A room with ID {request.room_id} could not be found"
        )

    if request.new_start_datetime ^ request.new_end_datetime:
        raise HTTPException(
            "400", f"new_start_datetime and new_end_datetime must be sent together."
        )

    # Confirm that the reservation exists
    sql = """
        SELECT * FROM Reservation WHERE ReservationID = %s
    """
    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, request.reservation_id)
                result = cur.fetchone()
    except:
        raise HTTPException(500, "Database error")
    finally:
        conn.close()

    if not result:
        raise HTTPException(
            400, "Update reservation failed. ReservationID could not be found"
        )

    # Update the reservation
    param_str = []
    col_vals = []
    col_names = []

    # This dynamically builds the parameter string and parameter list because most of the
    # fields are optional
    for attr, value in vars(request).items():
        if value:
            param_str.append("%s")
            col_vals.append(value)
            if attr == "new_room_id":
                col_names.append("RoomID")
            elif attr == "new_start_datetime":
                col_names.append("StartDateTime")
            elif attr == "new_end_datetime":
                col_names.append("EndDateTime")

    sql = f"""
        UPDATE Reservation SET ({", ".join(param_str)}) = ({", ".join(param_str)})
        WHERE ReservationID = %s
    """
    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "sql", col_names.extend(col_vals).append(request.reservation_id)
                )
    except:
        raise HTTPException(500, "Database error. The reservation could not be updated")
    finally:
        conn.close()

    return request.reservation_id


@app.get("/get_my_reservations")
def get_my_reservations(request: GetMyReservationsRequest, current_user: str = Depends(get_current_user)):
    if current_user and not validate_user(current_user):
        raise HTTPException("400", f"User {current_user} could not be found")

    if request.room_id and not validate_room_ID(request.room_id):
        raise HTTPException(
            "400", f"A room with ID {request.room_id} could not be found"
        )

    query_args = []

    sql = """
        SELECT * FROM Reservation WHERE 1 = 1
    """

    if current_user:
        sql += " AND UCEmail = %s"
        query_args.append(current_user)

    if request.start_datetime:
        sql += " AND StartDateTime > %s"
        query_args.append(request.start_datetime)

    if request.end_datetime:
        sql += " AND EndDateTime < %s"
        query_args.append(request.end_datetime)

    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, query_args)
                result = cur.fetchall()
    except:
        raise HTTPException(500, "Database error")

    return result
