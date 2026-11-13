
DROP TABLE IF EXISTS Reservation;

CREATE TABLE Reservation (
    ReservationID UUID PRIMARY KEY,
    UCEmail VARCHAR(100) NOT NULL,
    RoomID INT NOT NULL,
    StartDateTime TIMESTAMP NOT NULL,
    EndDateTime TIMESTAMP NOT NULL,
    ReservationStatus VARCHAR(50) NOT NULL,

    FOREIGN KEY (UCEmail) REFERENCES Student(UCEmail),
    FOREIGN KEY (RoomID) REFERENCES StudyRoom(RoomID)
);
