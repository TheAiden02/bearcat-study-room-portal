// Availability rules and date helpers for study room reservations

export const OPEN_HOUR = 8; // rooms unavailable before 8 AM
export const CLOSE_HOUR = 23; // rooms unavailable from 11 PM
export const SLOT_MINUTES = 30;

const MS_PER_MINUTE = 60000;
const pad = (value) => String(value).padStart(2, '0');
const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes();

/* ---------- Date helpers ---------- */

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * MS_PER_MINUTE);

export const getDurationMinutes = (start, end) => Math.round((end - start) / MS_PER_MINUTE);

export const floorToSlot = (date) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() - (result.getMinutes() % SLOT_MINUTES), 0, 0);
  return result;
};

export const ceilToSlot = (date) => {
  const floored = floorToSlot(date);
  return floored < date ? addMinutes(floored, SLOT_MINUTES) : floored;
};

// Format a Date for <input type="datetime-local">
export const toInputValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatDate = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

export const formatTime = (date) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/* ---------- Availability rules ---------- */

const isOpenAt = (time) => {
  const minutes = minutesOfDay(time);
  return minutes >= OPEN_HOUR * 60 && minutes < CLOSE_HOUR * 60;
};

// A reservation must start and end on the same day, inside open hours
const isWithinOpenHours = (start, end) =>
  start.toDateString() === end.toDateString() &&
  minutesOfDay(start) >= OPEN_HOUR * 60 &&
  minutesOfDay(end) <= CLOSE_HOUR * 60;

const overlaps = (startA, endA, startB, endB) => startA < endB && startB < endA;

const CLOSED_MESSAGE = 'Rooms are unavailable from 11 PM to 8 AM.';

// Checks whether a room can be reserved for the given time range
export const checkAvailability = (reservations, roomId, start, end, ignoreId = null) => {
  if (end <= start) {
    return { available: false, reason: 'The end time must be after the start time.' };
  }
  if (!isWithinOpenHours(start, end)) {
    return { available: false, reason: CLOSED_MESSAGE };
  }
  const conflict = reservations.find(
    (reservation) =>
      reservation.ReservationStatus === 'Active' &&
      reservation.RoomID === roomId &&
      reservation.ReservationID !== ignoreId &&
      overlaps(start, end, reservation.StartTime, reservation.EndTime)
  );
  if (conflict) {
    return {
      available: false,
      reason: `This room is already reserved from ${formatTime(conflict.StartTime)} to ${formatTime(conflict.EndTime)}.`,
    };
  }
  return { available: true, reason: '' };
};

// Status of a room at a single point in time: Empty, Occupied, or Unavailable
export const getRoomStatus = (reservations, roomId, time) => {
  if (!isOpenAt(time)) {
    return { label: 'Unavailable', reason: CLOSED_MESSAGE, reservation: null };
  }
  const reservation = reservations.find(
    (item) =>
      item.ReservationStatus === 'Active' &&
      item.RoomID === roomId &&
      item.StartTime <= time &&
      time < item.EndTime
  );
  if (reservation) {
    return {
      label: 'Occupied',
      reason: `This room is already reserved from ${formatTime(reservation.StartTime)} to ${formatTime(reservation.EndTime)}.`,
      reservation,
    };
  }
  return { label: 'Empty', reason: '', reservation: null };
};