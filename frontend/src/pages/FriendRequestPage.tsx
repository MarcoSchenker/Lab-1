import React, { useState, useEffect } from "react";
import { FaCheck, FaTimes } from "react-icons/fa"; // Íconos para aceptar y rechazar
import "./FriendRequestPage.css";
import api from "../services/api";

const FriendRequestPage: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const loggedInUser = localStorage.getItem("username"); // Usuario logueado

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const response = await api.get(`/friend-requests?to=${loggedInUser}`);
        setFriendRequests(response.data);
      } catch (err) {
        console.error("Error al obtener solicitudes de amistad:", err);
      }
    };

    fetchFriendRequests();
  }, [loggedInUser]);

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await api.post(`/friend-requests/${requestId}/accept`);
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error("Error al aceptar solicitud de amistad:", err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.post(`/friend-requests/${requestId}/reject`);
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error("Error al rechazar solicitud de amistad:", err);
    }
  };

  return (
    <div className="friendRequestContainer">
      <h1>Solicitudes de Amistad</h1>
      {friendRequests.length > 0 ? (
        <ul>
          {friendRequests.map((request) => (
            <li key={request.id} className="friendRequestItem">
              <span>{request.from}</span>
              <FaCheck
                className="acceptIcon"
                title="Aceptar solicitud"
                onClick={() => handleAcceptRequest(request.id)}
              />
              <FaTimes
                className="rejectIcon"
                title="Rechazar solicitud"
                onClick={() => handleRejectRequest(request.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p>No tienes solicitudes de amistad pendientes.</p>
      )}
    </div>
  );
};

export default FriendRequestPage;