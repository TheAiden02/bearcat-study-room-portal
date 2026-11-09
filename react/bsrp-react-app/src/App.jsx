import { useState } from 'react';
import './App.css';
import Login from './components/Login';
import MyReservations from './components/MyReservations';
import ReservationNewEdit from './components/ReservationNewEdit.jsx';
import ErrorModal from './components/ErrorModal';
import { initialReservations, studyRooms } from './data/DummyData';
import {
  SLOT_MINUTES,
  ceilToSlot,
  formatTime,
  getRoomStatus,
  toInputValue,
} from './utils/ReservationUtils';

const getNextId = (reservations) => Math.max(0, ...reservations.map((item) => item.ReservationID)) + 1;

// Homepage: availability filter, room selector and occupied/empty controls
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('home'); // 'home' | 'reservations'
  const [reservations, setReservations] = useState(initialReservations);
  const [roomIndex, setRoomIndex] = useState(0);
  const [filterValue, setFilterValue] = useState(() => toInputValue(ceilToSlot(new Date())));
  const [modal, setModal] = useState(null); // { type: 'reserve' | 'edit' | 'error', ... }

  const selectedRoom = studyRooms[roomIndex];
  const selectedTime = new Date(filterValue);
  const hasValidTime = !Number.isNaN(selectedTime.getTime());
  const roomStatus = hasValidTime ? getRoomStatus(reservations, selectedRoom.RoomID, selectedTime) : null;

  /* ---------- Session ---------- */

  const handleLogin = (student) => {
    setCurrentUser(student);
    setView('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setModal(null);
  };

  /* ---------- Modal helpers ---------- */

  const closeModal = () => setModal(null);
  const showError = (message) => setModal({ type: 'error', message });

  /* ---------- Room selector (incremental counter) ---------- */

  const changeRoom = (step) =>
    setRoomIndex((index) => (index + step + studyRooms.length) % studyRooms.length);

  /* ---------- Reservation actions ---------- */

  // Mark occupied: validate, then open the details confirmation pop-up
  const handleMarkOccupied = () => {
    if (!hasValidTime) return showError('Choose a valid date and time.');
    if (roomStatus.label !== 'Empty') return showError(roomStatus.reason);
    return setModal({ type: 'reserve' });
  };

  // Mark empty: ends the student's reservation at the selected time (no pop-up)
  const handleMarkEmpty = () => {
    if (!hasValidTime) return showError('Choose a valid date and time.');
    if (roomStatus.label === 'Unavailable') return showError(roomStatus.reason);
    if (roomStatus.label === 'Empty') return showError('This room is already empty.');

    const { reservation } = roomStatus;
    if (reservation.UCEmail !== currentUser.UCEmail) {
      return showError('This room is reserved by another student.');
    }
    return setReservations((prev) =>
      prev.map((item) => {
        if (item.ReservationID !== reservation.ReservationID) return item;
        return selectedTime <= item.StartTime
          ? { ...item, ReservationStatus: 'Cancelled' }
          : { ...item, EndTime: selectedTime };
      })
    );
  };

  const handleCreateReservation = (details) => {
    setReservations((prev) => [
      ...prev,
      {
        ReservationID: getNextId(prev),
        UCEmail: currentUser.UCEmail,
        RoomID: selectedRoom.RoomID,
        ReservationStatus: 'Active',
        ...details,
      },
    ]);
    closeModal();
  };

  const handleUpdateReservation = (details) => {
    setReservations((prev) =>
      prev.map((item) => (item.ReservationID === modal.reservation.ReservationID ? { ...item, ...details } : item))
    );
    closeModal();
  };

  const handleCancelReservation = (reservationId) => {
    setReservations((prev) =>
      prev.map((item) => (item.ReservationID === reservationId ? { ...item, ReservationStatus: 'Cancelled' } : item))
    );
  };

  /* ---------- Render ---------- */

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const myReservations = reservations.filter((item) => item.UCEmail === currentUser.UCEmail);
  const statusClass = roomStatus ? `status-${roomStatus.label.toLowerCase()}` : '';
  const occupiedByYou = roomStatus?.reservation?.UCEmail === currentUser.UCEmail;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bearcat Study Portal</h1>
        <nav>
          <button type="button" className={view === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => setView('home')}>
            Home
          </button>
          <button
            type="button"
            className={view === 'reservations' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('reservations')}
          >
            My Reservations
          </button>
        </nav>
        <div className="user-info">
          <span>{currentUser.FirstName} {currentUser.LastName}</span>
          <button type="button" className="btn btn-light" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="app-main">
        {view === 'home' ? (
          <section className="panel">
            <h2>Room availability</h2>

            {/* Date and time filter */}
            <div className="filter">
              <label htmlFor="availability">Availability</label>
              <input
                id="availability"
                type="datetime-local"
                step={SLOT_MINUTES * 60}
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
              />
            </div>

            {/* Room number counter */}
            <div className="room-selector" aria-label="Room selector">
              <button type="button" className="btn btn-outline" onClick={() => changeRoom(-1)} aria-label="Previous room">−</button>
              <div className="room-number">
                <span>Room {selectedRoom.RoomNumber}</span>
                <small>{roomIndex + 1} of {studyRooms.length}</small>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => changeRoom(1)} aria-label="Next room">+</button>
            </div>

            {/* Room details and status */}
            <div className={`room-status ${statusClass}`}>
              <strong>{roomStatus ? roomStatus.label : 'Choose a date and time'}</strong>
              {roomStatus?.label === 'Occupied' && (
                <span>
                  Until {formatTime(roomStatus.reservation.EndTime)}
                  {occupiedByYou ? ' (your reservation)' : ''}
                </span>
              )}
              {roomStatus?.label === 'Unavailable' && <span>{roomStatus.reason}</span>}
            </div>
            <p className="muted">
              Capacity {selectedRoom.Capacity} · {selectedRoom.HasWhiteboard ? 'Whiteboard' : 'No whiteboard'} ·{' '}
              {selectedRoom.HasTV ? 'TV' : 'No TV'}
            </p>

            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={handleMarkOccupied}>Mark occupied</button>
              <button type="button" className="btn btn-outline" onClick={handleMarkEmpty}>Mark empty</button>
            </div>
          </section>
        ) : (
          <MyReservations
            reservations={myReservations}
            rooms={studyRooms}
            onEdit={(reservation) => setModal({ type: 'edit', reservation })}
            onCancel={handleCancelReservation}
          />
        )}
      </main>

      {/* Pop-ups */}
      {modal?.type === 'reserve' && (
        <ReservationNewEdit
          room={selectedRoom}
          initialStart={selectedTime}
          reservations={reservations}
          onConfirm={handleCreateReservation}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'edit' && (
        <ReservationNewEdit
          room={studyRooms.find((room) => room.RoomID === modal.reservation.RoomID)}
          reservation={modal.reservation}
          initialStart={modal.reservation.StartTime}
          reservations={reservations}
          onConfirm={handleUpdateReservation}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'error' && <ErrorModal message={modal.message} onClose={closeModal} />}
    </div>
  );
}

export default App;
