import { useState } from 'react';
import {
  SLOT_MINUTES,
  addMinutes,
  checkAvailability,
  floorToSlot,
  formatDate,
  formatTime,
  getDurationMinutes,
  toInputValue,
} from '../utils/ReservationUtils';

const NOISE_OPTIONS = ['Quiet', 'Moderate', 'Group Discussion'];
const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 210, 240];

const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const remainder = minutes % 60;
  return `${Math.floor(minutes / 60)} hr${remainder ? ` ${remainder} min` : ''}`;
};

// Confirmation pop-up used to create or edit a reservation
function ReservationNewEdit({ room, reservation = null, initialStart, reservations, onConfirm, onCancel }) {
  const isEdit = reservation !== null;

  const [startValue, setStartValue] = useState(toInputValue(isEdit ? reservation.StartTime : initialStart));
  const [duration, setDuration] = useState(
    isEdit ? getDurationMinutes(reservation.StartTime, reservation.EndTime) : 60
  );
  const [noisePreference, setNoisePreference] = useState(
    isEdit ? reservation.NoisePreference : NOISE_OPTIONS[0]
  );

  // Derive end time and validate the requested range
  const start = new Date(startValue);
  const hasValidStart = !Number.isNaN(start.getTime());
  const end = hasValidStart ? addMinutes(start, duration) : null;

  let validationMessage = '';
  if (!hasValidStart) {
    validationMessage = 'Choose a valid start date and time.';
  } else if (!isEdit && start < floorToSlot(new Date())) {
    validationMessage = 'Reservations cannot start in the past.';
  } else {
    validationMessage = checkAvailability(
      reservations,
      room.RoomID,
      start,
      end,
      isEdit ? reservation.ReservationID : null
    ).reason;
  }

  // Keep an existing non-standard length selectable when editing
  const durationOptions = DURATION_OPTIONS.includes(duration)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);

  const handleConfirm = () => {
    if (validationMessage) return;
    onConfirm({ StartTime: start, EndTime: end, NoisePreference: noisePreference });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
      <div className="modal">
        <h2 id="reservation-title">{isEdit ? 'Edit reservation' : 'Confirm reservation'}</h2>

        <dl className="details">
          <dt>Room</dt>
          <dd>{room.RoomNumber}</dd>
          <dt>Capacity</dt>
          <dd>{room.Capacity} people</dd>
          <dt>Features</dt>
          <dd>{[room.HasWhiteboard && 'Whiteboard', room.HasTV && 'TV'].filter(Boolean).join(', ') || 'None'}</dd>
          {hasValidStart && (
            <>
              <dt>Date</dt>
              <dd>{formatDate(start)}</dd>
              <dt>Time</dt>
              <dd>{formatTime(start)} – {formatTime(end)}</dd>
            </>
          )}
        </dl>

        <label htmlFor="start-time">Start</label>
        <input
          id="start-time"
          type="datetime-local"
          step={SLOT_MINUTES * 60}
          value={startValue}
          onChange={(event) => setStartValue(event.target.value)}
        />

        {/* Reservation length */}
        <label htmlFor="duration">Reservation length</label>
        <select id="duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
          {durationOptions.map((minutes) => (
            <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>
          ))}
        </select>

        <label htmlFor="noise">Noise preference</label>
        <select id="noise" value={noisePreference} onChange={(event) => setNoisePreference(event.target.value)}>
          {NOISE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        {validationMessage && <p className="form-error" role="alert">{validationMessage}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={Boolean(validationMessage)}>
            {isEdit ? 'Save changes' : 'Confirm'}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ReservationNewEdit;
