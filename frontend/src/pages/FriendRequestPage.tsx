import React, { useState, useEffect } from "react";
import { FaCheck, FaTimes, FaUserCircle } from "react-icons/fa";
import "./FriendRequestPage.css";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const FriendRequestPage: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const loggedInUser = localStorage.getItem("username");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const response = await api.get(`/friend-requests?to=${loggedInUser}`);
        setFriendRequests(response.data);
      } catch (err) {}
    };
    fetchFriendRequests();
  }, [loggedInUser]);

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await api.post(`/friend-requests/${requestId}/accept`);
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId));
    } catch (err) {}
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.delete(`/friend-requests/${requestId}/reject`);
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId));
    } catch (err) {}
  };

  return (
    <div className="friendRequestPage">
      <motion.button
        className="volver-btn"
        onClick={() => navigate(-1)}
        whileHover={{ scale: 1.07 }}
        style={{ position: "absolute", top: 30, left: 30, zIndex: 2 }}
      >
        Volver
      </motion.button>
      <div className="friendRequestContainer glass-card">
        <h1 className="title">Solicitudes de Amistad</h1>
        {friendRequests.length > 0 ? (
          <ul className="friendRequestList">
            {friendRequests.map((request) => (
              <li key={request.id} className="friendRequestItem glass-list-item">
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