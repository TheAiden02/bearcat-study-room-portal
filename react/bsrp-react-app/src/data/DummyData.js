// Hard-coded dummy data (replace with API calls once the backend exists)

export const ADMIN_CREDENTIALS = { username: 'Bearcat', password: 'Admin' };
export const STUDENT_PASSWORD = '123';

const buildUsername = (firstName) =>
  (firstName.toLowerCase()+"Admin");

const studentNames = [
  ['Elijah', 'Cassidy'],
  ['Fern', 'Hubbard'],
  ['Caitlin', 'Reardon'],
  ['Macy', 'Debord'],
  ['Shrutika', 'Ubnare'],
];

// UCEmail is the primary key (replaces StudentID)
export const students = studentNames.map(([FirstName, LastName]) => {
  const Username = buildUsername(FirstName);
  return { UCEmail: `${Username}@mail.uc.edu`, FirstName, LastName, Username };
});

export const studyRooms = [
  { RoomID: 1, RoomNumber: '512', Capacity: 4, HasWhiteboard: true, HasTV: false },
  { RoomID: 2, RoomNumber: '514', Capacity: 6, HasWhiteboard: true, HasTV: true },
  { RoomID: 3, RoomNumber: '522', Capacity: 2, HasWhiteboard: false, HasTV: false },
  { RoomID: 4, RoomNumber: '613', Capacity: 8, HasWhiteboard: true, HasTV: true },
  { RoomID: 5, RoomNumber: '624', Capacity: 4, HasWhiteboard: false, HasTV: true },
];

// Helper: build a Date relative to today
const at = (hour, minute = 0, dayOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

// StartTime / EndTime are DATETIME values (replace separate date + time columns)
export const initialReservations = [
  {
    ReservationID: 1,
    UCEmail: students[0].UCEmail,
    RoomID: 1,
    StartTime: at(13, 30, 1),
    EndTime: at(15, 0, 1),
    ReservationStatus: 'Active',
    NoisePreference: 'Quiet',
  },
  {
    ReservationID: 2,
    UCEmail: students[1].UCEmail,
    RoomID: 2,
    StartTime: at(9, 0),
    EndTime: at(12, 0),
    ReservationStatus: 'Active',
    NoisePreference: 'Moderate',
  },
  {
    ReservationID: 3,
    UCEmail: students[2].UCEmail,
    RoomID: 4,
    StartTime: at(14, 0),
    EndTime: at(16, 30),
    ReservationStatus: 'Active',
    NoisePreference: 'Group Discussion',
  },
  {
    ReservationID: 4,
    UCEmail: students[3].UCEmail,
    RoomID: 3,
    StartTime: at(18, 0),
    EndTime: at(20, 0),
    ReservationStatus: 'Active',
    NoisePreference: 'Quiet',
  },
];