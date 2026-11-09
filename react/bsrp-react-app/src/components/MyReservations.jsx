import { formatDate, formatTime } from '../utils/ReservationUtils';

// Lists the signed-in student's upcoming and previous reservations
function MyReservations({ reservations, rooms, onEdit, onCancel }) {
  const now = new Date();
  const isUpcoming = (item) => item.ReservationStatus === 'Active' && item.EndTime > now;

  const upcoming = reservations.filter(isUpcoming).sort((a, b) => a.StartTime - b.StartTime);
  const previous = reservations.filter((item) => !isUpcoming(item)).sort((a, b) => b.StartTime - a.StartTime);

  const getRoomNumber = (roomId) => rooms.find((room) => room.RoomID === roomId)?.RoomNumber ?? 'Unknown';

  // Single reservation card
  const renderCard = (item, showActions) => (
    <li key={item.ReservationID} className="reservation-card">
      <div>
        <strong>Room {getRoomNumber(item.RoomID)}</strong>
        <p>{formatDate(item.StartTime)}</p>
        <p>{formatTime(item.StartTime)} – {formatTime(item.EndTime)}</p>
        <p className="muted">{item.NoisePreference}{item.ReservationStatus === 'Cancelled' ? ' (Cancelled)' : ''}</p>
      </div>
      {showActions && (
        <div className="card-actions">
          <button type="button" className="btn btn-outline" onClick={() => onEdit(item)}>Edit</button>
          <button type="button" className="btn btn-primary" onClick={() => onCancel(item.ReservationID)}>Cancel</button>
        </div>
      )}
    </li>
  );

  return (
    <section className="panel">
      <h2>My reservations</h2>

      <h3>Upcoming</h3>
      {upcoming.length ? (
        <ul className="reservation-list">{upcoming.map((item) => renderCard(item, true))}</ul>
      ) : (
        <p className="muted">No upcoming reservations.</p>
      )}

      <h3>Previous</h3>
      {previous.length ? (
        <ul className="reservation-list">{previous.map((item) => renderCard(item, false))}</ul>
      ) : (
        <p className="muted">No previous reservations.</p>
      )}
    </section>
  );
}

export default MyReservations;
