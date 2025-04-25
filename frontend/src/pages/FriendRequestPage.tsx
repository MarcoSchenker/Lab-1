import React, { useState, useEffect } from "react";
import { FaCheck, FaTimes, FaUserCircle, FaHome } from "react-icons/fa"; // Íconos para aceptar y rechazar
import "./FriendRequestPage.css";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const FriendRequestPage: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const loggedInUser = localStorage.getItem("username"); // Usuario logueado
  const navigate = useNavigate();

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
    <div className="friendRequestPage">
      <div className="homeIcon" onClick={() => navigate("/dashboard")}>
        <FaHome title="Volver al Dashboard" />
      </div>
      <div className="flechita" onClick={() => navigate("/friends")}>
        <img src= "/flecha.png"/>
      </div>

    <div className="friendRequestContainer">
      <h1 className="title">Solicitudes de Amistad</h1>
      {friendRequests.length > 0 ? (
        <ul className="friendRequestList">
          {friendRequests.map((request) => (
            <li key={request.id} className="friendRequestItem">
              <div className="friendInfo">
                <FaUserCircle className="userIcon" />
                <span className="friendName">{request.from_user}</span>
              </div>
              <div className="actionButtons">
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
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="noRequests">No tienes solicitudes de amistad pendientes.</p>
      )}
    </div>
    </div>
  );
};

export default FriendRequestPage;