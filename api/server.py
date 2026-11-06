from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, RootModel
from datetime import datetime, time
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
class ReservationRequest(BaseModel):
    room_id: int
    user_email: str
    start_datetime: str
    end_datetime: str



# Helper functions
# -----------------------------------------------






# API Endpoints
# -----------------------------------------------

@app.get("/request_reservation")
def request_reservation(
    request: ReservationRequest
):
    # Validate datetime parameters
    format_string = "%a %b %d %Y %H:%M:%S GMT%z (%Z)"
    try:
        start_dt = datetime.strptime(request.start_datetime, format_string)
    except:
        raise HTTPException(400, "Invalid format for start_datetime")

    try:
        end_dt = datetime.strptime(request.end_datetime, format_string)
    except:
        raise HTTPException(400, "Invalid format for end_datetime")

    # Validate room id, user email

    # HERE
        
    # Check for reservation availability
    sql = '''
        SELECT * FROM Reservation 
        WHERE 
            RoomID = %(room_id)s and
            StartDateTime > %(start)s and EndDateTime > %(end)s or
            StartDateTime < %(start)s and EndDateTime < %(end)s
    '''
    try:
        DB.execute(
            sql,
            {
                'room_id': request.room_id,
                'start': start_dt,
                'end': end_dt
            }
        )
    except:
        raise HTTPException(500, "Database error")

    if DB.fetchone() is None:
        raise HTTPException(400, "Conflict with existing reservation. Choose a different room or time")

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



    
    