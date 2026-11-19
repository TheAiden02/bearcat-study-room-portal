// Fetch test for /get_my_reservations.
// Confirms the endpoint is reachable and validates authentication.

async function testGetReservations() {
    try {
        const response = await fetch(
            "http://127.0.0.1:8000/get_my_reservations",
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer TEST_TOKEN"
                }
            }
        );

        console.log("Status:", response.status);

        const data = await response.text();
        console.log(data);

    } catch (error) {
        console.error("Error:", error);
    }
}

testGetReservations();

// Fetch test for /request_reservation.
// Sends sample reservation data to verify endpoint access and authentication.

async function testRequestReservation() {
    try {
        const response = await fetch(
            "http://127.0.0.1:8000/request_reservation",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer TEST_TOKEN"
                },
                body: JSON.stringify({
                    room_id: 1,
                    start_datetime: "2026-11-25T10:00:00",
                    end_datetime: "2026-11-25T11:00:00"
                })
            }
        );

        console.log("Status:", response.status);

        const data = await response.text();
        console.log(data);

    } catch (error) {
        console.error("Error:", error);
    }
}

testRequestReservation();